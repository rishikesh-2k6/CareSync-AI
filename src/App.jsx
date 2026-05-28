import { useState, useEffect } from "react";
import ChatWidget from "./components/ChatWidget";
import Dashboard from "./components/Dashboard";
import { initialKB } from "./data/initialKB";
import { 
  callLLM, retrieveContext, checkEscalation, detectLanguage, getLanguageInstruction 
} from "./services/chatbotService";

const DEFAULT_SYSTEM_PROMPT = `You are MediGuide, a healthcare FAQ assistant for a medical clinic. Your role is to answer patient questions accurately, empathetically, and safely.

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
   - chest pain, heart attack, stroke, can't breathe, difficulty breathing, unconscious, seizure, severe bleeding, poisoning, overdose, suicidal

## ESCALATION RULES
- If patient is unsatisfied after 2 responses → offer human agent handoff
- If question is clinical/specific to their case → recommend booking an appointment
- If bot confidence is low → say "I'm not sure about this — let me connect you with our team"

## RESPONSE FORMAT
- Keep answers under 150 words
- Use simple language (Grade 8 reading level)
- Use bullet points for steps or lists
- Always end with a helpful follow-up question or offer`;

export default function App() {
  // --- 1. Load Initial Configurations from LocalStorage ---
  const [systemConfig, setSystemConfig] = useState(() => {
    const saved = localStorage.getItem("caresync_config");
    const parsed = saved ? JSON.parse(saved) : null;
    
    // Pre-populate and default to the Groq API Engine out-of-the-box
    if (!parsed || (parsed.provider === "simulator" && !parsed.apiKey)) {
      const initConfig = {
        provider: "groq",
        apiKey: "",
        model: "llama-3.3-70b-versatile"
      };
      localStorage.setItem("caresync_config", JSON.stringify(initConfig));
      return initConfig;
    }
    return parsed;
  });

  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem("caresync_prompt") || DEFAULT_SYSTEM_PROMPT;
  });

  const [knowledgeBase, setKnowledgeBase] = useState(() => {
    const saved = localStorage.getItem("caresync_kb");
    return saved ? JSON.parse(saved) : initialKB;
  });

  // --- 2. Live Patient Sessions State ---
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Initialize a default active session for our floating ChatWidget on first load
  useEffect(() => {
    const widgetSessionId = "session-widget-patient";
    const initWidgetSession = {
      id: widgetSessionId,
      chatHistory: [
        {
          role: "assistant",
          content: "🏥 **Welcome to CareSync Clinic Support!**\n\nI am **MediGuide**, your virtual health receptionist. I can assist you with test preparations, clinical timings, insurance needs, or general symptom guides.\n\n*How can I help you today?*",
          sender: "bot"
        }
      ],
      isEscalated: false,
      isEmergency: false,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setSessions([initWidgetSession]);
    setActiveSessionId(widgetSessionId);
  }, []);

  // Write variables back to localStorage when changed
  useEffect(() => {
    localStorage.setItem("caresync_kb", JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  // Handoff Notification Audio Chime Simulator
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 Note
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5 Note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      // Audio context might be blocked until user interacts, safe pass
    }
  };

  // --- 3. Chat Widget Message Router (RAG Lookup & Safety Checks) ---
  const handleWidgetMessage = async (userText) => {
    const widgetSessionId = "session-widget-patient";
    const activeSess = sessions.find(s => s.id === widgetSessionId);
    if (!activeSess) return "Error initializing session";

    // 3.1: If chat has been taken over by clinician (human)
    if (activeSess.isEscalated) {
      // Wait for human input from dashboard. Return typing loader mock.
      // In a real database/websocket setup, this acts via active listeners.
      // Here, we log the user input so it shows in the Handoff Console.
      const updatedHistory = [
        ...activeSess.chatHistory,
        { role: "user", content: userText }
      ];
      updateSession(widgetSessionId, { chatHistory: updatedHistory });
      playChime(); // Alert clinician that patient replied
      
      // Let the widget know we logged it, human responder is active
      return "*(Your message has been sent directly to the clinical front desk. A staff member will reply shortly.)*";
    }

    // 3.2: Standard Bot Mode - Run safety analysis
    // (Emergency is checked internally by widget first, but we double check here)
    const historyClean = activeSess.chatHistory.map(h => ({
      role: h.role,
      content: h.content
    }));

    // Perform Local RAG Similarity Retrieval
    const matches = retrieveContext(userText, knowledgeBase, 3);
    
    // Format context block for system prompt injection
    const contextString = matches
      .map(m => `[Source: ${m.item.category}]\nQuestion: ${m.item.question}\nAnswer (EN): ${m.item.answer}\nAnswer (HI): ${m.item.answer_hi}\nAnswer (TE): ${m.item.answer_te}`)
      .join("\n\n");

    // Retrieve LLM text (via provider or simulator fallback)
    const botText = await callLLM({
      systemPrompt,
      userMessage: userText,
      context: contextString,
      history: historyClean,
      config: systemConfig
    });

    // Determine Handoff Escalation Need
    const historyWithCurrent = [...historyClean, { role: "user", content: userText }];
    const shouldEscalate = checkEscalation(historyWithCurrent, userText);

    // Save logs & update active session history
    const updatedHistory = [
      ...activeSess.chatHistory,
      { role: "user", content: userText },
      { role: "assistant", content: botText, sender: "bot" }
    ];

    const sessionUpdates = { chatHistory: updatedHistory };

    if (shouldEscalate) {
      sessionUpdates.isEscalated = true;
      sessionUpdates.chatHistory.push({
        role: "assistant",
        content: "👨‍⚕️ *Confidence check: I've flagged this chat for a live clinic specialist to assist you immediately. You are now placed in our active receptionist queue.*",
        sender: "bot"
      });
      playChime();
    }

    updateSession(widgetSessionId, sessionUpdates);
    return botText;
  };

  // Triggered on safety/emergency keywords direct overrides
  const handleEscalateSession = (userText, responseText, isEmergency) => {
    const widgetSessionId = "session-widget-patient";
    const activeSess = sessions.find(s => s.id === widgetSessionId);
    if (!activeSess) return;

    updateSession(widgetSessionId, {
      isEscalated: true,
      isEmergency: isEmergency || false,
      chatHistory: [
        ...activeSess.chatHistory,
        { role: "user", content: userText },
        { role: "assistant", content: responseText, sender: "bot", isAlert: isEmergency }
      ]
    });
    playChime();
  };

  // --- 4. Handoff Desk Receptionist Message Actions ---
  const handleSendHumanMessage = (sessionId, text) => {
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;

    const updatedHistory = [
      ...sess.chatHistory,
      { role: "assistant", content: text, sender: "human" }
    ];

    updateSession(sessionId, { chatHistory: updatedHistory });
  };

  // Handoff resolved - back to AI mode
  const handleResolveSession = (sessionId) => {
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;

    const updatedHistory = [
      ...sess.chatHistory,
      { 
        role: "assistant", 
        content: "✓ *Live chat session completed. MediGuide virtual clinical support has been re-activated for your safety.*", 
        sender: "bot" 
      }
    ];

    updateSession(sessionId, { 
      isEscalated: false, 
      isEmergency: false,
      chatHistory: updatedHistory 
    });
  };

  // --- Helper: Update target session index inside local collection ---
  const updateSession = (sessionId, updates) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, ...updates };
      }
      return s;
    }));
  };

  // --- 5. Knowledge Base Operations ---
  const handleAddKB = (item) => {
    setKnowledgeBase(prev => [item, ...prev]);
  };

  const handleDeleteKB = (id) => {
    setKnowledgeBase(prev => prev.filter(item => item.id !== id));
  };

  // --- 6. Configuration updates ---
  const handleUpdatePrompt = (newPrompt) => {
    setSystemPrompt(newPrompt);
    localStorage.setItem("caresync_prompt", newPrompt);
  };

  const handleUpdateConfig = (newConfig) => {
    setSystemConfig(newConfig);
    localStorage.setItem("caresync_config", JSON.stringify(newConfig));
  };

  const widgetSession = sessions.find(s => s.id === "session-widget-patient") || null;

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      
      {/* Clinic Administration Panel Fullscreen */}
      <Dashboard 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onSendHumanMessage={handleSendHumanMessage}
        onResolveSession={handleResolveSession}
        knowledgeBase={knowledgeBase}
        onAddKB={handleAddKB}
        onDeleteKB={handleDeleteKB}
        systemPrompt={systemPrompt}
        onUpdatePrompt={handleUpdatePrompt}
        systemConfig={systemConfig}
        onUpdateConfig={handleUpdateConfig}
      />

      {/* Floating Interactive CareSync Chatbot Overlay */}
      <ChatWidget 
        session={widgetSession}
        onSendMessage={handleWidgetMessage}
        onEscalate={handleEscalateSession}
        systemPrompt={systemPrompt}
        systemConfig={systemConfig}
      />

    </div>
  );
}
