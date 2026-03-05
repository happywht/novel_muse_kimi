/**
 * Sidebar - 主导航侧边栏
 * Phase 1: 核心写作体验
 */

import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { AppSection } from '../types';
import {
  LayoutDashboard,
  Globe,
  Users,
  GitBranch,
  Layers,
  PenTool,
  BarChart3,
  Bell,
  Share2,
  Settings,
  Plus,
  FolderOpen
} from 'lucide-react';

const navItems = [
  { id: AppSection.DASHBOARD, label: '仪表盘', icon: LayoutDashboard },
  { id: AppSection.WORLD, label: '世界观', icon: Globe },
  { id: AppSection.CHARACTERS, label: '人物', icon: Users },
  { id: AppSection.PLOT, label: '情节', icon: GitBranch },
  { id: AppSection.GRAPH, label: '图谱', icon: Share2 },
  { id: AppSection.OUTLINER, label: '章节', icon: Layers },
  { id: AppSection.DRAFTING, label: '写作', icon: PenTool },
  { id: AppSection.ECHOES, label: '回响', icon: Bell },
  { id: AppSection.STATS, label: '统计', icon: BarChart3 },
];

export const Sidebar: React.FC = () => {
  const { 
    activeSection, 
    setActiveSection, 
    project,
    setShowProjectList 
  } = useProjectStore();

  return (
    <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4">
      {/* 项目切换 */}
      <button
        onClick={() => setShowProjectList(true)}
        className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors mb-6"
        title="切换项目"
      >
        <FolderOpen size={20} />
      </button>

      {/* 导航按钮 */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${
                isActive
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <Icon size={18} />
              
              {/* 悬停提示 */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {item.label}
              </span>
              
              {/* 活跃指示器 */}
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-400 rounded-l" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部按钮 */}
      <div className="space-y-2">
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
};
