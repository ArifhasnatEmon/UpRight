import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../utils';

type TabId = 'dashboard' | 'analytics' | 'settings' | 'profile';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  dailyTip: string;
}

const NAV_ITEMS: { id: TabId; icon: typeof Activity; label: string }[] = [
  { id: 'dashboard', icon: Activity, label: 'Dashboard' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'profile', icon: UserIcon, label: 'Profile' },
  { id: 'settings', icon: SettingsIcon, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, dailyTip }) => {
  return (
    <nav className="w-72 bg-white border-r border-neutral-200 flex flex-col p-6 gap-3 shrink-0 overflow-hidden">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={cn(
            "flex items-center gap-4 p-4 rounded-[1.5rem] transition-all group relative",
            activeTab === item.id
              ? "bg-brand-50 text-brand-700 shadow-sm"
              : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
          )}
        >
          {activeTab === item.id && (
            <motion.div
              layoutId="activeNav"
              className="absolute left-0 w-1 h-8 bg-brand-500 rounded-r-full"
            />
          )}
          <item.icon className={cn("w-6 h-6", activeTab === item.id ? "text-brand-600" : "text-neutral-400 group-hover:text-neutral-600")} />
          <span className="block font-bold text-sm tracking-tight">{item.label}</span>
        </button>
      ))}

      <div className="mt-auto p-6 bg-neutral-900 rounded-[2rem] block relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.2em]">Daily Tip</p>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-medium">
            {dailyTip}
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
          <Shield className="w-24 h-24 text-white" />
        </div>
      </div>
    </nav>
  );
};
