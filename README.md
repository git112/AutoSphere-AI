# 🌌 AutoSphere-AI

**AutoSphere-AI** is an all-in-one AI-powered marketing and outreach automation platform designed to streamline content creation, SEO optimization, and multi-channel communication.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tech Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React%20%7C%20MongoDB%20%7C%20n8n-orange)

---

## 🚀 Key Features

### ✍️ AI Content Composer
Generate high-fidelity social media content in seconds.
- **Multi-Platform**: Tailored content for **Instagram, LinkedIn, and Twitter**.
- **Dynamic Tones**: Choose between Professional, Casual, or Promotional styles.
- **Goal-Oriented**: Optimize for Engagement, Sales, or Brand Awareness.
- **Image Generation**: Automated visual asset creation to match your content.

### 📧 Outreach Automation
A powerful engine for large-scale lead engagement.
- **Lead Parsing**: Upload **CSV, Excel, or PDF** files to extract contact details.
- **AI Personalization**: Rephrase messages using **Gemini 2.5 Flash** for higher response rates.
- **Multi-Channel**: Launch campaigns across **Email and WhatsApp** simultaneously.
- **Workflow Orchestration**: Integrated with **n8n** for robust background processing.

### 🔍 SEO Optimizer
Professional-grade SEO analysis and optimization.
- **Content Scoring**: Get real-time feedback on your content's search engine readiness.
- **Actionable Suggestions**: Specific tips to improve keyword density, readability, and structure.
- **Metadata Generation**: Automatically generates optimized Titles, Meta Descriptions, and Hashtags.

### 📅 Scheduler & Analytics
- **Visual Calendar**: Plan and manage your social media presence.
- **Performance Tracking**: Monitor campaign success and audience engagement metrics.
- **Agent Control**: Orchestrate AI agents to handle repetitive tasks.

### 🔐 Security & BYOK
- **Bring Your Own Key**: Securely use your own Gemini/OpenAI API keys.
- **Encryption**: Industry-standard Fernet encryption for all sensitive user credentials.
- **Authentication**: Robust JWT-based session management.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+)
- **Database**: [MongoDB](https://www.mongodb.com/) (Async Motor)
- **AI Integration**: [Google Gemini](https://ai.google.dev/) (2.5 Flash)
- **Automation**: [n8n](https://n8n.io/)
- **Browser Automation**: [Selenium](https://www.selenium.dev/) (for WhatsApp Service)

---

## 📦 Project Structure

```bash
AutoSphere-AI/
├── client/             # Vite + React Frontend
├── backend/            # FastAPI Backend Service
├── automation/         # n8n workflows & Docker configurations
└── whatsapp-service/   # Standalone Selenium-based WhatsApp engine
```

---

## ⚙️ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Docker (for n8n)
- MongoDB account (Atlas or local)

### 2. Installation

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
# Create .env file based on .env.example
python main.py
```

#### Frontend
```bash
cd client
npm install
# Create .env file with VITE_API_BASE_URL
npm run dev
```

#### Automation (n8n)
```bash
cd automation
docker compose -f docker-compose.n8n.yml up -d
```

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
