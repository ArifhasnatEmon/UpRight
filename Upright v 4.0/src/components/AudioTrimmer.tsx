import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Music, X, Play, Square, Check } from 'lucide-react';
import { cn } from '../utils';

interface AudioTrimmerProps {
  audioDataUrl: string;
  fileName: string;
  maxDuration?: number;
  onClipReady: (clipDataUrl: string, duration: number) => void;
  onCancel: () => void;
}

// WAV encoding helper 

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write PCM data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Time formatting helper

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
};

//  Main component

export const AudioTrimmer: React.FC<AudioTrimmerProps> = ({
  audioDataUrl,
  fileName,
  maxDuration = 15,
  onClipReady,
  onCancel,
}) => {
  // Audio state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(maxDuration);
  const [totalDuration, setTotalDuration] = useState(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);

  // Interaction state
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Step 1: Decode audio on mount

  useEffect(() => {
    let cancelled = false;

    const decodeAudio = async () => {
      try {
        const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;

        const ctx = new AudioCtxClass() as AudioContext;

        // Convert data URL to ArrayBuffer
        const response = await fetch(audioDataUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Decode audio data
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) { ctx.close(); return; }

        setAudioBuffer(buffer);
        setTotalDuration(buffer.duration);
        setTrimEnd(Math.min(maxDuration, buffer.duration));

        // Extract waveform data for visualization
        const channelData = buffer.getChannelData(0);
        const sampleCount = 300;
        const blockSize = Math.floor(channelData.length / sampleCount);
        const waveform: number[] = [];

        for (let i = 0; i < sampleCount; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j]);
          }
          waveform.push(sum / blockSize);
        }

        // Normalize to 0–1 range
        const peak = Math.max(...waveform) || 1;
        setWaveformData(waveform.map(v => v / peak));

        ctx.close();
      } catch (err) {
        console.error('[UpRight] Failed to decode audio:', err);
      }
    };

    decodeAudio();
    return () => { cancelled = true; };
  }, [audioDataUrl, maxDuration]);

  // Step 2: Canvas waveform rendering

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0 || totalDuration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const startFrac = trimStart / totalDuration;
    const endFrac = trimEnd / totalDuration;

    // Draw waveform bars
    waveformData.forEach((amplitude, i) => {
      const x = i * barWidth;
      const frac = i / waveformData.length;
      const isSelected = frac >= startFrac && frac <= endFrac;

      const barHeight = Math.max(2, amplitude * height * 0.85);
      const y = (height - barHeight) / 2;

      if (isSelected) {
        ctx.fillStyle = '#6366f1';
        ctx.globalAlpha = 0.9;
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.globalAlpha = 0.25;
      }

      const radius = Math.min(barWidth * 0.3, 2);
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, Math.max(barWidth - 1, 1), barHeight, radius);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw playhead line during preview
    if (isPlaying && playheadPosition > 0) {
      const px = playheadPosition * width;
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }, [waveformData, trimStart, trimEnd, totalDuration, isPlaying, playheadPosition]);

  // Step 3: Drag handle system

  const handlePointerDown = useCallback((handle: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = Math.round(fraction * totalDuration * 10) / 10;

    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(time, trimEnd - 0.5));
      if (trimEnd - newStart > maxDuration) {
        setTrimStart(trimEnd - maxDuration);
      } else {
        setTrimStart(newStart);
      }
    } else {
      const newEnd = Math.min(totalDuration, Math.max(time, trimStart + 0.5));
      if (newEnd - trimStart > maxDuration) {
        setTrimEnd(trimStart + maxDuration);
      } else {
        setTrimEnd(newEnd);
      }
    }
  }, [isDragging, totalDuration, trimStart, trimEnd, maxDuration]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Step 4: Preview playback

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    setPlayheadPosition(0);
  }, []);

  const handlePreview = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!audioBuffer) return;

    const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass() as AudioContext;
    audioCtxRef.current = ctx;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const clipDuration = trimEnd - trimStart;
    source.start(0, trimStart, clipDuration);
    sourceRef.current = source;
    setIsPlaying(true);

    // Animate playhead across the waveform
    const startTime = ctx.currentTime;
    const animate = () => {
      const elapsed = ctx.currentTime - startTime;
      const frac = (trimStart + elapsed) / totalDuration;
      setPlayheadPosition(Math.min(frac, trimEnd / totalDuration));

      if (elapsed < clipDuration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        stopPlayback();
      }
    };
    animationRef.current = requestAnimationFrame(animate);

    source.onended = () => {
      stopPlayback();
    };
  }, [audioBuffer, isPlaying, trimStart, trimEnd, totalDuration, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopPlayback(); };
  }, [stopPlayback]);

  // Step 5: Clip extraction via OfflineAudioContext

  const handleSaveClip = useCallback(async () => {
    if (!audioBuffer) return;
    setIsExtracting(true);

    try {
      const clipDuration = trimEnd - trimStart;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      const frameCount = Math.floor(clipDuration * sampleRate);
      const startFrame = Math.floor(trimStart * sampleRate);

      // Create an offline AudioContext for the clip duration
      const offlineCtx = new OfflineAudioContext(channels, frameCount, sampleRate);
      const clipBuffer = offlineCtx.createBuffer(channels, frameCount, sampleRate);

      // Copy sample data for each channel
      for (let ch = 0; ch < channels; ch++) {
        const sourceData = audioBuffer.getChannelData(ch);
        const clipData = clipBuffer.getChannelData(ch);
        for (let i = 0; i < frameCount; i++) {
          const srcIndex = startFrame + i;
          clipData[i] = srcIndex < sourceData.length ? sourceData[srcIndex] : 0;
        }
      }

      // Encode as WAV
      const wavBlob = audioBufferToWavBlob(clipBuffer);

      // Convert to data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read WAV blob'));
        reader.readAsDataURL(wavBlob);
      });

      onClipReady(dataUrl, clipDuration);
    } catch (err) {
      console.error('[UpRight] Failed to extract clip:', err);
    } finally {
      setIsExtracting(false);
    }
  }, [audioBuffer, trimStart, trimEnd, onClipReady]);

  // Render

  const clipDuration = trimEnd - trimStart;

  return (
    <div className="p-3 rounded-xl bg-inset border border-edge-subtle space-y-3">
      {/* Header with filename */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Music className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <p className="text-xs font-bold text-fg truncate">{fileName}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-tint-red text-fg-faint hover:text-red-500 transition-all shrink-0"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Waveform canvas with drag handles */}
      {waveformData.length > 0 ? (
        <div
          ref={containerRef}
          className="relative select-none touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-16 rounded-lg bg-inset border border-edge-subtle"
          />

          {/* Start handle */}
          <div
            className="absolute top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center z-10"
            style={{ left: `calc(${(trimStart / totalDuration) * 100}% - 8px)` }}
            onPointerDown={handlePointerDown('start')}
          >
            <div className="w-1.5 h-10 rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 border border-brand-400" />
          </div>

          {/* End handle */}
          <div
            className="absolute top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center z-10"
            style={{ left: `calc(${(trimEnd / totalDuration) * 100}% - 8px)` }}
            onPointerDown={handlePointerDown('end')}
          >
            <div className="w-1.5 h-10 rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 border border-brand-400" />
          </div>

          {/* Selection region overlay (subtle highlight between handles) */}
          <div
            className="absolute top-0 bottom-0 bg-brand-500/5 border-y border-brand-500/20 pointer-events-none"
            style={{
              left: `${(trimStart / totalDuration) * 100}%`,
              width: `${((trimEnd - trimStart) / totalDuration) * 100}%`,
            }}
          />
        </div>
      ) : (
        <div className="w-full h-16 rounded-lg bg-inset border border-edge-subtle flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-[10px] text-fg-faint">Decoding audio...</p>
          </div>
        </div>
      )}

      {/* Time display */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-mono font-bold text-fg-secondary">
          {formatTime(trimStart)} — {formatTime(trimEnd)}
        </span>
        <span className={cn(
          "font-bold",
          clipDuration > maxDuration ? "text-red-500" : "text-fg-faint"
        )}>
          {clipDuration.toFixed(1)}s / {maxDuration}s max
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={!audioBuffer}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold bg-inset border border-edge-subtle rounded-xl hover:bg-edge text-fg-secondary transition-all disabled:opacity-40"
        >
          {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isPlaying ? 'Stop' : 'Preview Clip'}
        </button>
        <button
          onClick={handleSaveClip}
          disabled={isExtracting || !audioBuffer}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-sm shadow-brand-500/20 disabled:opacity-50"
        >
          {isExtracting ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              Save Clip
            </>
          )}
        </button>
      </div>
    </div>
  );
};
