/**
 * Writing Stats - 写作统计
 */

import React, { useMemo } from 'react';
import { ProjectState } from '../types';
import { BarChart3, BookOpen, Users, Globe, Trophy, TrendingUp } from 'lucide-react';

interface WritingStatsProps {
  project: ProjectState;
}

const MILESTONES = [
  { threshold: 1000, label: '新手村毕业', icon: '🌱', color: 'text-emerald-400' },
  { threshold: 5000, label: '初露锋芒', icon: '⚔️', color: 'text-blue-400' },
  { threshold: 10000, label: '笔耕不辍', icon: '📖', color: 'text-indigo-400' },
  { threshold: 20000, label: '中篇成型', icon: '📚', color: 'text-purple-400' },
  { threshold: 50000, label: '长篇巨制', icon: '🏰', color: 'text-amber-400' },
  { threshold: 100000, label: '传世之作', icon: '👑', color: 'text-yellow-300' },
  { threshold: 200000, label: '封神之路', icon: '🔥', color: 'text-red-400' },
];

export const WritingStats: React.FC<WritingStatsProps> = ({ project }) => {
  const stats = useMemo(() => {
    const chapters = project.chapters || [];
    const drafts = project.drafts || [];
    
    const chapterWords = chapters.reduce((sum, ch) => sum + (ch.content?.length || 0), 0);
    const draftWords = drafts.reduce((sum, d) => sum + (d.content?.length || 0), 0);
    const totalWords = chapterWords + draftWords;
    
    const avgChapterWords = chapters.length > 0 ? Math.round(chapterWords / chapters.length) : 0;
    const longestChapter = chapters.reduce((max, ch) => Math.max(max, ch.content?.length || 0), 0);
    
    const currentMilestone = MILESTONES.filter(m => totalWords >= m.threshold).pop();
    const nextMilestone = MILESTONES.find(m => totalWords < m.threshold);
    const progress = nextMilestone
      ? ((totalWords - (currentMilestone?.threshold || 0)) / (nextMilestone.threshold - (currentMilestone?.threshold || 0))) * 100
      : 100;
    
    return {
      totalWords,
      chapterWords,
      draftWords,
      chapterCount: chapters.length,
      draftCount: drafts.length,
      characterCount: project.characters?.length || 0,
      worldSettingCount: project.worldSettings?.length || 0,
      avgChapterWords,
      longestChapter,
      currentMilestone,
      nextMilestone,
      progress,
    };
  }, [project]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* 里程碑 Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-violet-900/20 to-slate-900 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <Trophy size={32} className="text-amber-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              {stats.currentMilestone ? `${stats.currentMilestone.icon} ${stats.currentMilestone.label}` : '🌱 创作之旅开始'}
            </h2>
            <p className="text-slate-400">
              总字数: <span className="text-white font-mono font-bold text-xl">{stats.totalWords.toLocaleString()}</span>
            </p>
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-sky-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, stats.progress)}%` }}
          />
        </div>
        
        {stats.nextMilestone && (
          <p className="text-sm text-slate-500 mt-2 text-right">
            距离 {stats.nextMilestone.icon} {stats.nextMilestone.label} 还需 {(stats.nextMilestone.threshold - stats.totalWords).toLocaleString()} 字
          </p>
        )}
      </div>

      {/* 统计网格 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: '正文章节', value: stats.chapterCount, sub: `${stats.chapterWords.toLocaleString()} 字`, color: 'text-emerald-400' },
          { icon: TrendingUp, label: '平均章节', value: stats.avgChapterWords, sub: '字/章', color: 'text-sky-400' },
          { icon: Users, label: '角色', value: stats.characterCount, color: 'text-violet-400' },
          { icon: Globe, label: '世界观设定', value: stats.worldSettingCount, color: 'text-amber-400' },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className={`${item.color} mb-2`}>
              <item.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{item.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500">{item.label}</div>
            {item.sub && <div className="text-[10px] text-slate-600 mt-1">{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* 成就列表 */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-violet-400" /> 里程碑成就
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {MILESTONES.map(m => {
            const achieved = stats.totalWords >= m.threshold;
            return (
              <div
                key={m.threshold}
                className={`p-3 rounded-lg border text-center transition-all ${
                  achieved
                    ? 'bg-slate-800/80 border-slate-600'
                    : 'bg-slate-900/30 border-slate-800 opacity-40'
                }`}
              >
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className={`text-xs font-bold ${achieved ? m.color : 'text-slate-600'}`}>
                  {m.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {(m.threshold / 1000)}k
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 分卷统计 */}
      {project.volumes && project.volumes.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">分卷进度</h3>
          <div className="space-y-3">
            {project.volumes.map(vol => {
              const volChapters = project.chapters?.filter(ch => ch.volumeId === vol.id) || [];
              const volWords = volChapters.reduce((sum, ch) => sum + (ch.content?.length || 0), 0);
              const progress = Math.min(100, (volWords / vol.targetWordCount) * 100);
              
              return (
                <div key={vol.id} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-slate-300 truncate">{vol.title}</div>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: vol.color || '#6366f1' }}
                    />
                  </div>
                  <div className="w-32 text-right text-xs text-slate-500">
                    {volWords.toLocaleString()} / {vol.targetWordCount.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
