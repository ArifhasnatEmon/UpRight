import React, { useState, useRef, useCallback, useEffect } from 'react';
import { User as UserIcon, Zap, Lock, Trophy, LogOut, Edit2, Check, X, Star, Target, Flame, Camera } from 'lucide-react';
import { UserProfile, PostureLog, AppSettings } from '../types';
import { cn } from '../utils';

interface ProfileProps {
  user: UserProfile;
  logs: PostureLog[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLogout: () => void;
  onUpdateName?: (name: string) => void;
  currentUserEmail?: string | null;
}

export const Profile: React.FC<ProfileProps> = ({ user, logs, settings, setSettings, onLogout, onUpdateName, currentUserEmail }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(user.name);

  // Profile image state
  const avatarKey = currentUserEmail ? `upright_avatar_${currentUserEmail}` : 'upright_avatar_guest';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem(avatarKey));

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropSize = 200; // crop circle diameter in px

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImageSrc(ev.target?.result as string);
      setCropScale(1);
      setCropOffset({ x: 0, y: 0 });
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  // Draw canvas preview
  const drawCropCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cropSize;
    canvas.height = cropSize;
    ctx.clearRect(0, 0, cropSize, cropSize);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw image scaled and offset
    const scaledW = img.naturalWidth * cropScale;
    const scaledH = img.naturalHeight * cropScale;
    const x = (cropSize - scaledW) / 2 + cropOffset.x;
    const y = (cropSize - scaledH) / 2 + cropOffset.y;
    ctx.drawImage(img, x, y, scaledW, scaledH);
    ctx.restore();

    // Draw circle outline
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [cropScale, cropOffset]);

  useEffect(() => {
    if (showCropModal && rawImageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        // Auto-fit the image to fill the crop circle
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        const autoScale = cropSize / minDim;
        setCropScale(autoScale);
        setCropOffset({ x: 0, y: 0 });
      };
      img.src = rawImageSrc;
    }
  }, [showCropModal, rawImageSrc]);

  useEffect(() => {
    if (showCropModal) drawCropCanvas();
  }, [showCropModal, drawCropCanvas]);

  // Drag to move image inside crop circle
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Save cropped image
  const handleCropSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCropCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    localStorage.setItem(avatarKey, dataUrl);
    setAvatarUrl(dataUrl);
    setShowCropModal(false);
    setRawImageSrc(null);
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem(avatarKey);
    setAvatarUrl(null);
  };

  const avgScore = logs.length > 0 
    ? Math.round(logs.reduce((acc, log) => acc + log.score, 0) / logs.length)
    : null;

  const bestScore = logs.length > 0
    ? Math.max(...logs.map(l => l.score))
    : null;

  // কতদিন ধরে app use করছে (প্রথম log থেকে)
  const daysActive = logs.length > 0
    ? Math.max(1, Math.ceil((Date.now() - new Date(logs[logs.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSaveName = () => {
    if (editNameValue.trim() && editNameValue.trim() !== user.name) {
      onUpdateName?.(editNameValue.trim());
    }
    setIsEditingName(false);
  };

  const toggleAnonymousSharing = () => {
    setSettings(prev => ({ ...prev, anonymousDataSharing: !prev.anonymousDataSharing }));
  };

  const toggleLocalStorageOnly = () => {
    setSettings(prev => ({ ...prev, localStorageOnly: !prev.localStorageOnly }));
  };

  // All possible achievements — locked ones greyed out
  const ALL_ACHIEVEMENTS = [
    { id: 'first_log', title: 'First Step', description: 'Save your first posture log', icon: '🎯' },
    { id: 'perfect_10', title: 'Perfect Ten', description: '10 consecutive good posture logs', icon: '💎' },
    { id: 'century', title: 'Century', description: 'Save 100 total logs', icon: '🏆' },
    { id: 'hydrated', title: 'Hydration Hero', description: 'Reset water timer 5 times', icon: '💧' },
    { id: 'early_bird', title: 'Early Bird', description: 'Use the app before 8 AM', icon: '🌅' },
    { id: 'night_owl', title: 'Night Owl', description: 'Use the app after 10 PM', icon: '🦉' },
    { id: 'break_champion', title: 'Break Champion', description: 'Take 10 health breaks', icon: '🧘' },
    { id: 'streak_3', title: 'On a Roll', description: 'Use the app 3 days in a row', icon: '🔥' },
    { id: 'posture_pro', title: 'Posture Pro', description: 'Maintain average score above 85', icon: '⭐' },
    { id: 'eyes_saver', title: 'Eyes Saver', description: 'Complete 5 eye strain breaks', icon: '👁️' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass rounded-[2rem] p-8 flex flex-col items-center text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-brand-500/10" />
        <div className="relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Avatar circle */}
          <div className="w-24 h-24 rounded-full bg-brand-500 shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-display font-bold text-white">{initials || '?'}</span>
            )}
          </div>

          {/* Level badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
            <span className="text-xs font-bold text-white">{user.level}</span>
          </div>

          {/* Camera button — hover এ দেখায় */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -top-1 -left-1 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-md border border-neutral-200 hover:bg-brand-50 hover:border-brand-300 transition-all"
            title="Change profile photo"
          >
            <Camera className="w-3.5 h-3.5 text-neutral-600" />
          </button>
        </div>
        <div className="space-y-2 text-center">
          {isEditingName ? (
            <div className="flex items-center justify-center gap-2">
              <input
                autoFocus
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                className="text-xl font-display font-bold text-center bg-transparent border-b-2 border-brand-500 outline-none px-2 py-0.5 w-48"
              />
              <button onClick={handleSaveName} className="p-1 text-emerald-600 hover:text-emerald-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsEditingName(false); setEditNameValue(user.name); }} className="p-1 text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <h2 className="text-2xl font-display font-bold">{user.name}</h2>
              <button onClick={() => { setIsEditingName(true); setEditNameValue(user.name); }} className="absolute -right-7 top-1/2 -translate-y-1/2 p-1 text-neutral-300 hover:text-neutral-500 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Level {user.level} Posture Enthusiast</p>
        </div>
        <div className="flex gap-5 flex-wrap justify-center">
          {[
            { value: user.xp, label: 'Total XP', icon: <Zap className="w-3 h-3" /> },
            { value: `${user.achievements.length}/${ALL_ACHIEVEMENTS.length}`, label: 'Badges', icon: <Trophy className="w-3 h-3" /> },
            { value: avgScore !== null ? `${avgScore}%` : '—', label: 'Avg Score', icon: <Target className="w-3 h-3" /> },
            { value: bestScore !== null ? `${bestScore}%` : '—', label: 'Best Score', icon: <Star className="w-3 h-3" /> },
            { value: daysActive > 0 ? `${daysActive}d` : '—', label: 'Days Active', icon: <Flame className="w-3 h-3" /> },
          ].map((stat, i, arr) => (
            <React.Fragment key={stat.label}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-brand-500 mb-0.5">
                  {stat.icon}
                </div>
                <p className="text-lg font-display font-bold">{stat.value}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
              </div>
              {i < arr.length - 1 && <div className="h-8 w-px bg-neutral-100 self-center" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Weekly Summary Card */}
        <div className="glass rounded-[2rem] p-6 space-y-4">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-600" /> This Week
          </h3>
          <div className="space-y-3">
            {(() => {
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - 7);
              const weekLogs = logs.filter(l => new Date(l.timestamp) >= weekStart);
              const weekAvg = weekLogs.length > 0
                ? Math.round(weekLogs.reduce((s, l) => s + l.score, 0) / weekLogs.length)
                : null;
              const goodCount = weekLogs.filter(l => l.score >= 80).length;
              return (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-xs font-medium text-neutral-600">Weekly Avg</span>
                    <span className={cn("text-sm font-bold",
                      weekAvg === null ? "text-neutral-400"
                      : weekAvg >= 80 ? "text-emerald-600"
                      : weekAvg >= 60 ? "text-amber-600"
                      : "text-red-600"
                    )}>{weekAvg !== null ? `${weekAvg}%` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-xs font-medium text-neutral-600">Good Posture Logs</span>
                    <span className="text-sm font-bold text-emerald-600">{goodCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-xs font-medium text-neutral-600">Total Logs</span>
                    <span className="text-sm font-bold">{weekLogs.length}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Privacy Card */}
        <div className="glass rounded-[2rem] p-6 space-y-4">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600" /> Privacy
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-xs">Anonymous Sharing</p>
                <p className="text-[10px] text-neutral-400">Help improve AI models</p>
              </div>
              <button 
                onClick={toggleAnonymousSharing}
                className={cn("w-8 h-4 rounded-full relative transition-colors", settings.anonymousDataSharing ? "bg-brand-500" : "bg-neutral-200")}
              >
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", settings.anonymousDataSharing ? "right-0.5" : "left-0.5")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-xs">Local Only Mode</p>
                <p className="text-[10px] text-neutral-400">Disable all cloud features</p>
              </div>
              <button 
                onClick={toggleLocalStorageOnly}
                className={cn("w-8 h-4 rounded-full relative transition-colors", settings.localStorageOnly ? "bg-brand-500" : "bg-neutral-200")}
              >
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", settings.localStorageOnly ? "right-0.5" : "left-0.5")} />
              </button>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] text-emerald-700 leading-relaxed">
              🔒 All AI processing runs locally. No video ever leaves your device.
            </p>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="glass rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">Achievements</h3>
          <span className="text-xs font-bold text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">
            {user.achievements.length} / {ALL_ACHIEVEMENTS.length} Unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ALL_ACHIEVEMENTS.map(def => {
            const unlocked = user.achievements.find(a => a.id === def.id);
            return (
              <div
                key={def.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                  unlocked
                    ? "bg-brand-50 border-brand-100"
                    : "bg-neutral-50 border-neutral-100 opacity-50 grayscale"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
                  unlocked ? "bg-white shadow-sm" : "bg-neutral-100"
                )}>
                  {unlocked ? def.icon : '🔒'}
                </div>
                <div className="min-w-0">
                  <p className={cn("font-bold text-sm truncate", unlocked ? "text-neutral-900" : "text-neutral-400")}>
                    {def.title}
                  </p>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">{def.description}</p>
                  {unlocked?.unlockedAt && (
                    <p className="text-[9px] text-brand-400 mt-1 font-medium">
                      ✓ {new Date(unlocked.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Crop Modal ── */}
      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-[10100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Crop Photo</h3>
              <button
                onClick={() => { setShowCropModal(false); setRawImageSrc(null); }}
                className="p-2 rounded-xl hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Canvas crop area */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="rounded-full overflow-hidden cursor-grab active:cursor-grabbing border-4 border-brand-200 shadow-xl"
                style={{ width: cropSize, height: cropSize }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={e => {
                  e.preventDefault();
                  setCropScale(prev => Math.min(3, Math.max(0.5, prev - e.deltaY * 0.001)));
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={cropSize}
                  height={cropSize}
                  style={{ display: 'block' }}
                />
              </div>
              <p className="text-[10px] text-neutral-400 text-center">Drag to reposition • Scroll to zoom</p>

              {/* Zoom slider */}
              <div className="w-full space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Zoom</span>
                  <span className="text-[10px] text-neutral-400">{Math.round(cropScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.05}
                  value={cropScale}
                  onChange={e => {
                    setCropScale(parseFloat(e.target.value));
                  }}
                  className="w-full accent-brand-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              {avatarUrl && (
                <button
                  onClick={() => { handleRemoveAvatar(); setShowCropModal(false); setRawImageSrc(null); }}
                  className="flex-1 py-3 text-sm font-bold text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                >
                  Remove Photo
                </button>
              )}
              <button
                onClick={handleCropSave}
                className="flex-1 py-3 text-sm font-bold text-white bg-brand-500 rounded-2xl hover:bg-brand-600 transition-all"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-neutral-100 flex justify-center">
        <button 
          onClick={onLogout}
          className="px-6 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center gap-2 group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
