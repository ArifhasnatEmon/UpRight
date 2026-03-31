import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { PostureLog, UserProfile, Session, BreakLog } from '../types';
import { Zap } from 'lucide-react';
import { cn } from '../utils';

interface AnalyticsProps {
  logs: PostureLog[];
  user: UserProfile;
  sessions?: Session[];
  breakLogs?: BreakLog[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ logs, user, sessions = [], breakLogs = [] }) => {
  const [filter, setFilter] = useState<'Daily' | 'Week' | 'Month' | 'Year'>('Week');

  // Filter logs based on selected time range
  const filteredLogs = useMemo(() => {
    const now = new Date();
    if (filter === 'Daily') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return logs.filter(log => new Date(log.timestamp) >= startOfDay);
    }
    const days = filter === 'Week' ? 7 : filter === 'Month' ? 30 : 365;
    return logs.filter(log => isAfter(new Date(log.timestamp), subDays(now, days)));
  }, [logs, filter]);

  // Filter sessions based on selected time range
  const filteredSessions = useMemo(() => {
    const now = new Date();
    if (filter === 'Daily') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return sessions.filter(s => new Date(s.startTime) >= startOfDay);
    }
    const days = filter === 'Week' ? 7 : filter === 'Month' ? 30 : 365;
    return sessions.filter(session => isAfter(new Date(session.startTime), subDays(now, days)));
  }, [sessions, filter]);

  // Aggregate log data for chart visualization based on filter
  const aggregatedData = useMemo(() => {
    const now = new Date();

    if (filter === 'Daily') {
      return Array.from({ length: 24 }, (_, hour) => {
        const hourLogs = logs.filter(l => {
          const t = new Date(l.timestamp);
          const today = new Date(now);
          return (
            t.getFullYear() === today.getFullYear() &&
            t.getMonth() === today.getMonth() &&
            t.getDate() === today.getDate() &&
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
        const d = new Date(now);
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
        const endDay = new Date(now);
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

    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      const monthLogs = logs.filter(l => {
        const t = new Date(l.timestamp);
        return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth();
      });
      return {
        label: d.toLocaleDateString('en', { month: 'short' }),
        score: monthLogs.length > 0
          ? Math.round(monthLogs.reduce((s, l) => s + l.score, 0) / monthLogs.length)
          : null,
        count: monthLogs.length,
      };
    });
  }, [logs, filter]);

  // Calculate distribution of posture states
  const stateDistribution = useMemo(() => {
    const counts = filteredLogs.reduce((acc, log) => {
      acc[log.state] = (acc[log.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  // Colors for posture states in charts
  const COLORS = { good: '#10b981', warning: '#f59e0b', critical: '#ef4444', too_close: '#6366f1' };

  // Generate local insights based on filtered logs
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

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold">Health Analytics</h2>
          <p className="text-neutral-500">Deep dive into your ergonomic performance</p>
        </div>
        <div className="flex gap-1 p-1 bg-white border border-neutral-200 rounded-2xl">
          {(['Daily', 'Week', 'Month', 'Year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", filter === p ? "bg-brand-50 text-brand-700" : "hover:bg-neutral-50 text-neutral-500")}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 glass rounded-[2.5rem] p-8 space-y-8">
          <h3 className="font-display font-bold text-lg">
            {filter === 'Daily' ? "Today's Hourly Breakdown"
              : filter === 'Week' ? 'Daily Average (7 days)'
                : filter === 'Month' ? 'Weekly Average (30 days)'
                  : 'Monthly Average (12 months)'}
          </h3>
          <div className="h-[450px] w-full">
            {aggregatedData.every(d => d.score === null) ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 flex items-center justify-center text-3xl">📊</div>
                <p className="text-sm font-medium">No posture data for this period</p>
                <p className="text-xs text-neutral-300">Start monitoring to see your trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#a3a3a3' }}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(val: any, _: any, props: any) => [
                      val !== null ? `${val}% avg` : 'No data',
                      `(${props.payload?.count || 0} logs)`
                    ]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.15}
                    strokeWidth={3}
                    connectNulls={false}
                    dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-8 space-y-8">
          <h3 className="font-display font-bold text-lg">State Distribution</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stateDistribution} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                  {stateDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] p-8 flex items-start gap-6">
        <div className="p-4 bg-brand-100 rounded-full shrink-0">
          <Zap className="w-8 h-8 text-brand-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg">Actionable Insight</h3>
          <p className="text-neutral-600 text-sm leading-relaxed mt-1">
            {insights}
          </p>
        </div>
      </div>

      {/* Posture History Calendar */}
      <div className="glass rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">Posture History</h3>
          <div className="flex items-center gap-3 text-[10px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-80" />
              <span>Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500 opacity-80" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500 opacity-80" />
              <span>Poor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-neutral-200" />
              <span>No data</span>
            </div>
          </div>
        </div>
        {(() => {
          const today = new Date();
          const days: { date: Date; avgScore: number | null }[] = [];
          for (let i = 48; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];
            const dayLogs = logs.filter(l => l.timestamp.startsWith(dayStr));
            const avg = dayLogs.length > 0
              ? dayLogs.reduce((s, l) => s + l.score, 0) / dayLogs.length
              : null;
            days.push({ date: d, avgScore: avg });
          }
          const getColor = (score: number | null) => {
            if (score === null) return 'bg-neutral-200';
            if (score >= 80) return 'bg-emerald-500';
            if (score >= 60) return 'bg-amber-500';
            return 'bg-red-500';
          };
          const weeks: typeof days[] = [];
          for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
          }
          const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 pt-6">
                {dayLabels.map(d => (
                  <div key={d} className="h-4 text-[9px] text-neutral-400 leading-4">{d}</div>
                ))}
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-1.5">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1.5">
                      <div className="text-[9px] text-neutral-400 text-center h-4 leading-4">
                        {wi % 2 === 0 ? week[0]?.date.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                      </div>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          className={cn('w-4 h-4 rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-default', getColor(day.avgScore))}
                          title={`${day.date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}: ${day.avgScore !== null ? Math.round(day.avgScore) + '%' : 'No data'}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Session Summary */}
      {filteredSessions.length > 0 && (
        <div className="glass rounded-[2.5rem] p-8 space-y-4">
          <h3 className="font-display font-bold text-lg">Recent Sessions</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredSessions.filter(s => s.endTime).slice(0, 5).map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div>
                  <p className="text-xs font-bold text-neutral-700">
                    {format(new Date(session.startTime), 'MMM d, h:mm a')}
                  </p>
                  <p className="text-[10px] text-neutral-400">{session.duration} min session</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold",
                  session.avgScore >= 80 ? "bg-emerald-50 text-emerald-600" :
                    session.avgScore >= 60 ? "bg-amber-50 text-amber-600" :
                      "bg-red-50 text-red-600"
                )}>
                  {session.avgScore}% avg
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
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
<title>Upright Weekly Report — ${format(new Date(), 'MMM d, yyyy')}</title>
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
  <div class="footer">Generated by Upright · ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
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
          className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2"
        >
          ⬇ Export Data (JSON)
        </button>
      </div>
    </div>
  );
};
