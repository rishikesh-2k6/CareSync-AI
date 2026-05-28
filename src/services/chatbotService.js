// Safety, RAG and Language Classifier Services

// --- Rule 1: Emergency Keywords Firewalls ---
export const EMERGENCY_KEYWORDS = [
  "chest pain", "heart attack", "stroke", "can't breathe", "cannot breathe",
  "difficulty breathing", "unconscious", "seizure", "severe bleeding", 
  "poisoning", "overdose", "suicidal", "not breathing", "choking",
  "भारी दर्द", "सांस नहीं आ रही", "छाती में दर्द", "గుండె నొప్పి", "శ్వాస ఆడట్లేదు"
];

export function detectEmergency(message) {
  const lower = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

export function getEmergencyResponse() {
  return {
    response: "⚠️ **URGENT EMERGENCY ALERT**\n\nThis sounds like a potentially life-threatening situation. Please **call 108 (India)**, your local emergency services, or go to the nearest hospital emergency room immediately. **Do not wait for a clinic response.**",
    isEmergency: true,
    shouldEscalate: true
  };
}

// --- Rule 2: Multi-Lingual Detector ---
export function detectLanguage(message) {
  const lower = message.toLowerCase();
  
  // Hindi Vocabulary Matchers
  const hindiKeywords = ["नमस्ते", "है", "क्या", "बुखार", "दर्द", "दवा", "इलाज", "डॉक्टर", "अपॉइंटमेंट", "समय", "खुराक", "भूखा", "खून", "टेस्ट", "पट्टी", "मवाद", "सिरदर्द", "नमक"];
  // Telugu Vocabulary Matchers
  const teluguKeywords = ["నమస్కారం", "అపాయింట్మెంట్", "జ్వరం", "నొప్పి", "మందులు", "డాక్టర్", "సమయం", "రక్తం", "పరీక్ష", "స్కానింగ్", "కట్టు", "నొప్పిగా", "తలనొప్పి", "ఉపవాసం"];

  const hasHindi = hindiKeywords.some(kw => lower.includes(kw)) || /[\u0900-\u097F]/.test(message);
  const hasTelugu = teluguKeywords.some(kw => lower.includes(kw)) || /[\u0C00-\u0C7F]/.test(message);

  if (hasHindi) return "hi";
  if (hasTelugu) return "te";
  return "en";
}

export function getLanguageInstruction(lang) {
  const instructions = {
    en: "Respond in English. Keep instructions clear and simple (under 150 words). Always add the mandatory disclaimer: 'This is general information. Consult your doctor for personal advice.'",
    hi: "कृपया हिंदी में उत्तर दें (Respond in Hindi)। भाषा सरल और समझने में आसान होनी चाहिए। उत्तर के अंत में यह डिस्क्लेमर अवश्य जोड़ें: 'यह सामान्य जानकारी है। व्यक्तिगत सलाह के लिए अपने डॉक्टर से संपर्क करें।'",
    te: "దయచేసి తెలుగులో సమాధానం ఇవ్వండి (Respond in Telugu). సమాధానం సరళంగా మరియు స్పష్టంగా ఉండాలి. చివరలో ఈ డిస్క్లైమర్ తప్పనిసరిగా చేర్చండి: 'ఇది సాధారణ సమాచారం మాత్రమే. వ్యక్తిగత సలహా కోసం మీ వైద్యుడిని సంప్రదించండి.'"
  };
  return instructions[lang] || instructions.en;
}

// --- Rule 3: Client-Side Similarity RAG Search ---
export function retrieveContext(message, kbList, topK = 3) {
  const cleanTokens = message
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
    .split(/\s+/)
    .filter(token => token.length > 2); // filter out common tiny pronouns

  if (cleanTokens.length === 0) {
    return kbList.slice(0, topK).map(item => ({ item, score: 0 }));
  }

  const scored = kbList.map(item => {
    let score = 0;
    
    // 1. Direct Keyword Hits (Highest Weight)
    item.keywords.forEach(kw => {
      cleanTokens.forEach(token => {
        if (kw === token) score += 0.4;
        else if (kw.includes(token) || token.includes(kw)) score += 0.15;
      });
    });

    // 2. Question Hit Match
    const questionWords = item.question.toLowerCase().split(/\s+/);
    cleanTokens.forEach(token => {
      if (questionWords.includes(token)) score += 0.15;
    });

    // 3. Jaccard Index Normalization
    const intersection = new Set(cleanTokens.filter(t => item.keywords.includes(t) || questionWords.includes(t)));
    const union = new Set([...cleanTokens, ...item.keywords, ...questionWords]);
    const jaccard = intersection.size / union.size;
    
    score += jaccard * 1.5;

    return {
      item,
      score: parseFloat(score.toFixed(3))
    };
  });

  // Sort and pick top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// --- Rule 4: Escalation Evaluator ---
export const ESCALATION_KEYWORDS = [
  "talk to a human", "speak to staff", "call a doctor", "human agent", 
  "receptionist", "dissatisfied", "not helpful", "useless", "bad bot", 
  "complaint", "connect me", "शिकायत", "इंसान", "మానవ", "రిసెప్షనిస్ట్"
];

export function checkEscalation(history, lastMessage) {
  const lower = lastMessage.toLowerCase();
  
  // Rule 4.1: Direct keyword matches
  if (ESCALATION_KEYWORDS.some(kw => lower.includes(kw))) return true;

  // Rule 4.2: Too many turns without resolution (e.g. 5+ messages)
  if (history && history.length >= 6) {
    return true;
  }

  return false;
}

// --- Rule 5: Client-Side LLM & Fallback Engine ---
export async function callLLM({
  systemPrompt,
  userMessage,
  context,
  history,
  config,
  image // base64 image data URL (prescription receipt)
}) {
  const { provider, apiKey, model } = config;
  const detectedLang = detectLanguage(userMessage);
  const langInstruction = getLanguageInstruction(detectedLang);

  // If running in SIMULATED OFFLINE MODE
  if (provider === "simulator" || !apiKey) {
    return await simulateResponse(userMessage, context, detectedLang, image);
  }

  try {
    // --- GEMINI API INTEGRATION (Direct Browser Client Call with Multimodal Support) ---
    if (provider === "gemini") {
      const messages = [];
      
      // Inject System Prompt & Context at the start of instructions
      const combinedInstructions = `${systemPrompt}\n\n## KNOWLEDGE BASE CONTEXT FOR CURRENT QUESTION:\n${context}\n\n## CURRENT USER LANGUAGE INSTRUCTION:\n${langInstruction}`;
      
      // Format chat history for Gemini
      const contents = [];
      history.forEach(turn => {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.content }]
        });
      });
      
      // Add current message and attachment
      const currentParts = [];
      
      if (image) {
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          currentParts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }
      
      currentParts.push({ text: `Question: ${userMessage}` });
      
      contents.push({
        role: "user",
        parts: currentParts
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: combinedInstructions }]
            },
            generationConfig: {
              maxOutputTokens: 350,
              temperature: 0.3
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Gemini API call failed");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error("Received empty response from Gemini");
      return text;
    }

    // --- GROQ & OPENAI API INTEGRATION (Direct Browser Client Call with Vision Multimodal Support) ---
    if (provider === "groq" || provider === "openai") {
      const isGroq = provider === "groq";
      const endpoint = isGroq
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

      // Groq Vision defaults to llama-3.2-11b-vision-preview if image is supplied, OpenAI to gpt-4o-mini
      let selectedModel = model;
      if (!selectedModel) {
        if (isGroq) {
          selectedModel = image ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
        } else {
          selectedModel = "gpt-4o-mini";
        }
      }

      // Format messages content dynamically (text vs multimodal payload)
      let currentContent;
      if (image) {
        currentContent = [
          { type: "text", text: `Retrieved Context:\n${context}\n\nUser Question: ${userMessage}` },
          { type: "image_url", image_url: { url: image } }
        ];
      } else {
        currentContent = `Retrieved Context:\n${context}\n\nUser Question: ${userMessage}`;
      }

      const messages = [
        {
          role: "system",
          content: `${systemPrompt}\n\nLanguage Guideline: ${langInstruction}`
        },
        ...history.map(h => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.content
        })),
        {
          role: "user",
          content: currentContent
        }
      ];

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: 350,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `${provider.toUpperCase()} API call failed`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      return text || "Error processing query.";
    }

    throw new Error("Unsupported API provider selected");
  } catch (err) {
    console.error("AI API Error:", err);
    // Graceful fallback to simulator if API fails
    return `⚠️ *(API Connection Error: ${err.message}. Defaulting to Clinic Backup)*\n\n` + 
      await simulateResponse(userMessage, context, detectedLang, image);
  }
}

// --- Helper: Simulate Clinic FAQ responses based on RAG similarity ---
async function simulateResponse(userMessage, contextString, lang, image) {
  // Let's delay slightly to simulate actual typing/network delay
  await new Promise(res => setTimeout(res, 800));

  const lower = userMessage.toLowerCase();

  // 1. Image OCR Scan Trigger
  if (image) {
    return `📝 **CareSync Prescription Analysis Complete**

We have successfully scanned your uploaded prescription and extracted the following details:

1. 💊 **Paracetamol (500mg)**
   * **Dosage**: Take 1 tablet after meals, 3 times daily (as needed for fever or pain).
   * **Guideline**: Maintain a minimum of 4–6 hours gap between doses.

2. 🛡️ **Amoxicillin (250mg) [Antibiotic]**
   * **Dosage**: Take 1 capsule twice daily (morning & night), strictly after meals.
   * **Guideline**: Finish the complete 5-day course without skipping.

3. 🥛 **Gelusil Antacid Liquid**
   * **Dosage**: Take 10ml (2 teaspoons) twice daily.
   * **Guideline**: Strictly **1 hour before breakfast** and **1 hour before dinner** on an empty stomach.

*Consult your doctor for specific advice. You can now ask me any questions about when to take these medicines or their potential side effects!*`;
  }

  // 2. Direct schedule questions regarding the scanned receipt
  if (lower.includes("amoxicillin") || lower.includes("antibiotic")) {
    return `💊 **Amoxicillin Dose & Guidelines**

Based on your scanned prescription receipt:
* **Dosage**: **1 capsule twice daily** (approx. every 12 hours, e.g., 8:00 AM and 8:00 PM).
* **Condition**: Take **strictly after food** to protect your stomach.
* **Course**: Complete the full 5 days.

*Disclaimer: This is general information. Consult your doctor for personal advice.*`;
  }

  if (lower.includes("paracetamol") || lower.includes("dolo") || lower.includes("crocin")) {
    return `💊 **Paracetamol Dose & Guidelines**

Based on your scanned prescription receipt:
* **Dosage**: **1 tablet three times daily** (every 6–8 hours) as needed.
* **Condition**: Can be taken with or without meals. Taking with water is sufficient.
* **Safety**: Do not exceed 4 tablets in 24 hours to prevent liver strain.

*Disclaimer: This is general information. Consult your doctor for personal advice.*`;
  }

  if (lower.includes("antacid") || lower.includes("gelusil") || lower.includes("acidity")) {
    return `🥛 **Gelusil Antacid Guidelines**

Based on your scanned prescription receipt:
* **Dosage**: **10ml (2 teaspoons)**.
* **Timing**: Strictly **1 hour before breakfast** (morning) and **1 hour before dinner** (evening).
* **Condition**: Take on an empty stomach. Shake well before using.

*Disclaimer: This is general information. Consult your doctor for personal advice.*`;
  }

  // 3. Check for specific hello greets
  const greets = {
    en: "Hello! I am MediGuide, your clinic assistant. How can I help you today? I can answer questions about fasting, MRI scans, tests, or clinic hours. You can also upload a prescription image to analyze!",
    hi: "नमस्ते! मैं मेडिगाइड हूं, आपका क्लिनिक सहायक। आज मैं आपकी क्या मदद कर सकता हूं? मैं टेस्ट की तैयारी, दवाओं या क्लिनिक के समय के बारे में जानकारी दे सकता हूं। आप पर्ची की फोटो भी अपलोड कर सकते हैं!",
    te: "నమస్కారం! నేను కేర్‌సింక్ క్లినిక్ సహాయకురాలిని. ఈరోజు నేను మీకు ఎలా సహాయపడగలను? పరీక్షల వివరాలు, క్లినిక్ సమయాలు వంటి వాటిపై సమాధానం ఇవ్వగలను. ప్రిస్క్రిప్షన్ ఫోటోను కూడా అప్‌లోడ్ చేయవచ్చు!"
  };
  
  if (lower.match(/\b(hi|hello|hey|greetings|greet|hola|नमस्ते|హలో|నమస్కారం)\b/)) {
    return greets[lang] + "\n\n*This is general information. Consult your doctor for personal advice.*";
  }

  // 4. Parse retrieved context. Context string lists sources and answers.
  // Our retrieval matches will have fed the best answer.
  if (contextString && contextString.includes("Source:")) {
    // Extract the answer block based on matching language
    const lines = contextString.split("\n\n");
    const bestMatchBlock = lines[0]; // Top scoring match is first

    // Parse the fields
    const answerMatch = bestMatchBlock.match(/Answer \((en|hi|te)\):\s*(.*)/i);
    if (answerMatch) {
      return answerMatch[2] + "\n\n*This is general information. Consult your doctor for personal advice.*";
    }

    // fallback extraction if formatted differently
    const simpleText = bestMatchBlock.replace(/\[Source:.*?\]/, "").trim();
    return simpleText + "\n\n*This is general information. Consult your doctor for personal advice.*";
  }

  // 5. Absolute Fallback if no matching FAQ is found
  const fallbacks = {
    en: "I'm not quite sure I have the exact clinic details for this specific question. I recommend checking with our front desk or scheduling a consultation with your physician for clinical queries. Would you like me to connect you with our clinic team?",
    hi: "क्षमा करें, इस विशेष प्रश्न के लिए मेरे पास क्लिनिक से जुड़ी पूरी जानकारी नहीं है। मैं डॉक्टर से अपॉइंटमेंट बुक करने या हमारे मुख्य काउंटर पर संपर्क करने की सलाह देता हूं। क्या आप हमारे स्टाफ से जुड़ना चाहेंगे?",
    te: "క్షమించండి, ఈ ప్రశ్నకు సంబంధించిన ఖచ్చితమైన సమాచారం నా వద్ద లేదు. మీరు క్లినిక్ సిబ్బందిని సంప్రదించాల్సిందిగా లేదా డాక్టర్ అపాయింట్మెంట్ తీసుకోవాల్సిందిగా కోరుతున్నాను. మా సిబ్బందితో మాట్లాడతారా?"
  };

  return fallbacks[lang] + "\n\n*This is general information. Consult your doctor for personal advice.*";
}
