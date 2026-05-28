import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, Volume2, VolumeX, Mic, MicOff, 
  Languages, AlertTriangle, ShieldAlert, Phone, RefreshCw, UserCheck 
} from "lucide-react";
import { 
  detectEmergency, getEmergencyResponse, checkEscalation 
} from "../services/chatbotService";

export default function ChatWidget({ 
  session, 
  onSendMessage, 
  onEscalate,
  systemPrompt,
  systemConfig 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "🏥 **Welcome to CareSync Clinic Support!**\n\nI am **MediGuide**, your virtual health receptionist. I can assist you with test preparations, clinical timings, insurance needs, or general symptom guides.\n\n*How can I help you today?*"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeLang, setActiveLang] = useState("en");
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Sync parent session state changes (e.g. human takeover messages)
  useEffect(() => {
    if (session && session.chatHistory.length > 0) {
      // Re-map history
      const formatted = session.chatHistory.map(h => ({
        role: h.role,
        content: h.content,
        sender: h.sender // 'bot' or 'human'
      }));
      setMessages(formatted);
    }
  }, [session?.chatHistory]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setInputValue(text);
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  // Handle Speech Recognition Language updates
  useEffect(() => {
    if (recognitionRef.current) {
      const langMap = { en: "en-US", hi: "hi-IN", te: "te-IN" };
      recognitionRef.current.lang = langMap[activeLang] || "en-US";
    }
  }, [activeLang]);

  // Read response aloud using Text-to-Speech
  const speakText = (text) => {
    if (!ttsEnabled) return;
    
    // Stop any active speak
    window.speechSynthesis.cancel();
    
    // Clean markdown before speaking
    const cleanText = text.replace(/[*#_⚠️]/g, "").replace(/\[.*?\]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Select correct voice accent if available
    const langMap = { en: "en-US", hi: "hi-IN", te: "te-IN" };
    utterance.lang = langMap[activeLang] || "en-US";
    
    window.speechSynthesis.speak(utterance);
  };

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Check emergency first
    if (detectEmergency(text)) {
      setEmergencyAlert(true);
      speakText("Warning: Chest pain or severe symptoms detected. Please call 108 immediately or go to the nearest emergency room.");
      
      const alertMsg = getEmergencyResponse();
      const updatedMessages = [
        ...messages,
        { role: "user", content: text },
        { role: "assistant", content: alertMsg.response, sender: "bot", isAlert: true }
      ];
      setMessages(updatedMessages);
      setInputValue("");
      
      // Notify parent about emergency escalation
      onEscalate(text, alertMsg.response, true);
      return;
    }

    // Add user message
    const userTurn = { role: "user", content: text };
    const updatedWithUser = [...messages, userTurn];
    setMessages(updatedWithUser);
    setInputValue("");
    setIsTyping(true);

    // Call chatbot engine via App controller
    try {
      const responseText = await onSendMessage(text);
      
      setIsTyping(false);
      const botTurn = { 
        role: "assistant", 
        content: responseText, 
        sender: session?.isEscalated ? "human" : "bot" 
      };
      
      setMessages(prev => [...prev, botTurn]);
      speakText(responseText);
    } catch (e) {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "⚠️ Sorry, there was an issue communicating with our clinic assistant. Please try again." 
      }]);
    }
  };

  const quickPrompts = [
    { label: "Do I need to fast?", text: "Can I eat before my blood test?" },
    { label: "Prepare for MRI scan", text: "How do I prepare for an MRI scan?" },
    { label: "Clinic operating hours", text: "What are the clinic's operating hours?" },
    { label: "Paracetamol dosage", text: "What is the correct dosage for Paracetamol?" }
  ];

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 999 }}>
      
      {/* 1. Closed Chat Floating Circle */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="glow-active"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.4)",
            transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          id="btn-chatbot-toggle"
        >
          <MessageSquare size={26} />
        </button>
      )}

      {/* 2. Open Chat Interface (Slide-up Glassmorphism Panel) */}
      {isOpen && (
        <div 
          className="glass animate-fade-in"
          style={{
            width: "400px",
            height: "600px",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
          }}
        >
          
          {/* Header Panel */}
          <div style={{
            padding: "16px 20px",
            background: "linear-gradient(90deg, #131924 0%, #0d121c 100%)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: session?.isEscalated 
                    ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" // Blue for human
                    : "linear-gradient(135deg, #10b981, #059669)", // Green for bot
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}>
                  {session?.isEscalated ? "👨‍⚕️" : "🏥"}
                </div>
                <div className="glow-active" style={{
                  position: "absolute",
                  bottom: "-2px",
                  right: "-2px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  border: "2px solid #0d121c"
                }} />
              </div>
              
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                  {session?.isEscalated ? "Clinic Desk (Human)" : "MediGuide Assistant"}
                  {session?.isEscalated && (
                    <span style={{
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      color: "#3b82f6",
                      fontSize: "9px",
                      padding: "1px 5px",
                      borderRadius: "10px",
                      fontWeight: 700
                    }}>TAKEN OVER</span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  {session?.isEscalated ? "Live Receptionist Chat" : "Safety-First FAQ Bot"}
                </div>
              </div>
            </div>

            {/* Quick Actions (Audio / Close) */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              
              {/* Language Indicator */}
              <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(255,255,255,0.04)", padding: "3px", borderRadius: "14px" }}>
                {["en", "hi", "te"].map(l => (
                  <button
                    key={l}
                    onClick={() => setActiveLang(l)}
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      background: activeLang === l ? "var(--primary)" : "transparent",
                      color: activeLang === l ? "#fff" : "var(--text-muted)",
                      transition: "var(--transition)"
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Speaker Toggle */}
              <button 
                onClick={() => setTtsEnabled(!ttsEnabled)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "none",
                  background: ttsEnabled ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: ttsEnabled ? "var(--primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "0 4px"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Emergency Active Warning Header */}
          {emergencyAlert && (
            <div 
              className="emergency-pulse"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#ff6b6b",
                fontSize: "12px",
                fontWeight: 500
              }}
            >
              <ShieldAlert size={14} />
              <span>Severe Emergency Keywords Detected. Call 108 immediately.</span>
              <button 
                onClick={() => setEmergencyAlert(false)}
                style={{
                  marginLeft: "auto",
                  border: "none",
                  background: "transparent",
                  color: "#ff6b6b",
                  cursor: "pointer",
                  fontSize: "11px",
                  textDecoration: "underline"
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#0c0e14"
          }}>
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className="animate-slide-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                
                {/* Message Bubble */}
                <div style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  wordBreak: "break-word",
                  color: "#e2e8f0",
                  whiteSpace: "pre-wrap",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" // emerald for user
                    : msg.isAlert 
                      ? "rgba(239, 68, 68, 0.15)" // Crimson red for safety warning
                      : msg.sender === "human"
                        ? "rgba(59, 130, 246, 0.15)" // blue tint for human staff
                        : "rgba(255, 255, 255, 0.04)", // gray for standard bot
                  border: msg.role === "user" 
                    ? "none" 
                    : msg.isAlert 
                      ? "1px solid rgba(239, 68, 68, 0.3)" 
                      : msg.sender === "human"
                        ? "1px solid rgba(59, 130, 246, 0.3)"
                        : "1px solid var(--border-color)",
                  boxShadow: msg.role === "user" ? "0 4px 10px rgba(16, 185, 129, 0.15)" : "none",
                }}>
                  {msg.content}
                </div>

                {/* Speaker Timestamp/Meta */}
                <div style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                  padding: "0 4px"
                }}>
                  {msg.role === "user" 
                    ? "You" 
                    : msg.isAlert 
                      ? "Safety Alert" 
                      : msg.sender === "human"
                        ? "Staff receptionist"
                        : "MediGuide Bot"}
                </div>
              </div>
            ))}

            {/* Dynamic Typing Indicator */}
            {isTyping && (
              <div style={{ display: "flex", gap: "4px", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "14px", width: "50px" }}>
                {[1, 2, 3].map(dot => (
                  <div key={dot} style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary)",
                    animation: "blink 1.2s infinite both",
                    animationDelay: `${dot * 0.15}s`
                  }} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips Panel */}
          {messages.length < 5 && (
            <div style={{
              padding: "10px 16px",
              background: "#0c0e14",
              borderTop: "1px solid rgba(255,255,255,0.02)",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              whiteSpace: "nowrap"
            }} className="no-scrollbar">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.text)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "16px",
                    border: "1px solid var(--border-color)",
                    background: "rgba(255,255,255,0.02)",
                    color: "var(--text-sub)",
                    fontSize: "11px",
                    cursor: "pointer",
                    transition: "var(--transition)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.color = "var(--text-sub)";
                  }}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          )}

          {/* Emergency quick Call overlay */}
          {emergencyAlert && (
            <div style={{
              padding: "10px 16px",
              background: "#140e11",
              borderTop: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "11px", color: "#ff6b6b" }}>Need medical assistance immediately?</span>
              <a 
                href="tel:108"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  padding: "5px 12px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                <Phone size={11} /> Dial 108
              </a>
            </div>
          )}

          {/* Form Input Footer */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{
              padding: "16px",
              background: "#0c0e14",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {/* Speech Microphone Toggle */}
            <button 
              type="button"
              onClick={toggleListening}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                background: isListening ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.03)",
                color: isListening ? "#ef4444" : "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "var(--transition)"
              }}
              title="Dictate message"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Input Field */}
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isListening 
                  ? "Listening carefully..." 
                  : session?.isEscalated 
                    ? "Type to live clinician..."
                    : "Ask MediGuide (fasting, MRI)..."
              }
              disabled={isListening}
              style={{
                flex: 1,
                height: "38px",
                borderRadius: "20px",
                border: "1px solid var(--border-color)",
                background: "rgba(255, 255, 255, 0.02)",
                color: "#fff",
                padding: "0 14px",
                fontSize: "12.5px"
              }}
              id="input-chatbot-text"
            />

            {/* Send Submit Button */}
            <button 
              type="submit"
              disabled={!inputValue.trim()}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                background: inputValue.trim() 
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                  : "rgba(255, 255, 255, 0.03)",
                color: inputValue.trim() ? "#fff" : "var(--text-muted)",
                cursor: inputValue.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "var(--transition)"
              }}
              id="btn-chatbot-send"
            >
              <Send size={16} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
