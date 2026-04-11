<div align="center">
  <h1>🏥 CareFlow AI: Hospital Command Center</h1>
  <p><strong>Revolutionizing healthcare administration with Real-Time Analytics and Generative AI Diagnostics.</strong></p>

  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=firebase&logoColor=white)
  ![Gemini AI](https://img.shields.io/badge/Gemini%20AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)
</div>

---

## 🎯 The Problem
Traditional hospital management systems are notoriously fragmented, slow, and lack proactive insights. Doctors and administrators waste critical time dealing with bureaucratic hurdles rather than focusing on patient care. Assessing immediate risk from a massive influx of patient documents is nearly impossible at scale.

## 💡 Our Solution
**CareFlow AI** is a state-of-the-art, centralized hospital dashboard engineered to solve clinical bottlenecks. By leveraging **Google Generative AI**, the system instantly processes incoming patient data, analyzes health risk factors, and provides actionable triage insights. Coupled with real-time Firebase syncing, hospital staff get an live, bird's-eye view of every department.

---

## ✨ Key Innovations & Features
- **🧠 Generative AI Risk Assessment:** Automatically analyzes patient check-in documents and vitals using Gemini AI to instantly calculate risk and triage priorities.
- **📊 Real-Time Command Analytics:** Beautiful, zero-latency visualizations (powered by Recharts) showing ICU capacities, admission rates, and critical alerts.
- **⚡ Seamless Admission Workflow:** A streamlined, frictionless UI for admitting, monitoring, and discharging patients, minimizing administrative overhead.
- **🔒 Secure & Scalable Architecture:** Built on top of Firebase for real-time live data syncing and enterprise-grade security.

---

## 🛠️ Technical Architecture
### Frontend
- **Framework:** React 19 + TypeScript / JavaScript
- **Build Tool:** blazing fast Vite compiler
- **Styling:** Tailwind CSS with dynamic utilities (`clsx`, `tailwind-merge`)
- **Data Visualization:** Recharts for dynamic dashboard telemetry
- **Icons & UI:** Lucide React for consistent, crisp iconography

### Backend & AI
- **Database & Auth:** Firebase Cloud ecosystem (Firestore)
- **AI Integration:** `@google/generative-ai` API for deep document summarization and clinical risk extraction.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Installation
```bash
# Clone the repository and navigate into the directory
npm install
```

### 3. Environment Variables
Ensure you have your `.env.local` file configured with your Firebase credentials and Google Gemini API keys.

### 4. Start the Dev Server
```bash
npm run dev
```

---

<div align="center">
  <b>Built with ❤️ for a healthier, more efficient tomorrow.</b>
</div>
