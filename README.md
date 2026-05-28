# CareSync AI — MediGuide Patient FAQ Center & Dashboard

Welcome to **CareSync AI**, a premium, safety-first clinical FAQ chatbot widget and operational developer dashboard designed to optimize healthcare patient communication, pre-visit preparations, and staff coordination.

At the core of this system is **MediGuide**, an AI clinical assistant built from our interactive clinic blueprint. It operates side-by-side with an administrative console to provide a high-fidelity playground demonstrating clinical AI safety, local Vector RAG matching, and live receptionist handoffs.

---

## 🌟 Key Features

1. **MediGuide User Chat Widget**:
   - **Glassmorphic Clinical UI**: Sleek dark space styling with smooth floating animations and responsive layouts.
   - **Multilingual Support**: Real-time vocabulary token classification for **English**, **Hindi**, and **Telugu**.
   - **Speech-to-Text Dictation**: Hands-free patient input via the browser's native Web Speech API.
   - **Text-to-Speech Output**: Empathic spoken answers utilizing client-side speech synthesis engines.
   - **Interactive Quick-Prep Chips**: Instant shortcuts for fasting rules, scan setups, and clinic hours.

2. **Absolute Safety Gatekeepers**:
   - **Emergency Short-Circuit**: Instant safety alerts trigger if life-threatening words (e.g. *chest pain*, *cannot breathe*, *stroke*, *bleeding*) are detected.
   - **Danger Banner & Dictation Override**: Disables standard input, flashes active warning screens, reads instructions aloud, and provides a quick call link to **Dial 108**.
   - **Auto-Injected Disclaimers**: Every response includes the clinic disclaimer: *"This is general information. Consult your doctor for personal advice."*

3. **Clinic Admin Control Dashboard**:
   - **Overview & Analytics Grid**: Animated visual SVG charts showing session tracking, active intents, and language breakdowns over time.
   - **Live Handoff Console**: If a patient is unsatisfied or asks for a human, a bell sounds and a blue alert badge blinks. The receptionist can "Claim Chat" and text directly with the user via a two-way split intercom, taking over the widget in real-time.
   - **RAG Semantic Sandbox**: Enter any search query and see the Jaccard-overlap similarity engine calculate scores and rank KB matches with visual indicators.
   - **Prompt Configurator**: Edit MediGuide's system prompt instructions dynamically and see updates instantly affect chatbot decisions.
   - **API & Model Settings**: Select between a highly-trained rule-based offline **Simulator** and **Real AI mode** (connecting to the **Google Gemini API** or **OpenAI API** directly from the browser using secure local storage).

---

## 🛠️ Project File Architecture

The repository is organized following clean, non-bloated component separations:

```text
chatbot/
├── index.html                   # HTML Entry Shell (imports Outfit font & icons)
├── package.json                 # Build script configurations & core dependencies
├── vite.config.js               # Compiler configuration for React bundle
├── .gitignore                   # Excludes build logs, lock files & node_modules
├── README.md                    # Core project documentation
├── symptom_faq_bot_blueprint.jsx # Original visual interactive blueprint dashboard
└── src/
    ├── main.jsx                 # Bootstraps strict react tree rendering
    ├── App.jsx                  # Master Hub (coordinates shared states, audio, intercom sync)
    ├── index.css                # Style system (custom tokens, keyframes, transitions)
    ├── data/
    │   └── initialKB.js         # Default initial knowledge base FAQ list
    ├── services/
    │   └── chatbotService.js    # Safety, language classifier, RAG indexing & API hooks
    └── components/
        ├── ChatWidget.jsx       # Sleek patient-facing floating chat portal
        └── Dashboard.jsx        # Clinic administrative operations suite
```

---

## 🚀 Local Quickstart Guide

To boot up the application locally, run these quick commands in your terminal:

### 1. Ingest Dependencies
Ensure you have Node.js and npm installed on your system. Run:
```bash
npm install
```

### 2. Launch Local Dev Server
Fire up the Vite bundling engine:
```bash
npm run dev
```
*Vite will compile the assets and automatically open the portal at [http://localhost:3000](http://localhost:3000).*

### 3. Test Direct AI Connections
To test real LLM responses:
1. Open the Admin sidebar and go to the **API Configuration** tab.
2. Select **Google Gemini API** or **OpenAI GPT-4 API**.
3. Enter your private **API Key** securely (saved strictly in your browser's local sandbox) and choose a model (e.g. `gemini-1.5-flash`).
4. Click **Save Configuration**. MediGuide will now stream context-enriched clinical responses!
