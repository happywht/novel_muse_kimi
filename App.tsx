/**
 * Novel Muse - Main Application
 * Phase 1-2: 核心写作体验 + AI 增强
 */

import React, { useEffect, useState } from 'react';
import { useProjectStore } from './store/useProjectStore';
import { AppSection } from './types';

// Components
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { WorldBuilder } from './components/WorldBuilder';
import { CharacterCreator } from './components/CharacterCreator';
import { PlotWeaver } from './components/PlotWeaver';
import { ChapterOutliner } from './components/ChapterOutliner';
import { DraftingRoom } from './components/DraftingRoom';
import { WritingStats } from './components/WritingStats';
import { EchoPanel } from './components/EchoPanel';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { Loader } from './components/Loader';
import { VersionControlPanel } from './components/VersionControlPanel';

// Icons
import { GitBranch, CheckCircle, AlertTriangle } from 'lucide-react';

function App() {
  const {
    project,
    activeSection,
    isLoading,
    initialize,
    updateProject,
    isSaving
  } = useProjectStore();

  const [showVersionPanel, setShowVersionPanel] = useState(false);

  // 初始化
  useEffect(() => {
    initialize();
  }, []);

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader text="正在加载创作空间..." />
        </div>
      </div>
    );
  }

  // 渲染当前页面
  const renderContent = () => {
    switch (activeSection) {
      case AppSection.DASHBOARD:
        return <Dashboard project={project} updateProject={updateProject} />;
      case AppSection.WORLD:
        return <WorldBuilder project={project} updateProject={updateProject} />;
      case AppSection.CHARACTERS:
        return <CharacterCreator project={project} updateProject={updateProject} />;
      case AppSection.PLOT:
        return <PlotWeaver project={project} updateProject={updateProject} />;
      case AppSection.OUTLINER:
        return <ChapterOutliner project={project} />;
      case AppSection.DRAFTING:
        return <DraftingRoom project={project} />;
      case AppSection.STATS:
        return <WritingStats project={project} />;
      case AppSection.ECHOES:
        return <EchoPanel project={project} updateProject={updateProject} />;
      case AppSection.GRAPH:
        return <KnowledgeGraphView project={project} updateProject={updateProject} />;
      default:
        return <Dashboard project={project} updateProject={updateProject} />;
    }
  };

  // 统计待处理的 Echo 数量
  const pendingEchoes = project.echoes?.filter(e => e.status === 'PENDING').length || 0;
  
  // 统计当前分支
  const currentBranch = project.versionControl?.currentBranch || 'main';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-muse-500/30">
      {/* 顶部导航栏 */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Novel Muse</h1>
            <p className="text-[10px] text-slate-500">小说架构师</p>
          </div>
          {project.title && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-sm text-slate-400 truncate max-w-[200px]">
                {project.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 待处理 Echo 指示 */}
          {pendingEchoes > 0 && (
            <button className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/30 transition-colors">
              <AlertTriangle size={12} />
              <span>{pendingEchoes} 个待处理回响</span>
            </button>
          )}

          {/* 版本控制分支 */}
          <button
            onClick={() => setShowVersionPanel(!showVersionPanel)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${
              showVersionPanel 
                ? 'bg-violet-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch size={12} />
            <span>{currentBranch}</span>
          </button>

          {/* 保存状态指示器 */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isSaving ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                保存中...
              </>
            ) : (
              <>
                <CheckCircle size={12} className="text-emerald-500" />
                <span>已保存</span>
              </>
            )}
          </div>

          {/* 字数统计 */}
          <div className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-400 font-mono">
            {(project.chapters?.reduce((sum, ch) => sum + (ch.content?.length || 0), 0) || 0).toLocaleString()} 字
          </div>
        </div>
      </header>

      {/* 主布局 */}
      <div className="pt-14 flex h-screen">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 主内容区 */}
        <main className="flex-1 overflow-hidden bg-slate-950 relative">
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            {renderContent()}
          </div>
        </main>

        {/* 版本控制面板 */}
        <VersionControlPanel
          project={project}
          updateProject={updateProject}
          isOpen={showVersionPanel}
          onClose={() => setShowVersionPanel(false)}
        />
      </div>
    </div>
  );
}

export default App;
