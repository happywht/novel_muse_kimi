/**
 * Chapter Outliner - 章节规划器 (增强版)
 * Phase 1: 支持分卷系统 + 双向绑定
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ProjectState, 
  PlotNode, 
  Chapter, 
  Volume, 
  AppSection,
  ChapterBeat 
} from '../types';
import { useProjectStore } from '../store/useProjectStore';
import {
  LayoutGrid,
  BookOpen,
  Sparkles,
  Plus,
  PenTool,
  ChevronRight,
  User,
  Trash2,
  Calendar,
  ArrowRight,
  Activity,
  ChevronUp,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreVertical,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Layers
} from 'lucide-react';
import { Loader2, RefreshCw } from 'lucide-react';

interface ChapterOutlinerProps {
  project: ProjectState;
}

export const ChapterOutliner: React.FC<ChapterOutlinerProps> = ({ project }) => {
  const {
    setActiveSection,
    setActiveChapterId,
    setActiveVolumeId,
    activeVolumeId,
    createVolume,
    updateVolume,
    deleteVolume,
    createChapter,
    updateChapter,
    deleteChapter,
    moveChapterToVolume,
    updateProject
  } = useProjectStore();

  // 本地状态
  const [selectedPlotNodeId, setSelectedPlotNodeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingChapterId, setRegeneratingChapterId] = useState<string | null>(null);
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [volumeFormData, setVolumeFormData] = useState<Partial<Volume>>({});
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [draggingChapter, setDraggingChapter] = useState<string | null>(null);

  // 初始化展开所有卷
  useEffect(() => {
    if (project.volumes.length > 0) {
      setExpandedVolumes(new Set(project.volumes.map(v => v.id)));
    }
  }, [project.volumes.length]);

  // 选择的情节节点
  const selectedPlotNode = useMemo(() =>
    project.plotNodes.find(n => n.id === selectedPlotNodeId),
    [project.plotNodes, selectedPlotNodeId]
  );

  // 按卷组织章节
  const chaptersByVolume = useMemo(() => {
    const map = new Map<string | undefined, Chapter[]>();
    
    // 初始化每个卷的数组
    project.volumes.forEach(vol => map.set(vol.id, []));
    map.set(undefined, []); // 未分类
    
    // 分配章节
    project.chapters.forEach(ch => {
      const list = map.get(ch.volumeId) || [];
      list.push(ch);
      map.set(ch.volumeId, list);
    });
    
    // 排序
    map.forEach((list, key) => {
      list.sort((a, b) => (a.volumeOrder || a.order) - (b.volumeOrder || b.order));
    });
    
    return map;
  }, [project.chapters, project.volumes]);

  // 切换卷展开/折叠
  const toggleVolumeExpand = (volumeId: string) => {
    setExpandedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  };

  // 创建新卷
  const handleCreateVolume = () => {
    if (!volumeFormData.title) return;
    createVolume(volumeFormData);
    setVolumeFormData({});
    setShowVolumeForm(false);
  };

  // 添加章节到指定卷
  const handleAddChapter = (volumeId?: string) => {
    const chapter = createChapter(volumeId, selectedPlotNodeId || undefined);
    if (chapter) {
      // 自动展开该卷
      if (volumeId) {
        setExpandedVolumes(prev => new Set(prev).add(volumeId));
      }
    }
  };

  // 删除章节
  const handleDeleteChapter = (id: string) => {
    deleteChapter(id);
  };

  // 更新章节
  const handleUpdateChapter = (id: string, updates: Partial<Chapter>) => {
    updateChapter(id, updates);
  };

  // 前往写作
  const handleGoToDraft = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setActiveSection(AppSection.DRAFTING);
  };

  // 计算卷的当前字数
  const getVolumeWordCount = (volumeId: string) => {
    const chapters = chaptersByVolume.get(volumeId) || [];
    return chapters.reduce((sum, ch) => sum + (ch.wordCount || ch.content?.length || 0), 0);
  };

  // 渲染卷卡片
  const renderVolumeCard = (volume: Volume) => {
    const isExpanded = expandedVolumes.has(volume.id);
    const volumeChapters = chaptersByVolume.get(volume.id) || [];
    const wordCount = getVolumeWordCount(volume.id);
    const progress = Math.min(100, (wordCount / volume.targetWordCount) * 100);
    const isEditing = editingVolumeId === volume.id;

    return (
      <div 
        key={volume.id}
        className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-4"
        style={{ borderLeftWidth: '4px', borderLeftColor: volume.color || '#6366f1' }}
      >
        {/* 卷头部 */}
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
          onClick={() => toggleVolumeExpand(volume.id)}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <FolderOpen size={20} className="text-slate-400" /> : <Folder size={20} className="text-slate-400" />}
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={volume.title}
                  onChange={(e) => updateVolume(volume.id, { title: e.target.value })}
                  onBlur={() => setEditingVolumeId(null)}
                  onKeyPress={(e) => e.key === 'Enter' && setEditingVolumeId(null)}
                  className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="font-bold text-white flex items-center gap-2">
                  {volume.title}
                  <span className="text-xs text-slate-500 font-normal">
                    第 {volume.volumeNumber} 卷
                  </span>
                </h3>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                {volumeChapters.length} 章 · {wordCount.toLocaleString()} / {volume.targetWordCount.toLocaleString()} 字
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 进度条 */}
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: volume.color || '#6366f1'
                }}
              />
            </div>
            
            {/* 操作按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); setEditingVolumeId(volume.id); }}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteVolume(volume.id); }}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 rounded transition-colors"
            >
              <Trash2 size={14} />
            </button>
            {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </div>
        </div>

        {/* 展开的章节列表 */}
        {isExpanded && (
          <div className="border-t border-slate-700/50 p-3 space-y-2">
            {volumeChapters.map((chapter, idx) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                index={idx}
                isSelected={false}
                onUpdate={(updates) => handleUpdateChapter(chapter.id, updates)}
                onDelete={() => handleDeleteChapter(chapter.id)}
                onGoToDraft={() => handleGoToDraft(chapter.id)}
                dragOver={draggingChapter === chapter.id}
              />
            ))}
            
            {/* 添加章节按钮 */}
            <button
              onClick={() => handleAddChapter(volume.id)}
              className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              添加章节
            </button>
          </div>
        )}
      </div>
    );
  };

  // 未分类章节
  const renderUncategorized = () => {
    const chapters = chaptersByVolume.get(undefined) || [];
    if (chapters.length === 0 && project.volumes.length > 0) return null;

    return (
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 space-y-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          未分类章节
        </h4>
        {chapters.map((chapter, idx) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            index={idx}
            isSelected={false}
            onUpdate={(updates) => handleUpdateChapter(chapter.id, updates)}
            onDelete={() => handleDeleteChapter(chapter.id)}
            onGoToDraft={() => handleGoToDraft(chapter.id)}
          />
        ))}
        <button
          onClick={() => handleAddChapter(undefined)}
          className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-sky-400 hover:border-sky-500/50 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} />
          添加未分类章节
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-fade-in">
      {/* 左侧：PlotNode 选择器 */}
      <div className="w-64 flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/20">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={14} className="text-sky-400" /> 
            情节节点
          </h3>
          <p className="text-[10px] text-slate-600 mt-1">
            选择要展开的 PlotNode
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {project.plotNodes.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 italic">暂无情节卡片</p>
            </div>
          ) : (
            project.plotNodes.map(node => (
              <button
                key={node.id}
                onClick={() => setSelectedPlotNodeId(node.id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedPlotNodeId === node.id
                    ? 'bg-sky-500/10 border border-sky-500/30'
                    : 'hover:bg-slate-800/50 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                  BEAT {node.order + 1}
                </span>
                <h4 className="text-sm font-bold truncate mt-1">
                  {node.title || "未命名节点"}
                </h4>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 右侧：分卷与章节管理 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers size={20} className="text-muse-400" />
              章节规划器
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              共 {project.volumes.length} 卷 · {project.chapters.length} 章
            </p>
          </div>
          
          <button
            onClick={() => setShowVolumeForm(true)}
            className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
          >
            <Folder size={16} />
            新建分卷
          </button>
        </div>

        {/* 新建卷表单 */}
        {showVolumeForm && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-4 animate-fade-in">
            <h4 className="text-sm font-bold text-white mb-3">新建分卷</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="卷标题"
                value={volumeFormData.title || ''}
                onChange={(e) => setVolumeFormData({ ...volumeFormData, title: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="number"
                placeholder="目标字数"
                value={volumeFormData.targetWordCount || ''}
                onChange={(e) => setVolumeFormData({ ...volumeFormData, targetWordCount: parseInt(e.target.value) || 50000 })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder="主题"
                value={volumeFormData.theme || ''}
                onChange={(e) => setVolumeFormData({ ...volumeFormData, theme: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm col-span-2"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowVolumeForm(false)}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateVolume}
                className="px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 text-white rounded-lg"
              >
                创建
              </button>
            </div>
          </div>
        )}

        {/* 卷列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {project.volumes.map(renderVolumeCard)}
          {renderUncategorized()}
          
          {project.volumes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Folder size={48} className="opacity-30 mb-4" />
              <p className="text-sm">还没有创建分卷</p>
              <p className="text-xs mt-1">点击右上角创建第一卷</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 章节卡片组件
// ============================================
interface ChapterCardProps {
  chapter: Chapter;
  index: number;
  isSelected: boolean;
  onUpdate: (updates: Partial<Chapter>) => void;
  onDelete: () => void;
  onGoToDraft: () => void;
  dragOver?: boolean;
}

const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  index,
  isSelected,
  onUpdate,
  onDelete,
  onGoToDraft,
  dragOver
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const wordCount = chapter.wordCount || chapter.content?.length || 0;

  return (
    <div 
      className={`bg-slate-800/80 border rounded-xl p-3 transition-all ${
        isSelected 
          ? 'border-sky-500/50 bg-sky-900/10' 
          : dragOver 
            ? 'border-amber-500/50 bg-amber-900/10'
            : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      {/* 头部信息 */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xs font-bold">
          {index + 1}
        </div>
        
        <input
          type="text"
          value={chapter.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 bg-transparent text-sm font-bold text-slate-200 border-none focus:ring-0 p-0"
          placeholder="章节标题"
        />
        
        <span className="text-[10px] text-slate-500 font-mono">
          {wordCount.toLocaleString()} 字
        </span>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-500 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div className="mt-3 space-y-3 border-t border-slate-700/50 pt-3 animate-fade-in">
          {/* 细纲 */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              章节细纲
            </label>
            <textarea
              value={chapter.summary || ''}
              onChange={(e) => onUpdate({ summary: e.target.value })}
              placeholder="本章的核心内容、情节转折..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 h-20 resize-none focus:border-sky-500/50 transition-colors"
            />
          </div>

          {/* 视角人物 & 状态 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                视角人物 (POV)
              </label>
              <input
                type="text"
                value={chapter.expectedPOV || ''}
                onChange={(e) => onUpdate({ expectedPOV: e.target.value })}
                placeholder="主角名"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                写作状态
              </label>
              <select
                value={chapter.writingStatus || 'OUTLINE'}
                onChange={(e) => onUpdate({ writingStatus: e.target.value as any })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300"
              >
                <option value="OUTLINE">大纲</option>
                <option value="DRAFT">草稿</option>
                <option value="REVISION">修订</option>
                <option value="POLISHED">润色完成</option>
              </select>
            </div>
          </div>

          {/* 场景节拍 */}
          {chapter.beats && chapter.beats.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1">
                <Activity size={10} className="text-violet-400" />
                场景节拍
              </label>
              <div className="space-y-1">
                {chapter.beats.map((beat, i) => (
                  <div key={beat.id} className="flex items-start gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                      beat.type === 'TWIST' ? 'bg-rose-500' :
                      beat.type === 'ACTION' ? 'bg-amber-500' :
                      beat.type === 'DIALOGUE' ? 'bg-sky-500' :
                      'bg-slate-500'
                    }`} />
                    <span className="text-slate-400 flex-1">{beat.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onDelete}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <Trash2 size={12} />
              删除
            </button>
            <button
              onClick={onGoToDraft}
              className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <PenTool size={12} />
              去写作
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
