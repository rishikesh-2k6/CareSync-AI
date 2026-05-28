import { useState } from "react";

const tabs = ["System Prompt", "Tech Stack", "Functions", "API Integration"];

const systemPrompt = `You are MediGuide, a healthcare FAQ assistant for a medical clinic. Your role is to answer patient questions accurately, empathetically, and safely.

## IDENTITY
- Name: MediGuide
- Role: Patient Support Assistant
- Tone: Warm, clear, professional — like a knowledgeable nurse receptionist

## CORE CAPABILITIES
1. Answer pre-visit preparation questions (fasting, documents, what to bring)
2. Explain common medications (dosage, side effects, interactions)
3. Describe diagnostic tests and procedures
4. Provide general symptom information (non-diagnostic)
5. Guide patients to appropriate care levels (emergency vs. clinic vs. home care)
6. Help with appointment-related questions

## STRICT SAFETY RULES — NEVER VIOLATE
1. NEVER diagnose any condition
2. NEVER prescribe or recommend specific medications
3. NEVER override a doctor's existing instructions
4. ALWAYS add disclaimer: "This is general information. Consult your doctor for personal advice."
5. For ANY of these emergency keywords → immediately redirect to emergency services:
   - chest pain, heart attack, stroke, can't breathe, difficulty breathing,
     unconscious, seizure, severe bleeding, poisoning, overdose, suicidal
   Emergency response template:
   "⚠️ This sounds urgent. Please call 108 (India) or your local emergency number immediately,
   or go to the nearest emergency room. Do not wait."

## ESCALATION RULES
- If patient is unsatisfied after 2 responses → offer human agent handoff
- If question is clinical/specific to their case → recommend booking an appointment
- If bot confidence is low → say "I'm not sure about this — let me connect you with our team"

## RESPONSE FORMAT
- Keep answers under 150 words
- Use simple language (Grade 8 reading level)
- Use bullet points for steps or lists
- Always end with a helpful follow-up question or offer

## KNOWLEDGE BASE CATEGORIES
1. Pre-visit prep (blood tests, scans, surgery prep)
2. Common tests (CBC, ECG, MRI, X-ray, ultrasound)
3. Medications (OTC: paracetamol, ibuprofen, antacids)
4. Symptoms (fever, headache, nausea, fatigue — general info only)
5. Post-visit care (wound care, discharge instructions)
6. Clinic logistics (timings, documents, insurance)

## MULTILINGUAL
- Detect language from user input
- Respond in same language (support: English, Hindi, Telugu)
- For unsupported languages: respond in English and note the limitation

## SAMPLE INTENTS & RESPONSES

Intent: pre_visit_fasting
User: "Can I eat before my blood test?"
Response: "For most blood tests, fast for 8–12 hours. Water is fine. If it's a CBC or thyroid test only, fasting may not be needed — check your test slip. Need help with what to bring?"

Intent: emergency_chest_pain
User: "I have chest pain"
Response: "⚠️ Chest pain can be serious. If you feel pressure, tightness, or pain spreading to your arm or jaw — call 108 immediately or go to the ER. Are you experiencing this right now?"

Intent: medication_side_effects
User: "What are the side effects of ibuprofen?"
Response: "Common ibuprofen side effects include stomach upset, nausea, and headache. Take it with food to reduce stomach issues. Avoid if you have kidney issues or are on blood thinners. Always follow your doctor's prescribed dose."`;

const techStack = [
  {
    layer: "AI / NLP Layer",
    icon: "🧠",
    color: "#4f46e5",
    bg: "#eef2ff",
    items: [
      { name: "Claude claude-sonnet-4-20250514 (Primary LLM)", desc: "Powers conversation, intent detection, and response generation" },
      { name: "LangChain / LlamaIndex", desc: "Orchestrates RAG pipeline — connects LLM to knowledge base" },
      { name: "OpenAI Embeddings / Cohere", desc: "Converts FAQ documents into vector embeddings for semantic search" },
      { name: "Intent Classifier", desc: "Custom fine-tuned classifier for healthcare intents (emergency, fasting, meds, etc.)" },
    ]
  },
  {
    layer: "Knowledge Base",
    icon: "📚",
    color: "#0891b2",
    bg: "#ecfeff",
    items: [
      { name: "Pinecone / Weaviate (Vector DB)", desc: "Stores embedded FAQs for semantic similarity search" },
      { name: "PostgreSQL", desc: "Stores structured data: clinic info, doctor schedules, policies" },
      { name: "Redis Cache", desc: "Caches top 100 most-asked questions for sub-100ms response" },
      { name: "Document Loader", desc: "Ingests PDFs, Word docs, and HTML pages into the knowledge base" },
    ]
  },
  {
    layer: "Backend API",
    icon: "⚙️",
    color: "#059669",
    bg: "#ecfdf5",
    items: [
      { name: "Node.js + Express (or FastAPI)", desc: "REST API server handling chat requests, sessions, and routing" },
      { name: "WebSocket (Socket.io)", desc: "Real-time streaming of bot responses token-by-token" },
      { name: "Session Manager", desc: "Maintains conversation history per user across turns" },
      { name: "Safety Filter Middleware", desc: "Scans every message for emergency keywords before LLM call" },
    ]
  },
  {
    layer: "Frontend / Channels",
    icon: "💬",
    color: "#d97706",
    bg: "#fffbeb",
    items: [
      { name: "React.js Web Widget", desc: "Embeddable chat widget for clinic websites (iframe or SDK)" },
      { name: "WhatsApp via Twilio", desc: "Patients can chat via WhatsApp without installing anything" },
      { name: "React Native (optional)", desc: "Native mobile app wrapper for iOS and Android" },
      { name: "Telegram Bot API", desc: "Additional channel for tech-savvy patients" },
    ]
  },
  {
    layer: "Analytics & Monitoring",
    icon: "📊",
    color: "#7c3aed",
    bg: "#f5f3ff",
    items: [
      { name: "Mixpanel / PostHog", desc: "Tracks intent frequency, session length, escalation rate" },
      { name: "Admin Dashboard (React)", desc: "Clinic staff see top questions, unresolved chats, handoff queue" },
      { name: "Sentry", desc: "Error monitoring and LLM failure alerting" },
      { name: "LangSmith", desc: "LLM observability — trace every prompt/response for debugging" },
    ]
  },
  {
    layer: "Infrastructure",
    icon: "🏗️",
    color: "#be185d",
    bg: "#fdf2f8",
    items: [
      { name: "AWS / GCP / Azure", desc: "Cloud hosting for API, DB, and vector store" },
      { name: "Docker + Kubernetes", desc: "Containerised deployment for scalability" },
      { name: "GitHub Actions CI/CD", desc: "Automated testing and deployment pipeline" },
      { name: "HIPAA-compliant storage", desc: "Encrypted storage for any patient data (if collected)" },
    ]
  }
];

const functions = [
  {
    name: "handleMessage()",
    type: "Core",
    color: "#4f46e5",
    bg: "#eef2ff",
    description: "Main entry point. Receives user message, runs safety check, retrieves KB context, calls LLM, returns response.",
    code: `async function handleMessage(sessionId, userMessage) {
  // 1. Safety check first
  const emergency = detectEmergency(userMessage);
  if (emergency) return emergencyResponse();

  // 2. Get conversation history
  const history = await getSession(sessionId);

  // 3. Retrieve relevant KB context
  const context = await retrieveContext(userMessage, topK=3);

  // 4. Build prompt and call LLM
  const response = await callLLM({
    system: SYSTEM_PROMPT,
    context: context,
    history: history,
    message: userMessage
  });

  // 5. Save turn to session
  await saveSession(sessionId, userMessage, response);

  // 6. Check if escalation needed
  const shouldEscalate = checkEscalation(history, response);

  return { response, shouldEscalate };
}`
  },
  {
    name: "detectEmergency()",
    type: "Safety",
    color: "#dc2626",
    bg: "#fef2f2",
    description: "Scans message for emergency keywords before any LLM call. Always runs first, cannot be bypassed.",
    code: `function detectEmergency(message) {
  const EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "stroke", "can't breathe",
    "difficulty breathing", "unconscious", "seizure",
    "severe bleeding", "overdose", "suicidal", "not breathing"
  ];

  const lower = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

function emergencyResponse() {
  return {
    response: "⚠️ This sounds urgent. Please call 108 immediately " +
              "or go to the nearest emergency room. Do not wait.",
    isEmergency: true,
    shouldEscalate: true
  };
}`
  },
  {
    name: "retrieveContext()",
    type: "RAG",
    color: "#0891b2",
    bg: "#ecfeff",
    description: "Converts user query to embedding, searches vector DB for top-K matching FAQ chunks, returns as context string.",
    code: `async function retrieveContext(query, topK = 3) {
  // Convert query to vector embedding
  const queryEmbedding = await embedText(query);

  // Search vector DB for similar FAQ chunks
  const results = await vectorDB.query({
    vector: queryEmbedding,
    topK: topK,
    filter: { type: "medical_faq" }
  });

  // Check Redis cache first
  const cached = await redis.get(\`ctx:\${hash(query)}\`);
  if (cached) return cached;

  // Format context for LLM
  const context = results.matches
    .map(r => \`[Source: \${r.metadata.category}]\n\${r.metadata.text}\`)
    .join("\n\n");

  // Cache for 1 hour
  await redis.setex(\`ctx:\${hash(query)}\`, 3600, context);
  return context;
}`
  },
  {
    name: "callLLM()",
    type: "AI",
    color: "#059669",
    bg: "#ecfdf5",
    description: "Builds the full prompt with system instructions, retrieved context, and conversation history, then streams response from Claude.",
    code: `async function callLLM({ system, context, history, message }) {
  const messages = [
    ...history.map(turn => ({
      role: turn.role,
      content: turn.content
    })),
    {
      role: "user",
      content: \`Context from knowledge base:\n\${context}\n\nPatient question: \${message}\`
    }
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: system,
    messages: messages,
    stream: true   // stream tokens to frontend
  });

  return response;
}`
  },
  {
    name: "checkEscalation()",
    type: "Logic",
    color: "#d97706",
    bg: "#fffbeb",
    description: "Decides whether to offer human handoff based on turn count, dissatisfaction signals, or clinical specificity.",
    code: `function checkEscalation(history, lastResponse) {
  const turnCount = history.length;

  // Escalate after 2 unresolved turns
  if (turnCount >= 4 && !wasResolved(history)) return true;

  // Escalate on dissatisfaction keywords
  const dissatisfied = ["not helpful", "doesn't answer",
    "talk to someone", "speak to a doctor", "human"];
  const lastMsg = history[history.length-1]?.content || "";
  if (dissatisfied.some(kw => lastMsg.toLowerCase().includes(kw))) return true;

  // Escalate if LLM flagged uncertainty
  if (lastResponse.includes("I'm not sure") ||
      lastResponse.includes("consult your doctor")) return true;

  return false;
}`
  },
  {
    name: "detectLanguage()",
    type: "Utility",
    color: "#7c3aed",
    bg: "#f5f3ff",
    description: "Detects message language and sets the response language accordingly. Supports English, Hindi, and Telugu.",
    code: `async function detectLanguage(message) {
  const SUPPORTED = ["en", "hi", "te"];  // English, Hindi, Telugu

  // Use langdetect or LLM for detection
  const detected = await langdetect.detect(message);
  const lang = detected[0]?.lang || "en";

  return SUPPORTED.includes(lang) ? lang : "en";
}

// Add to system prompt dynamically
function getLanguageInstruction(lang) {
  const map = {
    "en": "Respond in English.",
    "hi": "हिंदी में जवाब दें।",
    "te": "తెలుగులో సమాధానం ఇవ్వండి।"
  };
  return map[lang] || map["en"];
}`
  },
  {
    name: "logAnalytics()",
    type: "Analytics",
    color: "#be185d",
    bg: "#fdf2f8",
    description: "Logs every interaction with intent, resolution status, and escalation flag to the analytics pipeline.",
    code: `async function logAnalytics(sessionId, turn) {
  const event = {
    sessionId,
    timestamp: new Date().toISOString(),
    userMessage: turn.userMessage,
    intent: await classifyIntent(turn.userMessage),
    responseLength: turn.response.length,
    wasEscalated: turn.shouldEscalate,
    wasEmergency: turn.isEmergency,
    resolutionStatus: turn.resolved ? "resolved" : "unresolved",
    language: turn.language,
    turnNumber: turn.turnIndex
  };

  // Send to analytics
  await mixpanel.track("bot_turn", event);

  // Store in DB for dashboard
  await db.chatLogs.insert(event);
}`
  },
  {
    name: "ingestKnowledgeBase()",
    type: "Setup",
    color: "#0891b2",
    bg: "#ecfeff",
    description: "One-time setup function. Reads medical FAQ documents, chunks them, embeds each chunk, and upserts into vector DB.",
    code: `async function ingestKnowledgeBase(filePaths) {
  for (const filePath of filePaths) {
    // Load document (PDF, Word, HTML)
    const docs = await DocumentLoader.load(filePath);

    // Chunk into 300-token segments with 50-token overlap
    const chunks = TextSplitter.split(docs, {
      chunkSize: 300,
      overlap: 50
    });

    // Embed each chunk
    const embeddings = await Promise.all(
      chunks.map(chunk => embedText(chunk.text))
    );

    // Upsert into vector DB with metadata
    await vectorDB.upsert(
      chunks.map((chunk, i) => ({
        id: \`\${filePath}-\${i}\`,
        values: embeddings[i],
        metadata: {
          text: chunk.text,
          category: chunk.metadata.category,
          source: filePath
        }
      }))
    );
  }
  console.log("Knowledge base ingestion complete.");
}`
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedFn, setExpandedFn] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  function copyPrompt() {
    navigator.clipboard.writeText(systemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#0f1117",
      minHeight: "100vh",
      color: "#e2e8f0",
      padding: "0"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)",
        borderBottom: "1px solid #1e2535",
        padding: "24px 28px 0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>🏥</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc" }}>MediGuide — Symptom FAQ Bot</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Complete build blueprint · Healthcare · Support Bot</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {["System Prompt", "Tech Stack", "Functions", "API Integration"].map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                background: activeTab === i ? "#22c55e" : "transparent",
                color: activeTab === i ? "#fff" : "#64748b",
                transition: "all 0.2s"
              }}>{tab}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>

        {/* SYSTEM PROMPT TAB */}
        {activeTab === 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 4 }}>System Prompt</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Paste this directly into your LLM API call as the <code style={{ background: "#1e2535", padding: "1px 6px", borderRadius: 4, color: "#22c55e" }}>system</code> parameter</div>
              </div>
              <button onClick={copyPrompt} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #22c55e",
                background: copiedPrompt ? "#22c55e" : "transparent",
                color: copiedPrompt ? "#fff" : "#22c55e",
                cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.2s"
              }}>
                {copiedPrompt ? "✓ Copied!" : "Copy Prompt"}
              </button>
            </div>
            <pre style={{
              background: "#1a1f2e",
              border: "1px solid #1e2535",
              borderRadius: 12,
              padding: "20px 24px",
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "#94a3b8",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 600,
              overflowY: "auto"
            }}>{systemPrompt}</pre>
          </div>
        )}

        {/* TECH STACK TAB */}
        {activeTab === 1 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 4 }}>Tech Stack</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Full production-grade stack across all 6 layers</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
              {techStack.map((layer, li) => (
                <div key={li} style={{
                  background: "#1a1f2e",
                  border: "1px solid #1e2535",
                  borderRadius: 12,
                  padding: "16px 18px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{layer.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>{layer.layer}</span>
                  </div>
                  {layer.items.map((item, ii) => (
                    <div key={ii} style={{
                      borderLeft: `3px solid ${layer.color}`,
                      paddingLeft: 12,
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FUNCTIONS TAB */}
        {activeTab === 2 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 4 }}>Core Functions</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>8 key functions with full pseudocode — click any to expand</div>
            {functions.map((fn, fi) => (
              <div key={fi} style={{
                background: "#1a1f2e",
                border: `1px solid ${expandedFn === fi ? fn.color + "60" : "#1e2535"}`,
                borderRadius: 12,
                marginBottom: 10,
                overflow: "hidden",
                transition: "border-color 0.2s"
              }}>
                <div
                  onClick={() => setExpandedFn(expandedFn === fi ? null : fi)}
                  style={{
                    padding: "14px 18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <span style={{
                    background: fn.color + "25",
                    color: fn.color,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontWeight: 600,
                    minWidth: 70,
                    textAlign: "center"
                  }}>{fn.type}</span>
                  <code style={{ fontSize: 14, color: "#f8fafc", fontWeight: 600 }}>{fn.name}</code>
                  <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{fn.description}</span>
                  <span style={{ color: "#64748b", fontSize: 16 }}>{expandedFn === fi ? "▲" : "▼"}</span>
                </div>
                {expandedFn === fi && (
                  <div style={{ borderTop: "1px solid #1e2535" }}>
                    <pre style={{
                      margin: 0,
                      padding: "16px 20px",
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "#94a3b8",
                      overflowX: "auto",
                      background: "#141824"
                    }}>{fn.code}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* API INTEGRATION TAB */}
        {activeTab === 3 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 4 }}>API Integration</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Complete end-to-end API call with all pieces connected</div>

            {[
              {
                title: "1. Install dependencies",
                color: "#22c55e",
                code: `npm install @anthropic-ai/sdk langchain @pinecone-database/pinecone
npm install redis socket.io express langdetect`
              },
              {
                title: "2. Full API call — /api/chat endpoint",
                color: "#3b82f6",
                code: `// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  // Step 1: Emergency check (always first)
  if (detectEmergency(message)) {
    return res.json(emergencyResponse());
  }

  // Step 2: Detect language
  const lang = await detectLanguage(message);

  // Step 3: Get session history
  const history = await redis.get(\`session:\${sessionId}\`) || [];

  // Step 4: Retrieve context from vector DB
  const context = await retrieveContext(message, 3);

  // Step 5: Build and send to Claude
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: SYSTEM_PROMPT + getLanguageInstruction(lang),
    messages: [
      ...history,
      { role: "user", content: \`Context:\n\${context}\n\nQuestion: \${message}\` }
    ]
  });

  // Step 6: Stream response back
  res.setHeader('Content-Type', 'text/event-stream');
  for await (const chunk of stream) {
    res.write(\`data: \${JSON.stringify(chunk)}\n\n\`);
  }
  res.end();

  // Step 7: Save session + log analytics
  const fullResponse = await stream.finalMessage();
  await saveSession(sessionId, message, fullResponse.content[0].text);
  await logAnalytics(sessionId, { message, response: fullResponse });
});`
              },
              {
                title: "3. Frontend React hook",
                color: "#a855f7",
                code: `function useMediGuide() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text) {
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: text }]);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getSessionId(), message: text })
    });

    // Stream response token by token
    const reader = res.body.getReader();
    let botMsg = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = JSON.parse(new TextDecoder().decode(value).replace("data: ", ""));
      if (chunk.type === "content_block_delta") {
        botMsg += chunk.delta.text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: botMsg };
          return updated;
        });
      }
    }
    setLoading(false);
  }

  return { messages, sendMessage, loading };
}`
              }
            ].map((block, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: block.color, marginBottom: 8 }}>{block.title}</div>
                <pre style={{
                  background: "#1a1f2e",
                  border: "1px solid #1e2535",
                  borderRadius: 10,
                  padding: "16px 20px",
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "#94a3b8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowX: "auto"
                }}>{block.code}</pre>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
