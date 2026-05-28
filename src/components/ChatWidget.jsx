import { useState, useEffect, useRef } from "react";
import { 
  Send, Volume2, VolumeX, Mic, MicOff, Paperclip, 
  ArrowLeft, CheckCheck, X, Image as ImageIcon, Settings 
} from "lucide-react";
import { 
  detectEmergency, getEmergencyResponse 
} from "../services/chatbotService";

export default function ChatWidget({ 
  session, 
  onSendMessage, 
  onEscalate,
  systemPrompt,
  systemConfig,
  onUpdateConfig 
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi Jennie! I am your clinic support bot. You can ask me any clinic questions, or **attach a medical receipt** to analyze your medicine schedules!",
      sender: "bot"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // base64 representation
  const [imagePreview, setImagePreview] = useState(null);   // preview url

  // Settings Overlay States inside phone screen
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState(systemConfig.provider);
  const [apiKey, setApiKey] = useState(systemConfig.apiKey);
  const [model, setModel] = useState(systemConfig.model);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Sync settings when systemConfig shifts
  useEffect(() => {
    setProvider(systemConfig.provider);
    setApiKey(systemConfig.apiKey);
    setModel(systemConfig.model);
  }, [systemConfig]);

  // Sync session state changes from App.jsx (like human receptionist messages)
  useEffect(() => {
    if (session && session.chatHistory.length > 0) {
      const formatted = session.chatHistory.map(h => ({
        role: h.role,
        content: h.content,
        sender: h.sender,
        image: h.image,
        isAlert: h.isAlert
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
      rec.lang = "en-US";
      
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

  // Read response aloud using Text-to-Speech
  const speakText = (text) => {
    if (!ttsEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_⚠️]/g, "").replace(/\[.*?\]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
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

  // Handle Prescription Image Selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image preview
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (textToSend, attachImage = selectedImage) => {
    const text = textToSend || inputValue;
    if (!text.trim() && !attachImage) return;

    // Check emergency first
    if (text && detectEmergency(text)) {
      speakText("Warning: Urgent symptoms detected. Please call 108 immediately or go to the nearest emergency room.");
      const alertMsg = getEmergencyResponse();
      onEscalate(text, alertMsg.response, true);
      setInputValue("");
      handleRemoveImage();
      return;
    }

    // Add user message to history in App controller
    const userTurn = { 
      role: "user", 
      content: text || "Uploaded prescription receipt for schedule scanning.",
      sender: "patient",
      image: attachImage // Base64 stored here!
    };

    setIsTyping(true);
    setInputValue("");
    handleRemoveImage();

    // Call chatbot engine via App controller
    try {
      await onSendMessage(text || "Scanned receipt.", attachImage);
      setIsTyping(false);
    } catch (e) {
      setIsTyping(false);
      alert("Error sending message: " + e.message);
    }
  };

  // Save Config inside Phone Panel
  const handleSaveSettings = () => {
    onUpdateConfig({ provider, apiKey, model });
    setShowSettings(false);
    alert("✓ AI Engine config updated dynamically!");
  };

  // Click handler for action chips
  const handleChipClick = (action) => {
    if (action === "escalate") {
      onSendMessage("I need to chat with an agent.", null, true); // True forces immediate receptionist handoff
    } else if (action === "helpful") {
      setMessages(prev => [
        ...prev,
        { role: "user", content: "Yes, it was helpful.", sender: "patient" },
        { role: "assistant", content: "Thank you for your feedback! Please let me know if you need anything else.", sender: "bot" }
      ]);
    }
  };

  const getTimeString = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{
      width: "375px",
      height: "680px",
      backgroundColor: "#000", // Outer phone frame black
      borderRadius: "44px",
      padding: "10px", // Bezel width
      boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      border: "2px solid #222"
    }}>
      
      {/* Speaker mesh & Camera Notch Bezel Mockup */}
      <div style={{
        position: "absolute",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "140px",
        height: "26px",
        backgroundColor: "#000",
        borderBottomLeftRadius: "16px",
        borderBottomRightRadius: "16px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {/* Small camera dot */}
        <div style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: "#111",
          border: "1px solid #222",
          marginRight: "10px"
        }} />
        {/* Speaker lines */}
        <div style={{
          width: "40px",
          height: "3px",
          borderRadius: "2px",
          backgroundColor: "#333"
        }} />
      </div>

      {/* Inner Phone Screen Container (Pure white based on Mockup) */}
      <div style={{
        flex: 1,
        backgroundColor: "#fff", // White mockup theme
        borderRadius: "36px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #eee",
        position: "relative"
      }}>
        
        {/* Mobile Status Header Padding */}
        <div style={{ height: "26px", backgroundColor: "#fff" }} />

        {/* Custom Header Bar */}
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid #f3f4f6",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          {/* Back Arrow decoration */}
          <div style={{ color: "#111827", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={20} />
          </div>

          {/* Bot Icon Wrapper */}
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#7c3aed", // Purple bot
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "18px"
          }}>
            {session?.isEscalated ? "👨‍⚕️" : "🤖"}
          </div>

          {/* Chat Title */}
          <div>
            <h3 style={{
              fontSize: "14.5px",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              lineHeight: 1.2
            }}>
              {session?.isEscalated ? "Staff Specialist" : "Customer Care Bot"}
            </h3>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              {session?.isEscalated ? "Tommy is active" : "Online · Active"}
            </span>
          </div>

          {/* Speaker Toggle Button */}
          <button 
            onClick={() => setTtsEnabled(!ttsEnabled)}
            style={{
              marginLeft: "auto",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "none",
              background: ttsEnabled ? "#f3e8ff" : "transparent",
              color: ttsEnabled ? "#7c3aed" : "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Inline Settings Cog Button inside mockup */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "none",
              background: showSettings ? "#f3e8ff" : "transparent",
              color: showSettings ? "#7c3aed" : "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="AI Engine Setup"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Slide-down Settings Panel Overlay covering message list */}
        {showSettings && (
          <div style={{
            position: "absolute",
            top: "76px", // directly below header bar
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fff",
            zIndex: 500,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
            borderTop: "1px solid #eee",
            animation: "fadeInUp 0.25s ease-out forwards"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>AI Engine Settings</h4>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>Engine Mode</label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  if (e.target.value === "groq") setModel("llama-3.3-70b-versatile");
                  else if (e.target.value === "gemini") setModel("gemini-1.5-flash");
                  else if (e.target.value === "openai") setModel("gpt-4o-mini");
                }}
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#f9fafb",
                  color: "#111827",
                  padding: "0 10px",
                  fontSize: "12px"
                }}
              >
                <option value="simulator">Rule-Based Local Simulator</option>
                <option value="groq">Groq Cloud (Llama Models)</option>
                <option value="gemini">Google Gemini AI</option>
                <option value="openai">OpenAI GPT Models</option>
              </select>
            </div>

            {provider !== "simulator" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>Model ID</label>
                  <input 
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Model Name"
                    style={{
                      height: "36px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      background: "#f9fafb",
                      color: "#111827",
                      padding: "0 10px",
                      fontSize: "12px"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>API Key</label>
                  <div style={{ position: "relative" }}>
                    <input 
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste private key..."
                      style={{
                        width: "100%",
                        height: "36px",
                        borderRadius: "8px",
                        border: "1px solid #ddd",
                        background: "#f9fafb",
                        color: "#111827",
                        padding: "0 50px 0 10px",
                        fontSize: "12px"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "9px",
                        background: "transparent",
                        border: "none",
                        color: "#7c3aed",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {showKey ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <span style={{ fontSize: "9px", color: "#6b7280" }}>
                    Key is saved strictly in browser storage (`localStorage`).
                  </span>
                </div>
              </>
            )}

            <button 
              onClick={handleSaveSettings}
              style={{
                backgroundColor: "#7c3aed",
                color: "#fff",
                border: "none",
                height: "38px",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "12.5px",
                marginTop: "10px"
              }}
            >
              Save Configuration
            </button>
          </div>
        )}

        {/* Chat Messages Feed Body */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#fafafa" // Soft mockup feed bg
        }}>
          
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isHandoffAlert = msg.content.includes("Confidence check") || msg.content.includes("Live chat session completed");

            // Centered system messages (like handoff notifications)
            if (isHandoffAlert) {
              return (
                <div 
                  key={i}
                  style={{
                    alignSelf: "center",
                    fontSize: "11.5px",
                    color: "#6b7280",
                    background: "#f3f4f6",
                    padding: "6px 14px",
                    borderRadius: "16px",
                    textAlign: "center",
                    margin: "4px 0",
                    width: "85%",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  Agent Tommy joined the conversation. {getTimeString()}
                </div>
              );
            }

            return (
              <div 
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "10px",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  alignItems: "flex-start"
                }}
              >
                
                {/* A. Left Avatar: Show for bot or human receptionist */}
                {!isUser && (
                  <img 
                    src={msg.sender === "human" ? "/avatars/receptionist.png" : "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%237c3aed%22/><text y=%22.7em%22 x=%2250%25%22 text-anchor=%22middle%22 font-size=%2255%22 fill=%22white%22>🤖</text></svg>"} 
                    alt="avatar" 
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginTop: "16px", // aligned below name baseline
                      border: "1px solid #e5e7eb"
                    }}
                  />
                )}

                {/* B. Message Bubble Column */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start"
                }}>
                  
                  {/* User's Name displayed strictly above bubble (based on mockup image) */}
                  {isUser && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#4b5563",
                      marginBottom: "4px",
                      paddingRight: "6px"
                    }}>
                      Jennie Doe
                    </span>
                  )}

                  {/* Actual Speech Bubble */}
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "16px",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    color: "#1f2937",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    background: msg.isAlert 
                      ? "#fef2f2" // danger alert red tint
                      : "#f3f4f6", // Jennie Doe mockup light grey background for both!
                    border: msg.isAlert 
                      ? "1px solid #fca5a5" 
                      : "1px solid #e5e7eb"
                  }}>
                    
                    {/* Render uploaded image attachment if present */}
                    {msg.image && (
                      <div style={{ marginBottom: "8px" }}>
                        <img 
                          src={msg.image} 
                          alt="receipt attachment" 
                          style={{
                            width: "100%",
                            maxHeight: "150px",
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: "1px solid #ddd"
                          }}
                        />
                        <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <ImageIcon size={10} /> Scanned Prescription Receipt
                        </div>
                      </div>
                    )}
                    
                    {msg.content}
                  </div>

                  {/* Timestamp & Double Check status underneath */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "4px",
                    fontSize: "9.5px",
                    color: "#9ca3af",
                    padding: "0 6px"
                  }}>
                    {isUser && <CheckCheck size={11} color="#10b981" />}
                    <span>{getTimeString()}</span>
                  </div>

                </div>

                {/* C. Right Avatar: Display only for user (Jennie Doe) */}
                {isUser && (
                  <img 
                    src="/avatars/jennie_doe.png" 
                    alt="patient avatar" 
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginTop: "16px", // aligned below name baseline
                      border: "1px solid #e5e7eb"
                    }}
                  />
                )}

              </div>
            );
          })}

          {/* Bot typing dot indicator */}
          {isTyping && (
            <div style={{ display: "flex", gap: "8px", padding: "10px 14px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "16px", width: "50px", alignSelf: "flex-start", marginLeft: "42px" }}>
              {[1, 2, 3].map(dot => (
                <div key={dot} style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#7c3aed",
                  animation: "blink 1.2s infinite both",
                  animationDelay: `${dot * 0.15}s`
                }} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mockup Interactive Purple Action Chips Panel */}
        {messages.length < 5 && (
          <div style={{
            padding: "8px 16px",
            background: "#fafafa",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "center",
            borderTop: "1px solid #f3f4f6"
          }}>
            {/* Outline Chip: helpful */}
            <button
              onClick={() => handleChipClick("helpful")}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "20px",
                border: "1.5px solid #7c3aed",
                background: "transparent",
                color: "#7c3aed",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#faf5ff"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Yes, it was helpful.
            </button>

            {/* Solid Chip: Escalate Handoff */}
            <button
              onClick={() => handleChipClick("escalate")}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "20px",
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#6d28d9"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#7c3aed"}
            >
              I need to chat with an agent.
            </button>
          </div>
        )}

        {/* Uploaded Prescription Preview Thumbnail inside input bar */}
        {imagePreview && (
          <div style={{
            padding: "10px 16px",
            background: "#fff",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{ position: "relative" }}>
              <img 
                src={imagePreview} 
                alt="prescription preview" 
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "1px solid #ddd"
                }}
              />
              <button
                onClick={handleRemoveImage}
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  border: "none",
                  fontSize: "9px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1f2937" }}>Prescription Attached</div>
              <div style={{ fontSize: "9.5px", color: "#6b7280" }}>Scan will process immediately on send</div>
            </div>
          </div>
        )}

        {/* Bottom Send Input Bar Form */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{
            padding: "12px 16px",
            background: "#fff",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          {/* Image Attachment Trigger */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "none",
              background: "transparent",
              color: "#7c3aed",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
            title="Attach prescription receipt image"
          >
            <Paperclip size={20} />
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: "none" }}
          />

          {/* Text Input */}
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: "13.5px",
              color: "#111827",
              padding: "8px 0"
            }}
            id="input-chatbot-text"
          />

          {/* Dictation Microphone */}
          <button 
            type="button"
            onClick={toggleListening}
            style={{
              border: "none",
              background: "transparent",
              color: isListening ? "#ef4444" : "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Send Button */}
          <button 
            type="submit"
            disabled={!inputValue.trim() && !selectedImage}
            style={{
              border: "none",
              background: "transparent",
              color: (inputValue.trim() || selectedImage) ? "#7c3aed" : "#9ca3af", // Purple active send text
              fontWeight: 700,
              fontSize: "14px",
              cursor: (inputValue.trim() || selectedImage) ? "pointer" : "default",
              padding: "4px 8px"
            }}
            id="btn-chatbot-send"
          >
            Send
          </button>
        </form>

        {/* Mobile Bottom Home Bar padding */}
        <div style={{
          height: "18px",
          backgroundColor: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          {/* Home indicator bar */}
          <div style={{
            width: "120px",
            height: "4px",
            borderRadius: "2px",
            backgroundColor: "#e5e7eb"
          }} />
        </div>

      </div>
    </div>
  );
}
