# ErgoNudge — AI-Powered Digital Ergonomics System

![ErgoNudge Version](https://img.shields.io/badge/version-0.14.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![Status](https://img.shields.io/badge/status-Stable-success)

ErgoNudge is a privacy-first, AI-powered desktop application designed to combat prolonged screen exposure and poor posture among students, IT professionals, and gamers. Built for low-bandwidth and offline environments, ErgoNudge combines local posture tracking, gamified engagement, and optional cloud analytics to create a comprehensive digital wellness solution.

## 🚀 Key Features

* **100% Offline AI Detection:** Uses locally hosted MediaPipe WebAssembly binaries and models. No internet connection is required for skeleton tracking, ensuring zero external bandwidth dependency.
* **Advanced 6-Metric Engine:** Tracks forward slouching, backward leaning, 3D spatial coordinate shifts, and includes a zone-based vertical neck pitch system (Safe, Micro-Forward, Slouching, Micro-Backward, Hyperextension) to prevent false alerts.
* **Frame-Height Fallback:** Instantly catches extreme reclining and slouching postures by monitoring nose-in-frame coordinates, working immediately without requiring calibration.
* **Eye Strain & Screen Distance Monitoring:** Actively tracks user distance from the screen to prevent visual fatigue.
* **Privacy-First Architecture:** Camera input is processed locally. No video data is ever stored or transmitted to any server.
* **Gamification System:** Integrated XP, level progression, and achievement unlocks to encourage long-term posture habits.
* **Gemini AI Health Tips:** Generates personalised, daily ergonomic advice based on your numeric session data.
* **Low Resource Mode:** Optimises CPU usage by disabling skeleton rendering and reducing frame rates for older hardware.
* **Authentication Options:** Secure online login via Supabase alongside a fully functional offline Guest Mode.

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite
* **Desktop Environment:** Electron, Electron Builder
* **Styling & Animations:** TailwindCSS 4, Framer Motion
* **AI & Machine Learning:** Google MediaPipe Pose (Local WASM/Assets), Google Gemini 1.5 Flash API
* **Backend & Auth:** Supabase (JWT)
* **Local Storage:** localStorage, Electron Store

## 📦 Installation & Setup

To run the ErgoNudge application locally for development:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ergonudge.git
   cd ergonudge
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


