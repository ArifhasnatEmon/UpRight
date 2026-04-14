import React, { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line } from 'recharts';
import { format, subDays, addDays, isAfter, startOfDay, isSameDay } from 'date-fns';
import { PostureLog, UserProfile, Session, BreakLog } from '../types';
import { Zap, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '../utils';
import { getAnalyticsInsight } from '../lib/gemini';

interface AnalyticsProps {
  logs: PostureLog[];
  user: UserProfile;
  sessions?: Session[];
  breakLogs?: BreakLog[];
}

// Analytics component
export const Analytics: React.FC<AnalyticsProps> = ({ logs, user, sessions = [], breakLogs = [] }) => {
  const [filter, setFilter] = useState<'Daily' | 'Week' | 'Month'>('Daily');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Deferred rendering — let the page shell paint first, then render heavy charts
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setChartsReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    const ref = selectedDate;
    if (filter === 'Daily') {
      const dayStart = new Date(ref);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(ref);
      dayEnd.setHours(23, 59, 59, 999);
      return logs.filter(log => {
        const t = new Date(log.timestamp);
        return t >= dayStart && t <= dayEnd;
      });
    }
    const days = filter === 'Week' ? 6 : 29;
    const rangeStart = subDays(ref, days);
    return logs.filter(log => {
      const t = new Date(log.timestamp);
      return t >= rangeStart && t <= ref;
    });
  }, [logs, filter, selectedDate]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const ref = selectedDate;
    if (filter === 'Daily') {
      const dayStart = new Date(ref);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(ref);
      dayEnd.setHours(23, 59, 59, 999);
      return sessions.filter(s => {
        const t = new Date(s.startTime);
        return t >= dayStart && t <= dayEnd;
      });
    }
    const days = filter === 'Week' ? 6 : 29;
    const rangeStart = subDays(ref, days);
    return sessions.filter(s => {
      const t = new Date(s.startTime);
      return t >= rangeStart && t <= ref;
    });
  }, [sessions, filter, selectedDate]);

  // Aggregate logs
  const aggregatedData = useMemo(() => {
    const refDate = selectedDate;

    if (filter === 'Daily') {
      return Array.from({ length: 24 }, (_, hour) => {
        const hourLogs = logs.filter(l => {
          const t = new Date(l.timestamp);
          return (
            t.getFullYear() === refDate.getFullYear() &&
            t.getMonth() === refDate.getMonth() &&
            t.getDate() === refDate.getDate() &&
            t.getHours() === hour
          );
        });
        const label = hour === 0 ? '12am'
          : hour < 12 ? `${hour}am`
            : hour === 12 ? '12pm'
              : `${hour - 12}pm`;
        return {
          label,
          score: hourLogs.length > 0
            ? Math.round(hourLogs.reduce((s, l) => s + l.score, 0) / hourLogs.length)
            : null,
          count: hourLogs.length,
        };
      });
    }

    if (filter === 'Week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(refDate);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().split('T')[0];
        const dayLogs = logs.filter(l => l.timestamp.startsWith(dayStr));
        return {
          label: d.toLocaleDateString('en', { weekday: 'short' }),
          score: dayLogs.length > 0
            ? Math.round(dayLogs.reduce((s, l) => s + l.score, 0) / dayLogs.length)
            : null,
          count: dayLogs.length,
        };
      });
    }

    if (filter === 'Month') {
      return Array.from({ length: 6 }, (_, i) => {
        const endDay = new Date(refDate);
        endDay.setDate(endDay.getDate() - i * 5);
        const startDay = new Date(endDay);
        startDay.setDate(startDay.getDate() - 4);
        const groupLogs = logs.filter(l => {
          const t = new Date(l.timestamp);
          return t >= startDay && t <= endDay;
        });
        return {
          label: startDay.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          score: groupLogs.length > 0
            ? Math.round(groupLogs.reduce((s, l) => s + l.score, 0) / groupLogs.length)
            : null,
          count: groupLogs.length,
        };
      }).reverse();
    }

    return [];
  }, [logs, filter, selectedDate]);

  // State distribution
  const STATE_LABELS: Record<string, string> = { good: 'Good', warning: 'Warning', critical: 'Critical', too_close: 'Too Close' };
  const stateDistribution = useMemo(() => {
    const counts = filteredLogs.reduce((acc, log) => {
      if (log.state === 'disabled') return acc;
      acc[log.state] = (acc[log.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name: STATE_LABELS[name] || name, value }));
  }, [filteredLogs]);

  // Chart colors
  const COLORS: Record<string, string> = { Good: '#10b981', Warning: '#f59e0b', Critical: '#ef4444', 'Too Close': '#6366f1' };

  // Local insights
  const insights = useMemo(() => {
    if (filteredLogs.length === 0) return "No data yet. Start monitoring to see personalized insights.";

    const avgScore = filteredLogs.reduce((sum, log) => sum + log.score, 0) / filteredLogs.length;
    const criticalCount = filteredLogs.filter(l => l.state === 'critical').length;
    const tooCloseCount = filteredLogs.filter(l => l.state === 'too_close').length;
    const criticalPercent = Math.round((criticalCount / filteredLogs.length) * 100);
    const tooClosePercent = Math.round((tooCloseCount / filteredLogs.length) * 100);

    const hourCounts: Record<number, number[]> = {};
    filteredLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (!hourCounts[hour]) hourCounts[hour] = [];
      hourCounts[hour].push(log.score);
    });
    const worstHour = Object.entries(hourCounts)
      .map(([h, scores]) => ({ hour: parseInt(h), avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => a.avg - b.avg)[0];

    const parts: string[] = [];
    if (avgScore > 85) parts.push("Your posture has been excellent this period.");
    else if (avgScore > 65) parts.push("Your posture is generally good but has room for improvement.");
    else parts.push("Your posture needs significant attention.");

    if (tooClosePercent > 20) parts.push(`You're sitting too close to the screen ${tooClosePercent}% of the time — move back at least 50cm.`);
    if (criticalPercent > 30) parts.push(`Critical slouching detected in ${criticalPercent}% of logs — consider a lumbar support cushion.`);
    if (worstHour && worstHour.avg < 70) {
      const timeStr = `${worstHour.hour}:00–${worstHour.hour + 1}:00`;
      parts.push(`Your worst posture is around ${timeStr}. Take a break or adjust your setup then.`);
    }

    return parts.join(' ');
  }, [filteredLogs]);

  // AI insights (deferred until charts are ready)
  useEffect(() => {
    if (!chartsReady) return;
    if (filteredLogs.length === 0) {
      setAiInsight('');
      return;
    }
    const avgScore = Math.round(filteredLogs.reduce((sum, log) => sum + log.score, 0) / filteredLogs.length);
    const criticalCount = filteredLogs.filter(l => l.state === 'critical').length;
    const tooCloseCount = filteredLogs.filter(l => l.state === 'too_close').length;
    const criticalPercent = Math.round((criticalCount / filteredLogs.length) * 100);
    const tooClosePercent = Math.round((tooCloseCount / filteredLogs.length) * 100);
    const hourCounts: Record<number, number[]> = {};
    filteredLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (!hourCounts[hour]) hourCounts[hour] = [];
      hourCounts[hour].push(log.score);
    });
    const worstHourEntry = Object.entries(hourCounts)
      .map(([h, scores]) => ({ hour: parseInt(h), avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => a.avg - b.avg)[0];
    const worstHour = worstHourEntry ? worstHourEntry.hour : null;

    setIsLoadingInsight(true);
    getAnalyticsInsight(avgScore, criticalPercent, tooClosePercent, worstHour)
      .then(result => {
        setAiInsight(result);
      })
      .finally(() => setIsLoadingInsight(false));
  }, [filteredLogs, filter, chartsReady]);

  // Theme colors
  const chartGrid = 'var(--edge)';
  const chartAxis = 'var(--fg-faint)';

  return (
    <div className="space-y-8 pb-12" role="region" aria-label="Health analytics">
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-fg">Health Analytics</h2>
          <p className="text-fg-muted">Deep dive into your ergonomic performance</p>
        </div>

        <div className="flex items-center justify-between">
          {/* Date navigator */}
          {(() => {
            const today = startOfDay(new Date());
            const isToday = isSameDay(selectedDate, today);
            const step = filter === 'Daily' ? 1 : filter === 'Week' ? 7 : 30;
            const canGoForward = !isToday;

            const dateLabel = filter === 'Daily'
              ? (isToday ? "Today" : format(selectedDate, 'EEE, MMM d'))
              : filter === 'Week'
                ? `${format(subDays(selectedDate, 6), 'MMM d')} – ${format(selectedDate, 'MMM d')}`
                : `${format(subDays(selectedDate, 29), 'MMM d')} – ${format(selectedDate, 'MMM d')}`;

            return (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedDate(prev => startOfDay(subDays(prev, step)))}
                  className="p-1.5 rounded-lg hover:bg-inset border border-edge-subtle text-fg-muted hover:text-fg transition-colors"
                  aria-label={`Go to previous ${filter === 'Daily' ? 'day' : filter === 'Week' ? 'week' : 'month'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 px-4 py-2 bg-card border border-edge rounded-xl min-w-[160px] justify-center">
                  <Calendar className="w-3.5 h-3.5 text-fg-faint" />
                  <span className="text-sm font-bold text-fg">{dateLabel}</span>
                </div>

                <button
                  onClick={() => {
                    if (canGoForward) {
                      const next = startOfDay(addDays(selectedDate, step));
                      setSelectedDate(next > today ? today : next);
                    }
                  }}
                  disabled={!canGoForward}
                  className={cn(
                    "p-1.5 rounded-lg border border-edge-subtle transition-colors",
                    canGoForward
                      ? "hover:bg-inset text-fg-muted hover:text-fg"
                      : "text-fg-faint/30 cursor-not-allowed"
                  )}
                  aria-label={`Go to next ${filter === 'Daily' ? 'day' : filter === 'Week' ? 'week' : 'month'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(today)}
                    className="px-3 py-1.5 rounded-lg bg-tint-brand text-brand-700 dark:text-brand-400 text-[10px] font-bold uppercase tracking-wider hover:bg-tint-brand-strong transition-colors ml-1"
                  >
                    Today
                  </button>
                )}
              </div>
            );
          })()}

          {/* Period filter */}
          <div className="flex gap-1 p-1 bg-card border border-edge rounded-2xl">
            {(['Daily', 'Week', 'Month'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setFilter(p); setSelectedDate(startOfDay(new Date())); }}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", filter === p ? "bg-tint-brand text-brand-700 dark:text-brand-400" : "hover:bg-inset text-fg-muted")}
                aria-pressed={filter === p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 space-y-6" role="region" aria-label="Posture score trend chart">
          <h3 className="font-display font-bold text-lg text-fg">
            {filter === 'Daily'
              ? (isSameDay(selectedDate, startOfDay(new Date())) ? "Today's Trend" : `${format(selectedDate, 'MMM d')} Trend`)
              : filter === 'Week' ? '7-Day Trend'
                : '30-Day Trend'}
          </h3>

          {/* Summary stats */}
          {(() => {
            const validData = aggregatedData.filter(d => d.score !== null);
            const avgScore = validData.length > 0
              ? Math.round(validData.reduce((s, d) => s + (d.score ?? 0), 0) / validData.length)
              : null;
            const totalLogs = validData.reduce((s, d) => s + d.count, 0);
            const bestHour = validData.length > 0
              ? validData.reduce((best, d) => (d.score ?? 0) > (best.score ?? 0) ? d : best)
              : null;
            return avgScore !== null ? (
              <div className="flex gap-4">
                <div className="flex-1 px-4 py-3 rounded-xl bg-inset border border-edge-subtle">
                  <p className="text-[9px] font-bold text-fg-faint uppercase tracking-wider">Avg Score</p>
                  <p className="text-lg font-bold text-fg">{avgScore}%</p>
                </div>
                <div className="flex-1 px-4 py-3 rounded-xl bg-inset border border-edge-subtle">
                  <p className="text-[9px] font-bold text-fg-faint uppercase tracking-wider">Total Logs</p>
                  <p className="text-lg font-bold text-fg">{totalLogs}</p>
                </div>
                {bestHour && (
                  <div className="flex-1 px-4 py-3 rounded-xl bg-tint-emerald border border-emerald-100 dark:border-emerald-500/20">
                    <p className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Best Period</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{bestHour.label}</p>
                  </div>
                )}
              </div>
            ) : null;
          })()}

          <div className="h-[420px] w-full">
            {!chartsReady ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
              </div>
            ) : aggregatedData.every(d => d.score === null) ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-fg-faint">
                <div className="w-16 h-16 rounded-2xl bg-inset flex items-center justify-center text-3xl">📊</div>
                <p className="text-sm font-medium">No posture data for this period</p>
                <p className="text-xs text-fg-faint">Start monitoring to see your trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData} margin={{ top: 10, right: 20, left: 25, bottom: filter === 'Daily' ? 40 : 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: chartAxis }}
                    interval={0}
                    angle={filter === 'Daily' ? -45 : 0}
                    textAnchor={filter === 'Daily' ? 'end' : 'middle'}
                    height={filter === 'Daily' ? 50 : 30}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--edge)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '12px', background: 'var(--surface-card)', color: 'var(--fg)' }}
                    itemStyle={{ color: 'var(--fg-secondary)' }}
                    formatter={(val: any, _: any, props: any) => [
                      val !== null ? `${val}% avg` : 'No data',
                      `(${props.payload?.count || 0} logs)`
                    ]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4, color: 'var(--fg)' }}
                    cursor={{ fill: 'var(--surface-inset)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={4}
                    connectNulls={true}
                    dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: 'var(--surface-card)' }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-6 space-y-4 flex flex-col overflow-hidden" role="region" aria-label="Posture state distribution">
          <h3 className="font-display font-bold text-lg text-fg">State Distribution</h3>
          <div className="flex-1 min-h-[320px] w-full">
            {!chartsReady ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
              </div>
            ) : stateDistribution.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-fg-faint">
                <div className="w-16 h-16 rounded-2xl bg-inset flex items-center justify-center text-3xl">🎯</div>
                <p className="text-sm font-medium">No state data yet</p>
              </div>
            ) : (() => {
              const total = stateDistribution.reduce((s, d) => s + d.value, 0);
              const sortedDist = [...stateDistribution].sort((a, b) => b.value - a.value);
              const dominant = sortedDist[0];
              const dominantPct = total > 0 ? Math.round((dominant.value / total) * 100) : 0;

              // Build SVG donut segments
              let cumulativeAngle = -90; // start from top
              const segments = sortedDist.map(item => {
                const pct = total > 0 ? (item.value / total) : 0;
                const angle = pct * 360;
                const startAngle = cumulativeAngle;
                cumulativeAngle += angle;
                return { ...item, pct, startAngle, angle };
              });

              const polarToCartesian = (cx: number, cy: number, r: number, deg: number) => {
                const rad = (deg * Math.PI) / 180;
                return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
              };

              const describeArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
                const start = polarToCartesian(cx, cy, r, endDeg);
                const end = polarToCartesian(cx, cy, r, startDeg);
                const largeArc = endDeg - startDeg > 180 ? 1 : 0;
                return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
              };

              return (
                <div className="h-full flex flex-col items-center justify-center gap-5">
                  {/* Animated donut ring with center stat */}
                  <div className="relative w-[160px] h-[160px]">
                    <svg viewBox="0 0 120 120" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
                      {/* Background ring */}
                      <circle cx="60" cy="60" r="46" fill="none" stroke="var(--edge)" strokeWidth="10" opacity="0.3" />
                      {/* Animated segments */}
                      {segments.map((seg, i) => {
                        const endAngle = seg.startAngle + Math.max(seg.angle - 2, 0); // gap between segments
                        if (seg.angle < 1) return null;
                        return (
                          <path
                            key={seg.name}
                            d={describeArc(60, 60, 46, seg.startAngle, endAngle)}
                            fill="none"
                            stroke={COLORS[seg.name] || '#94a3b8'}
                            strokeWidth="10"
                            strokeLinecap="round"
                            style={{
                              animation: `dist-draw 1s ease-out ${i * 0.15}s both`,
                              filter: `drop-shadow(0 0 6px ${COLORS[seg.name] || '#94a3b8'}40)`,
                            }}
                          />
                        );
                      })}
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ animation: 'dist-fade 0.8s ease-out 0.3s both' }}>
                      <span className="text-3xl font-display font-black text-fg leading-none">{dominantPct}%</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: COLORS[dominant.name] || 'var(--fg-muted)' }}>
                        {dominant.name}
                      </span>
                    </div>
                  </div>

                  {/* Animated percentage bars */}
                  <div className="w-full space-y-2.5 px-1">
                    {sortedDist.map((item, i) => {
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      const color = COLORS[item.name] || '#94a3b8';
                      return (
                        <div key={item.name} className="group cursor-default" style={{ animation: `dist-slide ${0.5}s ease-out ${0.3 + i * 0.1}s both` }}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shadow-sm transition-transform group-hover:scale-125" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}50` }} />
                              <span className="text-xs font-bold text-fg-secondary group-hover:text-fg transition-colors">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity">{item.value} logs</span>
                              <span className="text-xs font-black tabular-nums" style={{ color }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-inset rounded-full overflow-hidden border border-edge-subtle">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                                boxShadow: `0 0 12px ${color}30`,
                                animation: `dist-bar 1s ease-out ${0.4 + i * 0.12}s both`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] p-8 flex items-start gap-6" role="region" aria-label="Actionable insight">
        <div className="p-4 bg-tint-brand-strong rounded-full shrink-0">
          <Zap className="w-8 h-8 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-lg text-fg">Actionable Insight</h3>
            {aiInsight && (
              <span className="text-[9px] font-bold text-brand-400 bg-tint-brand px-2 py-0.5 rounded-full uppercase tracking-wider">✦ AI</span>
            )}
          </div>
          {isLoadingInsight ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
              <p className="text-fg-faint text-sm">Generating AI insight...</p>
            </div>
          ) : (
            <p className="text-fg-secondary text-sm leading-relaxed mt-1">
              {aiInsight || insights}
            </p>
          )}
        </div>
      </div>

      {/* Posture history */}
      <div className="glass rounded-[2.5rem] p-8 space-y-6" role="region" aria-label="Posture history bar chart">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-fg">Posture History</h3>
          <div className="text-xs font-medium text-fg-muted px-3 py-1 bg-inset rounded-lg border border-edge-subtle">
            Past 14 Days
          </div>
        </div>
        <div className="h-[250px] w-full">
          {!chartsReady ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-transparent animate-spin" />
            </div>
          ) : (() => {
            const today = new Date();
            const daysData: { date: string; score: number | null; count: number }[] = [];
            for (let i = 13; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              const dayStr = d.toISOString().split('T')[0];
              const dayLogs = logs.filter(l => l.timestamp.startsWith(dayStr));
              const avg = dayLogs.length > 0
                ? Math.round(dayLogs.reduce((s, l) => s + l.score, 0) / dayLogs.length)
                : null;
              daysData.push({
                date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                score: avg,
                count: dayLogs.length
              });
            }

            if (daysData.every(d => d.score === null)) {
              return (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-fg-faint">
                  <div className="w-16 h-16 rounded-2xl bg-inset flex items-center justify-center text-3xl">📅</div>
                  <p className="text-sm font-medium">No posture data for the past 14 days</p>
                </div>
              );
            }

            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daysData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: chartAxis }}
                  />
                  <YAxis
                    hide
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--edge)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '12px', background: 'var(--surface-card)', color: 'var(--fg)' }}
                    itemStyle={{ color: 'var(--fg-secondary)' }}
                    formatter={(val: any, _: any, props: any) => [
                      val !== null ? `${val}% avg` : 'No data',
                      `(${props.payload?.count || 0} logs)`
                    ]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4, color: 'var(--fg)' }}
                    cursor={{ fill: 'var(--surface-inset)' }}
                  />
                  <Bar
                    dataKey="score"
                    radius={[6, 6, 6, 6]}
                    barSize={24}
                  >
                    {daysData.map((entry, index) => {
                      const color = entry.score === null ? 'var(--surface-inset)'
                        : entry.score >= 80 ? '#22c55e'
                          : entry.score >= 60 ? '#f59e0b'
                            : '#ef4444';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Session Summary */}
      <div className="glass rounded-[2.5rem] p-8 space-y-4" role="region" aria-label="Recent monitoring sessions">
        <h3 className="font-display font-bold text-lg text-fg">Recent Sessions</h3>
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-fg-faint">
            <div className="w-12 h-12 rounded-xl bg-inset flex items-center justify-center text-2xl border border-edge-subtle shadow-sm">🕒</div>
            <p className="text-sm font-medium text-fg-muted mt-2">No recorded sessions yet</p>
            <p className="text-xs text-fg-faint">Sessions appear here after monitoring</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            {filteredSessions.slice(0, 10).map(session => (
              <div key={session.id} className="flex items-center justify-between p-3.5 rounded-xl bg-inset border border-edge-subtle transition-colors hover:bg-card shadow-sm hover:shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-fg tracking-tight">
                      {format(new Date(session.startTime), 'MMM d, h:mm a')}
                    </p>
                    {!session.endTime && (
                      <span className="px-2 py-0.5 rounded-md bg-tint-blue text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-[ping_2s_ease-in-out_infinite]" />
                        Active Now
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-fg-muted mt-0.5">
                    {session.endTime ? `${session.duration} min session` : 'Monitoring in progress...'}
                  </p>
                </div>
                {session.endTime ? (
                  <div className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm",
                    session.avgScore >= 80 ? "bg-tint-emerald text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20" :
                      session.avgScore >= 60 ? "bg-tint-amber text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" :
                        "bg-tint-red text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                  )}>
                    {session.avgScore}% avg
                  </div>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-inset text-fg-faint border border-edge-subtle">
                    --
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            const weekLogs = logs.filter(l => isAfter(new Date(l.timestamp), subDays(new Date(), 7)));
            const avgScore = weekLogs.length > 0
              ? Math.round(weekLogs.reduce((s, l) => s + l.score, 0) / weekLogs.length)
              : 0;
            const totalSessions = sessions.filter(s => s.endTime && isAfter(new Date(s.startTime), subDays(new Date(), 7))).length;
            const totalMinutes = sessions
              .filter(s => s.endTime && isAfter(new Date(s.startTime), subDays(new Date(), 7)))
              .reduce((s, ses) => s + ses.duration, 0);
            const goodCount = weekLogs.filter(l => l.state === 'good' || l.score >= 80).length;
            const goodPercent = weekLogs.length > 0 ? Math.round((goodCount / weekLogs.length) * 100) : 0;

            const scoreColor = avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#f59e0b' : '#ef4444';

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>UpRight Weekly Report — ${format(new Date(), 'MMM d, yyyy')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f8f8; color: #111; padding: 40px 20px; }
  .container { max-width: 680px; margin: 0 auto; }
  .header { background: #111; color: white; border-radius: 20px; padding: 36px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 28px; font-weight: 700; }
  .header p { color: #888; font-size: 14px; margin-top: 4px; }
  .score-badge { font-size: 48px; font-weight: 800; color: ${scoreColor}; }
  .score-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; text-align: right; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #eee; }
  .card-value { font-size: 32px; font-weight: 700; color: #111; }
  .card-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
  .section { background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #eee; }
  .section h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .bar-label { font-size: 12px; color: #666; width: 60px; }
  .bar-bg { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-val { font-size: 12px; font-weight: 600; width: 36px; text-align: right; }
  .achievement { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f8f8; border-radius: 10px; margin-bottom: 8px; }
  .ach-icon { font-size: 24px; }
  .ach-title { font-size: 13px; font-weight: 600; }
  .ach-desc { font-size: 11px; color: #888; }
  .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 32px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <h1>Weekly Report</h1>
      <p>${format(subDays(new Date(), 7), 'MMM d')} – ${format(new Date(), 'MMM d, yyyy')} · ${user.name}</p>
    </div>
    <div style="text-align: right;">
      <div class="score-badge">${avgScore}</div>
      <div class="score-label">Avg Score</div>
    </div>
  </div>
  <div class="cards">
    <div class="card">
      <div class="card-value">${totalSessions}</div>
      <div class="card-label">Sessions</div>
    </div>
    <div class="card">
      <div class="card-value">${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m</div>
      <div class="card-label">Monitored</div>
    </div>
    <div class="card">
      <div class="card-value" style="color: #22c55e;">${goodPercent}%</div>
      <div class="card-label">Good Posture</div>
    </div>
  </div>
  <div class="section">
    <h3>Posture Breakdown</h3>
    ${['good', 'warning', 'critical', 'too_close'].map(state => {
              const count = weekLogs.filter(l => l.state === state).length;
              const pct = weekLogs.length > 0 ? Math.round((count / weekLogs.length) * 100) : 0;
              const colors = { good: '#22c55e', warning: '#f59e0b', critical: '#ef4444', too_close: '#6366f1' };
              const labels = { good: 'Good', warning: 'Warning', critical: 'Critical', too_close: 'Too Close' };
              return `<div class="bar-row">
        <div class="bar-label">${labels[state as keyof typeof labels]}</div>
        <div class="bar-bg"><div class="bar-fill" style="width: ${pct}%; background: ${colors[state as keyof typeof colors]};"></div></div>
        <div class="bar-val">${pct}%</div>
      </div>`;
            }).join('')}
  </div>
  ${user.achievements.length > 0 ? `<div class="section">
    <h3>Achievements (${user.achievements.length} total)</h3>
    ${user.achievements.slice(0, 5).map(a => `<div class="achievement">
      <div class="ach-icon">${a.icon}</div>
      <div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.description}</div></div>
    </div>`).join('')}
  </div>` : ''}
  <div class="footer">Generated by UpRight · ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
</div>
</body>
</html>`;

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `upright-weekly-${format(new Date(), 'yyyy-MM-dd')}.html`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all flex items-center gap-2"
          aria-label="Download weekly report as HTML file"
        >
          📊 Weekly Report (HTML)
        </button>

        <button
          onClick={() => {
            const exportData = {
              exportedAt: new Date().toISOString(),
              user: { name: user.name, level: user.level, xp: user.xp },
              totalLogs: logs.length,
              sessions: sessions.filter(s => s.endTime),
              breakLogs: breakLogs,
              recentLogs: logs.slice(0, 100),
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `upright-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-5 py-2.5 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2"
          aria-label="Export data as JSON file"
        >
          ⬇ Export Data (JSON)
        </button>
      </div>
    </div>
  );
};
