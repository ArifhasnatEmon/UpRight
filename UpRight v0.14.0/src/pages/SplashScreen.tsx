import React, { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    // Keep it displayed for 3.0 seconds to let all animations complete smoothly
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[10002] bg-[#171717] flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        .splash-root {
          --brand-green: #22c55e;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          height: 100%;
          position: relative;
          background: radial-gradient(circle at 50% 50%, #1c1f2b 0%, #0d0e12 100%);
          font-family: 'Inter', sans-serif;
        }

        .splash-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          z-index: 5;
        }

        /* Ambient breathing glow behind the logo card */
        .logo-backlight {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 38px;
          background: var(--brand-green);
          filter: blur(35px);
          opacity: 0.25;
          z-index: -1;
          animation: backlightPulse 4s infinite ease-in-out;
        }

        /* Logo Card Wrapper with rotating conic-gradient glow border */
        .logo-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 38px;
          padding: 4px; /* Border thickness */
          overflow: hidden;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.5),
            0 0 25px rgba(34, 197, 94, 0.35);
          animation: 
            logoEntrance 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            floatLogo 5s infinite ease-in-out;
        }

        /* Rotating laser glow sweep (the trail-like gradient orbiting the border - pure green) */
        .border-glow-sweeper {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg,
              transparent 0%,
              transparent 35%,
              var(--brand-green) 50%,
              rgba(34, 197, 94, 0.4) 58%,
              transparent 70%,
              transparent 100%);
          animation: rotateSweeper 3.5s linear infinite;
          z-index: 1;
        }

        /* Logo container background - identical to original app splash screen color */
        .logo-card {
          position: relative;
          width: 100%;
          height: 100%;
          background: var(--brand-green); /* App logo box green */
          border-radius: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          box-shadow: 
            inset 0 2px 4px rgba(255, 255, 255, 0.25),
            inset 0 -2px 6px rgba(0, 0, 0, 0.15);
        }

        /* Heartbeat SVG (Reversed Lucide Activity to draw left-to-right) */
        .heartbeat-icon {
          width: 52px;
          height: 52px;
          stroke: #ffffff; /* White icon inside green card */
          stroke-width: 2.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.15));
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: drawOnce 1.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          animation-delay: 0.8s;
        }

        /* UpRight Brand Text */
        .brand-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 44px;
          font-weight: 700;
          letter-spacing: -0.01em;
          display: flex;
          gap: 1.5px;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
          margin: 0;
        }

        /* Staggered slide-up reveal */
        .brand-title span {
          display: inline-block;
          opacity: 0;
          transform: translateY(18px) scale(0.85);
          filter: blur(6px);
          animation: slideUpReveal 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* "Up" - Silver/white styling */
        .brand-title span:nth-child(1),
        .brand-title span:nth-child(2) {
          background: linear-gradient(180deg, #ffffff 40%, #c1c5cd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* "Right" - Green ergonomic styling */
        .brand-title span:nth-child(3),
        .brand-title span:nth-child(4),
        .brand-title span:nth-child(5),
        .brand-title span:nth-child(6),
        .brand-title span:nth-child(7) {
          background: linear-gradient(180deg, #4ade80 30%, #15803d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.2));
        }

        /* Stagger delays */
        .brand-title span:nth-child(1) { animation-delay: 0.1s; }
        .brand-title span:nth-child(2) { animation-delay: 0.18s; }
        .brand-title span:nth-child(3) { animation-delay: 0.26s; }
        .brand-title span:nth-child(4) { animation-delay: 0.34s; }
        .brand-title span:nth-child(5) { animation-delay: 0.42s; }
        .brand-title span:nth-child(6) { animation-delay: 0.50s; }
        .brand-title span:nth-child(7) { animation-delay: 0.58s; }

        /* Subtitle and Loading Container */
        .subtitle-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          opacity: 0;
          transform: translateY(12px);
          animation: subtitleReveal 0.85s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          animation-delay: 0.9s;
        }
        
        .brand-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #8b8e96;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin: 0;
        }

        .loading-bar-container {
          width: 200px;
          height: 3px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .loading-bar-fill {
          height: 100%;
          background: var(--brand-green);
          border-radius: 10px;
          width: 0%;
          box-shadow: 0 0 10px var(--brand-green);
          animation: fillProgress 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          animation-delay: 1.1s;
        }

        /* KEYFRAMES */

        @keyframes logoEntrance {
          from {
            opacity: 0;
            transform: scale(0.7) rotate(-12deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes rotateSweeper {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }

        @keyframes backlightPulse {
          0%, 100% {
            opacity: 0.22;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.38;
            transform: scale(1.1);
          }
        }

        @keyframes drawOnce {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes slideUpReveal {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes subtitleReveal {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fillProgress {
          to {
            width: 100%;
          }
        }
      `}</style>
      <div className="splash-root">
        <div className="splash-container">
          {/* Breathing backlight under the logo card */}
          <div className="logo-backlight"></div>

          {/* Logo Card Wrapper with rotating gradient border */}
          <div className="logo-wrapper">
            <div className="border-glow-sweeper"></div>
            <div className="logo-card">
              {/* Heartbeat trace SVG (Lucide Activity reversed for left-to-right draw) */}
              <svg className="heartbeat-icon" viewBox="0 0 24 24">
                <path
                  className="heartbeat-trace"
                  d="M2 12h4l3-9 6 18 3-9h4"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Staggered slide-up reveal for Brand Name */}
          <h1 className="brand-title">
            <span>U</span>
            <span>p</span>
            <span>R</span>
            <span>i</span>
            <span>g</span>
            <span>h</span>
            <span>t</span>
          </h1>

          {/* Subtitle and Loading Progress Bar */}
          <div className="subtitle-container">
            <p className="brand-subtitle">AI-Powered Ergonomics</p>
            <div className="loading-bar-container">
              <div className="loading-bar-fill"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
