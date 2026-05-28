import { useState, useEffect } from "react";
import { 
  Activity, Users, ShieldAlert, FileText, Search, Plus, 
  Trash, Settings, Send, Check, Phone, RefreshCw, Languages, MessageSquare, AlertTriangle 
} from "lucide-react";
import { retrieveContext } from "../services/chatbotService";

export default function Dashboard({
  sessions,
  activeSessionId,
  onSelectSession,
  onSendHumanMessage,
  onResolveSession,
  knowledgeBase,
  onAddKB,
  onDeleteKB,
  systemPrompt,
  onUpdatePrompt,
  systemConfig,
  onUpdateConfig
}) {
  const [activeTab, setActiveTab] = useState("overview");
  
  // KB Manager Form States
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswerEn, setNewAnswerEn] = useState("");
  const [newAnswerHi, setNewAnswerHi] = useState("");
  const [newAnswerTe, setNewAnswerTe] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [kbCategory, setKbCategory] = useState("Pre-visit Prep");
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const [simSearchResults, setSimSearchResults] = useState([]);

  // Live Handoff Console states
  const [handoffInput, setHandoffInput] = useState("");

  // API Config States
  const [provider, setProvider] = useState(systemConfig.provider);
  const [apiKey, setApiKey] = useState(systemConfig.apiKey);
  const [model, setModel] = useState(systemConfig.model);
  const [showKey, setShowKey] = useState(false);

  // System Prompt State
  const [tempPrompt, setTempPrompt] = useState(systemPrompt);

  // Auto-run local similarity simulator search as user types in sandbox
  useEffect(() => {
    if (kbSearchQuery.trim().length > 2) {
      const results = retrieveContext(kbSearchQuery, knowledgeBase, 5);
      setSimSearchResults(results);
    } else {
      setSimSearchResults([]);
    }
  }, [kbSearchQuery, knowledgeBase]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleAddFAQ = (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswerEn.trim()) return;

    const keywordsArray = newKeywords
      .toLowerCase()
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const item = {
      id: `kb-custom-${Date.now()}`,
      category: kbCategory,
      question: newQuestion,
      answer: newAnswerEn,
      answer_hi: newAnswerHi || newAnswerEn,
      answer_te: newAnswerTe || newAnswerEn,
      keywords: keywordsArray.length > 0 ? keywordsArray : newQuestion.toLowerCase().split(/\s+/)
    };

    onAddKB(item);
    
    // Clear fields
    setNewQuestion("");
    setNewAnswerEn("");
    setNewAnswerHi("");
    setNewAnswerTe("");
    setNewKeywords("");
    alert("✓ Custom FAQ added to clinic knowledge base!");
  };

  const handleSaveConfig = () => {
    onUpdateConfig({ provider, apiKey, model });
    alert("✓ Configuration updated successfully!");
  };

  const handleSavePrompt = () => {
    onUpdatePrompt(tempPrompt);
    alert("✓ MediGuide instructions updated! Chat widget will use new prompt immediately.");
  };

  // Metric aggregates
  const totalChats = sessions.length;
  const escalatedChats = sessions.filter(s => s.isEscalated).length;
  const emergencyCount = sessions.filter(s => s.isEmergency).length;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "260px 1fr",
      height: "100vh",
      background: "#080a0f",
      color: "#e2e8f0"
    }}>
      
      {/* 1. Left Sidebar Navigation */}
      <div style={{
        background: "#0c0f17",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 0"
      }}>
        {/* Brand Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 24px",
          marginBottom: "32px"
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            boxShadow: "0 0 10px rgba(16,185,129,0.3)"
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em", color: "#f8fafc" }}>CareSync AI</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>CLINIC CONTROL CENTER</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 12px" }}>
          {[
            { id: "overview", label: "Overview & Analytics", icon: <Activity size={18} /> },
            { id: "handoff", label: "Live Handoff Desk", icon: <Users size={18} />, badge: escalatedChats },
            { id: "kb", label: "Knowledge Base", icon: <FileText size={18} /> },
            { id: "prompt", label: "System Prompt", icon: <ShieldAlert size={18} /> },
            { id: "settings", label: "API Configuration", icon: <Settings size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                textAlign: "left",
                background: activeTab === tab.id ? "rgba(16, 185, 129, 0.1)" : "transparent",
                color: activeTab === tab.id ? "var(--primary)" : "var(--text-sub)",
                transition: "var(--transition)",
                position: "relative"
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {!!tab.badge && (
                <span className="emergency-pulse" style={{
                  position: "absolute",
                  right: "14px",
                  backgroundColor: "var(--danger)",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "10px"
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "0 24px", fontSize: "11px", color: "var(--text-muted)" }}>
          CareSync Portal v1.0.0<br />
          All Rights Secured
        </div>
      </div>

      {/* 2. Right Main Working Panel */}
      <div style={{
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        height: "100vh"
      }}>
        
        {/* Top bar status */}
        <div style={{
          padding: "18px 32px",
          borderBottom: "1px solid var(--border-color)",
          background: "#0c0f17",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>
              {activeTab === "overview" && "Clinic Support Operations"}
              {activeTab === "handoff" && "Patient Live Handoff Queue"}
              {activeTab === "kb" && "Knowledge Base (RAG Analyzer)"}
              {activeTab === "prompt" && "MediGuide System Guidelines"}
              {activeTab === "settings" && "LLM Core AI Engine Config"}
            </h1>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {activeTab === "overview" && "Live clinic chat activity, emergency volume, and response breakdowns."}
              {activeTab === "handoff" && "Claim escalated patient sessions and speak as a clinic receptionist."}
              {activeTab === "kb" && "Ingest custom FAQs, map semantic keywords, and check vector matching."}
              {activeTab === "prompt" && "Configure MediGuide's prompt limits, emergency protocols, and medical identity."}
              {activeTab === "settings" && "Toggle offline RAG rules or connect directly to Gemini or OpenAI."}
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "6px 12px", borderRadius: "16px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--primary)" }} />
              <span>Safety Filter: Active</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "6px 12px", borderRadius: "16px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: systemConfig.provider !== "simulator" ? "var(--secondary)" : "var(--warning)" }} />
              <span style={{ textTransform: "uppercase" }}>Engine: {systemConfig.provider}</span>
            </div>
          </div>
        </div>

        {/* Tabs Contents */}
        <div style={{ padding: "32px", flex: 1 }}>
          
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              {/* Grid 3 KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                {[
                  { label: "Active Chat Sessions", val: totalChats, desc: "Total patient session lifecycles", color: "#10b981", bg: "rgba(16, 185, 129, 0.05)" },
                  { label: "Pending Handoffs", val: escalatedChats, desc: "Awaiting clinic human response", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.05)", isAlert: escalatedChats > 0 },
                  { label: "Emergency Triggers", val: emergencyCount, desc: "Acute safety keyword overrides", color: "#ef4444", bg: "rgba(239, 68, 68, 0.05)", isAlert: emergencyCount > 0 }
                ].map((kpi, idx) => (
                  <div 
                    key={idx} 
                    className={`glass ${kpi.isAlert ? 'emergency-pulse' : ''}`}
                    style={{
                      padding: "24px",
                      borderRadius: "var(--radius-lg)",
                      border: `1px solid ${kpi.isAlert ? 'var(--danger)' : 'rgba(255,255,255,0.04)'}`
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "8px" }}>{kpi.label}</div>
                    <div style={{ fontSize: "36px", fontWeight: 800, color: kpi.color, marginBottom: "4px" }}>{kpi.val}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-sub)" }}>{kpi.desc}</div>
                  </div>
                ))}
              </div>

              {/* Graphic Vector Charts Layout */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px" }}>
                
                {/* 1. SVG Line Chart: Chat Volumes */}
                <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>Clinical Operations Chat Volume (Last 7 Days)</div>
                  
                  {/* Clean SVG visual */}
                  <svg viewBox="0 0 500 200" style={{ width: "100%", height: "180px", overflow: "visible" }}>
                    {/* Grid lines */}
                    <line x1="0" y1="180" x2="500" y2="180" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    
                    {/* Area fill */}
                    <path 
                      d="M 0 180 Q 80 140 160 160 T 320 90 T 480 40 L 500 40 L 500 180 Z" 
                      fill="url(#grad-area)" 
                      opacity="0.1" 
                    />
                    
                    {/* Glowing chart path */}
                    <path 
                      d="M 0 180 Q 80 140 160 160 T 320 90 T 480 40" 
                      fill="none" 
                      stroke="var(--primary)" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                    />

                    {/* Nodes */}
                    <circle cx="80" cy="155" r="4.5" fill="var(--primary)" stroke="#080a0f" strokeWidth="1.5" />
                    <circle cx="240" cy="120" r="4.5" fill="var(--primary)" stroke="#080a0f" strokeWidth="1.5" />
                    <circle cx="400" cy="50" r="4.5" fill="var(--primary)" stroke="#080a0f" strokeWidth="1.5" />

                    {/* Gradient definition */}
                    <defs>
                      <linearGradient id="grad-area" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--bg-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginTop: "10px" }}>
                    <span>May 22</span>
                    <span>May 24</span>
                    <span>May 26</span>
                    <span>May 28 (Today)</span>
                  </div>
                </div>

                {/* 2. SVG Donut Chart: Active Languages */}
                <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>Multilingual Distribution</div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "24px", justifyContent: "center", height: "180px" }}>
                    <svg width="120" height="120" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4.5"></circle>
                      {/* English - 60% */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--primary)" strokeWidth="4.5" strokeDasharray="60 40" strokeDashoffset="25"></circle>
                      {/* Hindi - 25% */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--secondary)" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="65"></circle>
                      {/* Telugu - 15% */}
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--warning)" strokeWidth="4.5" strokeDasharray="15 85" strokeDashoffset="90"></circle>
                    </svg>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[
                        { label: "English (60%)", color: "var(--primary)" },
                        { label: "Hindi (25%)", color: "var(--secondary)" },
                        { label: "Telugu (15%)", color: "var(--warning)" }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Sample logs info */}
              <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "14px" }}>System Audit Logs</div>
                {sessions.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No active logs recorded. Open the chat widget on the bottom right and type a message to start!</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {sessions.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "16px" }}>{s.isEmergency ? "🚨" : s.isEscalated ? "👨‍⚕️" : "🤖"}</span>
                          <div>
                            <span style={{ fontWeight: 600, color: "#f8fafc" }}>Session ID: {s.id.slice(0, 8)}...</span>
                            <span style={{ color: "var(--text-muted)", marginLeft: "10px" }}>Turn count: {s.chatHistory.length}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {s.isEmergency && <span style={{ padding: "2px 6px", fontSize: "9px", borderRadius: "4px", backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", fontWeight: 700 }}>EMERGENCY OVERRIDE</span>}
                          {s.isEscalated && <span style={{ padding: "2px 6px", fontSize: "9px", borderRadius: "4px", backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6", fontWeight: 700 }}>ESC - CLINIC AGENT</span>}
                          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{s.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIVE HANDOFF DESK TAB */}
          {activeTab === "handoff" && (
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", height: "520px", overflow: "hidden" }}>
              
              {/* Left list of escalated/active chats */}
              <div className="glass" style={{ display: "flex", flexDirection: "column", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", fontSize: "13px", fontWeight: 600, color: "#fff" }}>Escalated Conversations</div>
                
                <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {sessions.filter(s => s.isEscalated).length === 0 ? (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", padding: "40px 20px" }}>
                      ✓ **Queue Clean**<br /><br />
                      No active patient requests are in the handoff queue.
                    </div>
                  ) : (
                    sessions.filter(s => s.isEscalated).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => onSelectSession(s.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${activeSessionId === s.id ? "rgba(59, 130, 246, 0.4)" : "transparent"}`,
                          background: activeSessionId === s.id ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.01)",
                          cursor: "pointer",
                          transition: "var(--transition)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>Patient {s.id.slice(0, 6)}...</span>
                          <span className="emergency-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--secondary)" }} />
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          {s.chatHistory[s.chatHistory.length - 1]?.content.slice(0, 30)}...
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Panel: Split Live Chat Console */}
              <div className="glass" style={{ display: "flex", flexDirection: "column", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {activeSession ? (
                  <>
                    {/* Console Header */}
                    <div style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--border-color)",
                      background: "rgba(255,255,255,0.01)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>Live Patient Intercom: {activeSession.id.slice(0, 8)}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Patients view your responses immediately in their chat widget.</div>
                      </div>

                      <button 
                        onClick={() => onResolveSession(activeSession.id)}
                        style={{
                          backgroundColor: "rgba(16,185,129,0.15)",
                          color: "var(--primary)",
                          border: "1px solid var(--primary)",
                          padding: "6px 14px",
                          borderRadius: "16px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Check size={12} /> Resolve & Handoff back to AI
                      </button>
                    </div>

                    {/* Console Feed */}
                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      background: "#05070a"
                    }}>
                      {activeSession.chatHistory.map((msg, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-start" : "flex-end" }}>
                          <div style={{
                            maxWidth: "75%",
                            padding: "10px 14px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            lineHeight: "1.4",
                            whiteSpace: "pre-wrap",
                            background: msg.role === "user" 
                              ? "rgba(255,255,255,0.03)" // Patient gray
                              : msg.sender === "human"
                                ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" // Admin Blue
                                : "rgba(16, 185, 129, 0.05)", // Bot Green
                            border: msg.role === "user" 
                              ? "1px solid var(--border-color)" 
                              : msg.sender === "human"
                                ? "none"
                                : "1px solid rgba(16,185,129,0.2)"
                          }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "4px" }}>
                            {msg.role === "user" ? "Patient" : msg.sender === "human" ? "You (Staff receptionist)" : "MediGuide Bot (Automatic)"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Console input footer */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!handoffInput.trim()) return;
                        onSendHumanMessage(activeSession.id, handoffInput);
                        setHandoffInput("");
                      }}
                      style={{
                        padding: "16px",
                        borderTop: "1px solid var(--border-color)",
                        background: "rgba(255,255,255,0.01)",
                        display: "flex",
                        gap: "10px",
                        alignItems: "center"
                      }}
                    >
                      <input 
                        type="text"
                        value={handoffInput}
                        onChange={(e) => setHandoffInput(e.target.value)}
                        placeholder="Type response as clinic staff agent... (e.g. Let me book that appointment for you)"
                        style={{
                          flex: 1,
                          height: "38px",
                          borderRadius: "20px",
                          border: "1px solid var(--border-color)",
                          background: "rgba(255,255,255,0.02)",
                          color: "#fff",
                          padding: "0 14px",
                          fontSize: "12.5px"
                        }}
                      />
                      <button 
                        type="submit"
                        disabled={!handoffInput.trim()}
                        style={{
                          backgroundColor: handoffInput.trim() ? "var(--secondary)" : "rgba(255,255,255,0.03)",
                          color: handoffInput.trim() ? "#fff" : "var(--text-muted)",
                          border: "none",
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          cursor: handoffInput.trim() ? "pointer" : "default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "var(--transition)"
                        }}
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "10px" }}>
                    <MessageSquare size={36} />
                    <span style={{ fontSize: "13px" }}>Please select an active escalated patient session from the left queue.</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* KNOWLEDGE BASE TAB */}
          {activeTab === "kb" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              
              {/* Left Section: FAQ Records List & Ingestion Sandbox */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Search / Vector similarity sandbox */}
                <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "14px" }}>RAG Semantic Similarity Sandbox</div>
                  <div style={{ fontSize: "11px", color: "var(--text-sub)", marginBottom: "12px" }}>Type a message to simulate vector calculations. It filters the KB and displays matching confidence scores.</div>
                  
                  <div style={{ position: "relative", display: "flex", gap: "10px" }}>
                    <div style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-muted)" }}>
                      <Search size={16} />
                    </div>
                    <input 
                      type="text"
                      value={kbSearchQuery}
                      onChange={(e) => setKbSearchQuery(e.target.value)}
                      placeholder="Type a clinical query... (e.g. eat breakfast before blood test)"
                      style={{
                        width: "100%",
                        height: "38px",
                        borderRadius: "20px",
                        border: "1px solid var(--border-color)",
                        background: "rgba(255,255,255,0.02)",
                        color: "#fff",
                        padding: "0 14px 0 38px",
                        fontSize: "12.5px"
                      }}
                    />
                  </div>

                  {/* Sandbox matching list */}
                  {simSearchResults.length > 0 && (
                    <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)" }}>Matched vector chunks:</div>
                      {simSearchResults.map((res, i) => (
                        <div key={i} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "10px 14px", background: "rgba(255,255,255,0.02)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff" }}>{res.item.question}</span>
                            <span style={{ 
                              fontSize: "11px", 
                              fontWeight: 700, 
                              color: res.score > 0.6 ? "var(--primary)" : res.score > 0.2 ? "var(--warning)" : "var(--text-muted)" 
                            }}>
                              Score: {res.score}
                            </span>
                          </div>
                          {/* Score visual bar */}
                          <div style={{ height: "4px", width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" }}>
                            <div style={{ 
                              height: "100%", 
                              width: `${Math.min(res.score * 70, 100)}%`, 
                              backgroundColor: res.score > 0.6 ? "var(--primary)" : res.score > 0.2 ? "var(--warning)" : "var(--text-muted)" 
                            }} />
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{res.item.answer.slice(0, 120)}...</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FAQ Ingested Records list */}
                <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>Ingested Knowledgebase Records ({knowledgeBase.length})</div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Matches are evaluated client-side</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "350px", overflowY: "auto" }}>
                    {knowledgeBase.map((item, i) => (
                      <div key={i} style={{ border: "1px solid var(--border-color)", padding: "14px", borderRadius: "var(--radius-sm)", position: "relative" }}>
                        <button 
                          onClick={() => onDeleteKB(item.id)}
                          style={{
                            position: "absolute",
                            right: "14px",
                            top: "14px",
                            border: "none",
                            background: "transparent",
                            color: "rgba(239, 68, 68, 0.4)",
                            cursor: "pointer",
                            transition: "var(--transition)"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "rgba(239, 68, 68, 0.4)"}
                          title="Delete record"
                        >
                          <Trash size={14} />
                        </button>
                        
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "9px", backgroundColor: "rgba(16,185,129,0.1)", color: "var(--primary)", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>
                            {item.category}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>ID: {item.id}</span>
                        </div>
                        
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc", marginBottom: "4px", paddingRight: "20px" }}>Q: {item.question}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-sub)", lineHeight: "1.4" }}>A (EN): {item.answer}</div>
                        
                        {/* Keyword badges */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "10px" }}>
                          {item.keywords.map((kw, ki) => (
                            <span key={ki} style={{ fontSize: "8.5px", color: "var(--text-muted)", border: "1px solid var(--border-color)", padding: "1px 5px", borderRadius: "4px" }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Section: Add custom records form */}
              <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)", alignSelf: "start" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={16} color="var(--primary)" /> Ingest Custom Medical FAQ
                </div>

                <form onSubmit={handleAddFAQ} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Category</label>
                    <select
                      value={kbCategory}
                      onChange={(e) => setKbCategory(e.target.value)}
                      style={{
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "#0c0f17",
                        color: "#fff",
                        padding: "0 10px",
                        fontSize: "12px"
                      }}
                    >
                      <option value="Pre-visit Prep">Pre-visit Prep</option>
                      <option value="Common Tests">Common Tests</option>
                      <option value="Medications">Medications</option>
                      <option value="Symptoms">Symptoms</option>
                      <option value="Post-visit Care">Post-visit Care</option>
                      <option value="Clinic Logistics">Clinic Logistics</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Question *</label>
                    <input 
                      type="text"
                      required
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="e.g., Can I park at the clinic?"
                      style={{
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "#0c0f17",
                        color: "#fff",
                        padding: "0 12px",
                        fontSize: "12px"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Answer (English) *</label>
                    <textarea 
                      required
                      value={newAnswerEn}
                      onChange={(e) => setNewAnswerEn(e.target.value)}
                      placeholder="e.g., Yes, we offer free patient parking in the basement..."
                      style={{
                        height: "70px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "#0c0f17",
                        color: "#fff",
                        padding: "10px 12px",
                        fontSize: "12px",
                        resize: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Answer (Hindi) - Optional</label>
                    <textarea 
                      value={newAnswerHi}
                      onChange={(e) => setNewAnswerHi(e.target.value)}
                      placeholder="e.g., हाँ, हम बेसमेंट में मुफ्त पार्किंग प्रदान करते हैं..."
                      style={{
                        height: "50px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "#0c0f17",
                        color: "#fff",
                        padding: "8px 12px",
                        fontSize: "12px",
                        resize: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Answer (Telugu) - Optional</label>
                    <textarea 
                      value={newAnswerTe}
                      onChange={(e) => setNewAnswerTe(e.target.value)}
                      placeholder="e.g., అవును, బేస్మెంట్లో ఉచిత పార్కింగ్ ఉంది..."
                      style={{
                        height: "50px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "#0c0f17",
                        color: "#fff",
                        padding: "8px 12px",
                        fontSize: "12px",
                        resize: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Search Keywords (Comma-separated)</label>
                    <input 
                      type="text"
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                      placeholder="parking, car, slots, vehicle"
                      style={{
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "#0c0f17",
                        color: "#fff",
                        padding: "0 12px",
                        fontSize: "12px"
                      }}
                    />
                  </div>

                  <button 
                    type="submit"
                    style={{
                      height: "38px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: "var(--primary)",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "12.5px",
                      marginTop: "10px",
                      transition: "var(--transition)"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--primary-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--primary)"}
                  >
                    Ingest & Vectorize FAQ
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* SYSTEM PROMPT TAB */}
          {activeTab === "prompt" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
              
              {/* Left instructions code view */}
              <div className="glass" style={{ padding: "24px", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>Instructions Editor</div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Runs dynamically in System LLM context</span>
                </div>

                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  style={{
                    width: "100%",
                    height: "400px",
                    fontFamily: "var(--font-code)",
                    fontSize: "11.5px",
                    background: "#05070a",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-sub)",
                    padding: "16px",
                    lineHeight: "1.6"
                  }}
                />

                <button 
                  onClick={handleSavePrompt}
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    height: "38px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "12.5px"
                  }}
                >
                  Save System Instructions
                </button>
              </div>

              {/* Right explanation context cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="glass" style={{ padding: "20px", borderRadius: "var(--radius-sm)" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldAlert size={14} color="var(--primary)" /> 1. Identity & Tone
                  </h3>
                  <p style={{ fontSize: "11.5px", color: "var(--text-sub)", lineHeight: "1.4" }}>
                    MediGuide operates with a professional, caring nurse persona. Keeping responses under 150 words prevents information overload for patients in distress.
                  </p>
                </div>
                
                <div className="glass" style={{ padding: "20px", borderRadius: "var(--radius-sm)" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={14} color="#ef4444" /> 2. Safety Guidelines
                  </h3>
                  <p style={{ fontSize: "11.5px", color: "var(--text-sub)", lineHeight: "1.4" }}>
                    MediGuide NEVER diagnoses conditions. A strict disclaimer is auto-injected. Acute keywords prompt instant override overlays to guide patients to immediate hospital emergency rooms.
                  </p>
                </div>

                <div className="glass" style={{ padding: "20px", borderRadius: "var(--radius-sm)" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <RefreshCw size={14} color="#3b82f6" /> 3. Live Receptionist Switch
                  </h3>
                  <p style={{ fontSize: "11.5px", color: "var(--text-sub)", lineHeight: "1.4" }}>
                    If confidence drops, or a patient requests staff, our checklist flags the session, sends sound alerts, and routes them directly to the Handoff Console for real-time clinician interaction.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* SETTINGS / API CONFIG TAB */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: "600px" }} className="glass">
              <div style={{ padding: "24px", borderBottom: "1px solid var(--border-color)", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                LLM Core AI Engine Config
              </div>

              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>AI Engine Mode</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    style={{
                      height: "38px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      background: "#0c0f17",
                      color: "#fff",
                      padding: "0 10px",
                      fontSize: "12.5px"
                    }}
                  >
                    <option value="simulator">Rule-Based Local Simulator (Offline - Zero Setup)</option>
                    <option value="groq">Groq Cloud API (High-Speed Llama Models)</option>
                    <option value="gemini">Google Gemini API (Direct Streaming Client-Side)</option>
                    <option value="openai">OpenAI GPT-4 API (Direct Client-Side)</option>
                  </select>
                </div>

                {provider !== "simulator" && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Model ID Name</label>
                      <input 
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={provider === "groq" ? "llama-3.3-70b-versatile" : provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini"}
                        style={{
                          height: "38px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          background: "#0c0f17",
                          color: "#fff",
                          padding: "0 12px",
                          fontSize: "12.5px"
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 500 }}>Provider API Key</label>
                      <div style={{ position: "relative" }}>
                        <input 
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Paste your API key securely here..."
                          style={{
                            width: "100%",
                            height: "38px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-color)",
                            background: "#0c0f17",
                            color: "#fff",
                            padding: "0 80px 0 12px",
                            fontSize: "12.5px"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "8px",
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontWeight: 600
                          }}
                        >
                          {showKey ? "HIDE" : "SHOW"}
                        </button>
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        Your keys are stored purely in your browser's local sandbox (`localStorage`) and never uploaded to any remote server.
                      </span>
                    </div>
                  </>
                )}

                <button 
                  onClick={handleSaveConfig}
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    height: "40px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "12.5px",
                    marginTop: "10px",
                    transition: "var(--transition)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--primary-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--primary)"}
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
