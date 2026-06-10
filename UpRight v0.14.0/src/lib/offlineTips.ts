// Offline tips

import { storageKeys } from './storage';

export const OFFLINE_TIPS = [
  "Position your monitor so the top third is at eye level to reduce neck strain.",
  "Keep your keyboard and mouse close enough that your elbows stay at 90 degrees.",
  "Sit with your feet flat on the floor or on a footrest for better spinal support.",
  "Every 30 minutes, stand up and take 5 deep breaths to reset your posture.",
  "Adjust your chair so your thighs are parallel to the floor for optimal hip position.",
  "Use the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
  "Position your screen at arm's length (50–70 cm) to reduce eye strain.",
] as const;

// Tip rotation
export const getOfflineTip = (): string => {
  const tipIndex = parseInt(localStorage.getItem(storageKeys.tipIndex) || '0');
  const tip = OFFLINE_TIPS[tipIndex % OFFLINE_TIPS.length];
  const nextIndex = (tipIndex + 1) % OFFLINE_TIPS.length;
  localStorage.setItem(storageKeys.tipIndex, nextIndex.toString());
  return tip;
};
