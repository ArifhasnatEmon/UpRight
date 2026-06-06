// Audio engine
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (sharedAudioCtx) return sharedAudioCtx;
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedAudioCtx = new AudioContextClass();
  return sharedAudioCtx;
};

export type SoundType = 'alert' | 'snooze' | 'dismiss';
export type SoundPreset = 'default' | 'gentle' | 'chime' | 'silent' | 'custom';

interface SoundSettings {
  soundEnabled: boolean;
  soundVolume: number;
  soundPreset: SoundPreset;
  customSoundUrl?: string;
}

const DEFAULT_SOUND: SoundSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  soundPreset: 'default',
};

// Helper functions
function playTone(
  audioCtx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
  waveType: OscillatorType = 'sine'
) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const start = audioCtx.currentTime + startOffset;
  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

// Preset definitions

const PRESETS: Record<Exclude<SoundPreset, 'silent' | 'custom'>, Record<SoundType, (ctx: AudioContext, vol: number) => void>> = {
  default: {
    alert: (ctx, vol) => {
      playTone(ctx, 880, 0, 0.1, vol * 0.6);
      playTone(ctx, 1100, 0.12, 0.15, vol * 0.6);
    },
    snooze: (ctx, vol) => {
      playTone(ctx, 660, 0, 0.4, vol * 0.35);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    },
    dismiss: (ctx, vol) => {
      playTone(ctx, 150, 0, 0.05, vol * 0.3);
    },
  },

  gentle: {
    alert: (ctx, vol) => {
      // Soft tone
      playTone(ctx, 440, 0, 0.2, vol * 0.4);
      playTone(ctx, 523, 0.22, 0.25, vol * 0.4);
    },
    snooze: (ctx, vol) => {
      playTone(ctx, 392, 0, 0.5, vol * 0.25);
    },
    dismiss: (ctx, vol) => {
      playTone(ctx, 262, 0, 0.08, vol * 0.2);
    },
  },

  chime: {
    alert: (ctx, vol) => {
      // Musical bell
      playTone(ctx, 523, 0, 0.3, vol * 0.5, 'triangle');
      playTone(ctx, 659, 0.15, 0.3, vol * 0.5, 'triangle');
      playTone(ctx, 784, 0.30, 0.4, vol * 0.5, 'triangle');
    },
    snooze: (ctx, vol) => {
      // Descending chime
      playTone(ctx, 784, 0, 0.3, vol * 0.35, 'triangle');
      playTone(ctx, 659, 0.2, 0.4, vol * 0.35, 'triangle');
    },
    dismiss: (ctx, vol) => {
      // Single bell
      playTone(ctx, 523, 0, 0.15, vol * 0.3, 'triangle');
    },
  },
};

// Custom sound playback
export const playCustomSound = (dataUrl: string, volume: number = 0.5) => {
  try {
    const audio = new Audio(dataUrl);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    // Catch errors
  }
};

// Main export

export const playSound = (type: SoundType, settings?: Partial<SoundSettings>) => {
  try {
    const s = { ...DEFAULT_SOUND, ...settings };

    if (!s.soundEnabled || s.soundPreset === 'silent' || s.soundVolume <= 0) return;

    // Custom sound — alert only, interaction sounds use default preset
    if (s.soundPreset === 'custom' && s.customSoundUrl && type === 'alert') {
      playCustomSound(s.customSoundUrl, s.soundVolume);
      return;
    }

    // For custom preset non-alert sounds, fall through to default preset
    const presetKey = s.soundPreset === 'custom' ? 'default' : s.soundPreset as Exclude<SoundPreset, 'silent' | 'custom'>;

    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const preset = PRESETS[presetKey];
    if (preset && preset[type]) {
      preset[type](audioCtx, s.soundVolume);
    }
  } catch {
    // Catch errors
  }
};
