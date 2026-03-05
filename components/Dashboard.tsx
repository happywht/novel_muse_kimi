/**
 * Dashboard - 项目仪表盘
 */

import React, { useState } from 'react';
import { ProjectState, AppSection } from '../types';
import { useProjectStore, useUIStore } from '../stores';
import { Sparkles, BookOpen, Target, Zap, Rocket, Bell } from 'lucide-react';

interface DashboardProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ project, updateProject }) => {
  const [brainstormInput, setBrainstormInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { createVolume } = useProjectStore();

  const handleKickstart = async () => {
    setIsGenerating(true);
    // 模拟 AI 初始化
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 创建默认第一卷
    createVolume({
      title: '第一卷：启程',
      theme: '故事的开端',
      targetWordCount: 50000
    });
    
    setIsGenerating(false);
  };

  const stats = {
    chapters: project.chapters?.length || 0,
    words: project.chapters?.reduce((sum, ch) => sum + (ch.content?.length || 0), 0) || 0,
    characters: project.characters?.length || 0,
    worldSettings: project.worldSettings?.length || 0,
    pendingEchoes: project.echoes?.filter(e => e.status === 'PENDING').length || 0
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* 头部 */}
      <header className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white font-serif">项目概览</h1>
          <p className="text-slate-400">定义你故事的核心灵魂与创作罗盘。</p>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '章节数', value: stats.chapters, icon: BookOpen, color: 'text-emerald-400' },
          { label: '总字数', value: stats.words.toLocaleString(), icon: Target, color: 'text-sky-400' },
          { label: '角色', value: stats.characters, icon: Zap, color: 'text-violet-400' },
          { label: '世界观设定', value: stats.worldSettings, icon: Sparkles, color: 'text-amber-400' },
          { label: '待处理回响', value: stats.pendingEchoes, icon: Bell, color: 'text-rose-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className={`${stat.color} mb-2`}>
              <stat.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：基础信息 */}
        <div className="col-span-2 space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-sky-400" />
              基础信息
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">小说标题</label>
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => updateProject({ title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-sky-500 outline-none"
                  placeholder="无题·杰作"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">类型流派</label>
                <input
                  type="text"
                  value={project.genre}
                  onChange={(e) => updateProject({ genre: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-sky-500 outline-none"
                  placeholder="例如：赛博朋克"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">核心梗概</label>
              <textarea
                value={project.premise}
                onChange={(e) => updateProject({ premise: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-24 resize-none focus:border-sky-500 outline-none"
                placeholder="你的故事是关于什么的？"
              />
            </div>
          </div>

          {/* 创作罗盘 */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <Target size={18} className="text-violet-400" />
              创作罗盘
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-2">叙事基调</label>
                <div className="flex flex-wrap gap-2">
                  {['黑暗', '幽默', '史诗', '悬疑', '治愈', '平衡'].map(tone => (
                    <button
                      key={tone}
                      onClick={() => updateProject({
                        creativeSettings: { ...project.creativeSettings, tone }
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        project.creativeSettings?.tone === tone
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-2">创意温度: {project.creativeSettings?.creativity || 0.8}</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={project.creativeSettings?.creativity || 0.8}
                  onChange={(e) => updateProject({
                    creativeSettings: { ...project.creativeSettings, creativity: parseFloat(e.target.value) }
                  })}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：快速操作 */}
        <div className="space-y-4">
          {/* AI 初始化 */}
          <div className="bg-gradient-to-br from-violet-900/40 to-slate-900 p-6 rounded-xl border border-violet-500/30">
            <h3 className="font-bold text-white flex items-center gap-2 mb-3">
              <Rocket size={18} className="text-violet-400" />
              项目快速初始化
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              AI 将基于你的梗概自动创建第一卷、核心角色和世界观框架。
            </p>
            <button
              onClick={handleKickstart}
              disabled={isGenerating || !project.premise}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  初始化中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  启动 AI 创世纪
                </>
              )}
            </button>
          </div>

          {/* 快速链接 */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">快速导航</h4>
            {[
              { label: '规划章节', section: AppSection.OUTLINER, count: stats.chapters },
              { label: '开始写作', section: AppSection.DRAFTING, count: stats.words > 0 ? '继续' : '新建' },
              { label: '查看回响', section: AppSection.ECHOES, count: stats.pendingEchoes > 0 ? `${stats.pendingEchoes} 待处理` : '' },
              { label: '查看统计', section: AppSection.STATS, count: '' },
            ].map(link => (
              <button
                key={link.label}
                onClick={() => useUIStore.getState().setActiveSection(link.section)}
                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <span>{link.label}</span>
                <span className="text-xs text-slate-500">{link.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
