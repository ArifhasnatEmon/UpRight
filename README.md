# UpRight — AI-Powered Digital Ergonomics System

![UpRight Version](https://img.shields.io/badge/version-0.13.4-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![Status](https://img.shields.io/badge/status-Stable-success)

UpRight is a privacy-first, AI-powered desktop application designed to combat prolonged screen exposure and poor posture among students, IT professionals, and gamers. Built for low-bandwidth environments, UpRight combines local posture tracking, gamified engagement, and optional cloud analytics to create a comprehensive digital wellness solution.

## 🚀 Key Features

* **Offline Posture Detection:** Real-time AI analysis of neck, shoulder, and head alignment processed entirely locally.
* **Eye Strain & Screen Distance Monitoring:** Actively tracks user distance from the screen to prevent visual fatigue.
* **Privacy-First Architecture:** Camera input is processed locally via MediaPipe. No video data is ever stored or transmitted.
* **Gamification System:** Integrated XP, level progression, and achievement unlocks to encourage long-term posture habits.
* **Gemini AI Health Tips:** Generates personalised, daily ergonomic advice based on your numeric session data.
* **Low Resource Mode:** Optimises CPU usage by disabling skeleton rendering and reducing frame rates for older hardware.
* **Authentication Options:** Secure online login via Supabase alongside a fully functional offline Guest Mode.

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite
* **Desktop Environment:** Electron, Electron Builder
* **Styling & Animations:** TailwindCSS 4, Framer Motion
* **AI & Machine Learning:** Google MediaPipe Pose, Google Gemini 1.5 Flash API
* **Backend & Auth:** Supabase (JWT)
* **Local Storage:** localStorage, Electron Store
* **Testing:** Vitest

## 📦 Installation & Setup

To run the UpRight application locally for development:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/upright.git
   cd upright
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Start the Electron app:**
   Open a second terminal window and run:
   ```bash
   npm run electron:dev
   ```

## 🏗️ Building for Production

To package the application as a standalone `.exe` installer for Windows:

```bash
npm run electron:build
```

The compiled installer will be available in the `release/` directory.

## 🎓 Academic Context

This application was developed as a university software engineering project with the goal of creating a scalable, low-cost, and privacy-respecting health tool for educational institutions and corporate workplaces in Bangladesh.

---
*Built with ❤️ for digital wellness.*
