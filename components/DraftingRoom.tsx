/**
 * Drafting Room - 写作工坊 (增强版)
 * Phase 1: 支持智能上下文面板 + 双向绑定 + AI续写/润色
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  ProjectState,
  Chapter,
  AppSection,
  WritingMode,
  ChapterBeat
} from '../types';
import { useProjectStore } from '../stores';
import { QualityPanel } from './QualityPanel';
import { AiSuggestionPanel, AIActionType } from './AiSuggestionPanel';
import { aiRouter } from '../services/ai';
export type PolishType = '增加感官细节' | '加快叙事节奏' | '深化心理描写' | '优化对话';
import {
  PenTool,
  BookOpen,
  ChevronRight,
  Save,
  Sparkles,
  Layout,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Coffee,
  Zap,
  Eye,
  Users,
  Globe,
  FileText,
  ChevronLeft,
  Type,
  AlignLeft,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Wand2
} from 'lucide-react';

interface DraftingRoomProps {
  project: ProjectState;
}

export const DraftingRoom: React.FC<DraftingRoomProps> = ({ project }) => {
  const {
    activeChapterId,
    setActiveChapterId,
    setActiveSection,
    updateChapter,
    writingMode,
    setWritingMode,
    showContextPanel,
    setShowContextPanel,
    updateWritingEnvironment
  } = useProjectStore();

  // 本地状态
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'outline' | 'previous' | 'beats' | 'world'>('outline');
  
  // AI相关状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [showAiSuggestionPanel, setShowAiSuggestionPanel] = useState(false);
  const [aiActionType, setAiActionType] = useState<AIActionType>('continue');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取当前章节
  const currentChapter = project.chapters.find(ch => ch.id === activeChapterId);
  const chapterIndex = project.chapters.findIndex(ch => ch.id === activeChapterId);
  const previousChapter = chapterIndex > 0 ? project.chapters[chapterIndex - 1] : null;

  // 获取当前卷
  const currentVolume = currentChapter?.volumeId 
    ? project.volumes.find(v => v.id === currentChapter.volumeId)
    : null;

  // 编辑器初始化
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始你的创作之旅...',
      }),
      CharacterCount.configure(),
    ],
    content: currentChapter?.content || '',
    onUpdate: ({ editor }) => {
      if (currentChapter) {
        updateChapter(currentChapter.id, { content: editor.getHTML() });
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[60vh]',
        style: `font-family: ${project.writingEnvironment?.font === 'serif' ? 'Georgia, serif' : 'system-ui'};`,
      },
    },
  });

  // 同步章节内容到编辑器
  useEffect(() => {
    if (editor && currentChapter && editor.getHTML() !== currentChapter.content) {
      editor.commands.setContent(currentChapter.content || '');
    }
  }, [currentChapter?.id, editor]);

  // 自动保存提示
  useEffect(() => {
    if (!currentChapter) return;
    const interval = setInterval(() => {
      // 自动保存逻辑已在 store 中处理
    }, 30000);
    return () => clearInterval(interval);
  }, [currentChapter]);

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // AI功能 - 获取最后N个字符
  // ============================================
  const getLastNChars = (html: string, n: number): string => {
    // 简单的HTML标签移除
    const text = html.replace(/<[^>]+>/g, '');
    return text.slice(-n);
  };

  // ============================================
  // AI功能 - 获取选中文本
  // ============================================
  const getSelectedText = (): { text: string; hasSelection: boolean } => {
    if (!editor) return { text: '', hasSelection: false };
    
    const { from, to } = editor.state.selection;
    if (from === to) {
      // 没有选中文字，获取当前段落
      const currentPos = editor.state.selection.$from;
      const startPos = currentPos.start();
      const endPos = currentPos.end();
      const text = editor.state.doc.textBetween(startPos, endPos);
      return { text, hasSelection: false };
    }
    
    const text = editor.state.doc.textBetween(from, to);
    return { text, hasSelection: true };
  };

  // ============================================
  // AI功能 - 续写
  // ============================================
  const handleContinueWriting = async () => {
    if (!editor || !currentChapter || isGenerating) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setAiActionType('continue');
    setAiSuggestion('');
    setAiError(null);
    setHasSelection(false);
    setShowAiSuggestionPanel(true);

    try {
      const context = getLastNChars(editor.getHTML(), 500);
      const { text: selectedText, hasSelection } = getSelectedText();
      
      // 如果有选中文字，使用选中文字作为上下文
      const finalContext = hasSelection && selectedText ? selectedText : context;
      setHasSelection(hasSelection);

      const options = {
        style: project.creativeSettings.style,
        tone: project.creativeSettings.tone,
        creativity: project.creativeSettings.creativity,
        chapterSummary: currentChapter.summary,
        expectedPOV: currentChapter.expectedPOV,
      };

      const stream = aiRouter.continueWriting(finalContext, options);

      for await (const response of stream) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        if (response.error) {
          setAiError(response.error);
          break;
        }
        
        setAiSuggestion(response.content);
        
        if (response.done) {
          break;
        }
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // AI功能 - 润色
  // ============================================
  const handlePolish = async (instruction: PolishType) => {
    if (!editor || !currentChapter || isGenerating) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const { text, hasSelection: hasSel } = getSelectedText();
    
    if (!text.trim()) {
      setAiError('没有找到可润色的内容');
      setShowAiSuggestionPanel(true);
      return;
    }

    setIsGenerating(true);
    setAiActionType('polish');
    setAiSuggestion('');
    setAiError(null);
    setOriginalText(text);
    setHasSelection(hasSel);
    setShowAiSuggestionPanel(true);

    try {
      const options = {
        style: project.creativeSettings.style,
        tone: project.creativeSettings.tone,
        creativity: project.creativeSettings.creativity,
      };

      const stream = aiRouter.polish(text, instruction, options);

      for await (const response of stream) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        if (response.error) {
          setAiError(response.error);
          break;
        }
        
        setAiSuggestion(response.content);
        
        if (response.done) {
          break;
        }
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '润色失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // AI功能 - 采纳建议
  // ============================================
  const handleAcceptSuggestion = () => {
    if (!editor || !aiSuggestion) return;

    if (aiActionType === 'continue') {
      // 续写：在末尾插入
      editor.commands.focus('end');
      editor.commands.insertContent(aiSuggestion);
    } else {
      // 润色：替换选中的文字
      const { from, to } = editor.state.selection;
      if (from !== to) {
        // 有选中内容，替换
        editor.commands.deleteSelection();
        editor.commands.insertContent(aiSuggestion);
      } else {
        // 没有选中内容，替换当前段落
        const currentPos = editor.state.selection.$from;
        const startPos = currentPos.start();
        const endPos = currentPos.end();
        editor.commands.setTextSelection({ from: startPos, to: endPos });
        editor.commands.deleteSelection();
        editor.commands.insertContent(aiSuggestion);
      }
    }

    setShowAiSuggestionPanel(false);
    setAiSuggestion('');
    setOriginalText('');
  };

  // ============================================
  // AI功能 - 放弃建议
  // ============================================
  const handleRejectSuggestion = () => {
    setShowAiSuggestionPanel(false);
    setAiSuggestion('');
    setOriginalText('');
    setAiError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // ============================================
  // AI功能 - 重新生成
  // ============================================
  const handleRegenerate = () => {
    if (aiActionType === 'continue') {
      handleContinueWriting();
    } else {
      // 润色需要知道原来的指令，这里简化处理
      handlePolish('增加感官细节');
    }
  };

  // 润色选项配置
  const polishOptions: { label: PolishType; icon: React.ReactNode; description: string }[] = [
    { 
      label: '增加感官细节', 
      icon: <Eye size={12} />, 
      description: '丰富视觉、听觉等感官描写'
    },
    { 
      label: '加快叙事节奏', 
      icon: <Zap size={12} />, 
      description: '删减冗余，增强紧凑感'
    },
    { 
      label: '深化心理描写', 
      icon: <Coffee size={12} />, 
      description: '展现内心活动与情感变化'
    },
    { 
      label: '优化对话', 
      icon: <Type size={12} />, 
      description: '使对话更自然、有张力'
    },
  ];

  // 渲染上下文面板
  const renderContextPanel = () => {
    if (!showContextPanel) return null;

    return (
      <div className="w-80 bg-slate-900/80 border-l border-slate-800 flex flex-col animate-fade-in">
        {/* 面板标签 */}
        <div className="flex border-b border-slate-800">
          {[
            { id: 'outline', label: '细纲', icon: FileText },
            { id: 'previous', label: '前文', icon: ChevronLeft },
            { id: 'beats', label: '节拍', icon: Zap },
            { id: 'world', label: '设定', icon: Globe },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === tab.id
                  ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-400/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 面板内容 */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'outline' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">当前章节细纲</h4>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {currentChapter?.summary || '暂无细纲'}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">视角人物</h4>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Users size={14} className="text-violet-400" />
                  {currentChapter?.expectedPOV || '未设定'}
                </div>
              </div>

              {currentVolume && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">所属分卷</h4>
                  <div 
                    className="flex items-center gap-2 text-sm text-slate-300 px-3 py-2 rounded-lg bg-slate-800/50"
                    style={{ borderLeft: `3px solid ${currentVolume.color || '#6366f1'}` }}
                  >
                    <BookOpen size={14} />
                    {currentVolume.title}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'previous' && previousChapter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase">上一章</h4>
                <span className="text-[10px] text-slate-600">{previousChapter.title}</span>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 max-h-96 overflow-y-auto">
                <div 
                  className="text-sm text-slate-400 leading-relaxed prose prose-invert prose-sm"
                  dangerouslySetInnerHTML={{ __html: previousChapter.content?.slice(-1000) || '无内容' }}
                />
              </div>
              <p className="text-[10px] text-slate-600">
                显示最后 1000 字符
              </p>
            </div>
          )}

          {activeTab === 'previous' && !previousChapter && (
            <div className="text-center text-slate-600 py-8">
              <p className="text-sm">这是第一章</p>
              <p className="text-xs mt-1">无前文可显示</p>
            </div>
          )}

          {activeTab === 'beats' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">场景节拍链</h4>
              {currentChapter?.beats?.map((beat, idx) => (
                <div 
                  key={beat.id}
                  className={`p-3 rounded-lg border ${
                    beat.isCompleted 
                      ? 'bg-emerald-900/10 border-emerald-500/30' 
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      beat.type === 'TWIST' ? 'bg-rose-500' :
                      beat.type === 'ACTION' ? 'bg-amber-500' :
                      beat.type === 'DIALOGUE' ? 'bg-sky-500' :
                      'bg-slate-500'
                    }`} />
                    <span className="text-[10px] text-slate-500 uppercase">{beat.type}</span>
                  </div>
                  <p className="text-sm text-slate-300">{beat.description}</p>
                </div>
              ))}
              {(!currentChapter?.beats || currentChapter.beats.length === 0) && (
                <p className="text-sm text-slate-600 text-center py-4">
                  暂无场景节拍
                </p>
              )}
            </div>
          )}

          {activeTab === 'world' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">相关设定</h4>
              {project.worldSettings.slice(0, 5).map(setting => (
                <div key={setting.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={12} className="text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">{setting.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{setting.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 禅模式
  if (isZenMode) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">
        {/* 禅模式工具栏 */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsZenMode(false)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <Minimize2 size={18} />
            </button>
            <span className="text-sm text-slate-400">{currentChapter?.title}</span>
          </div>
          <div className="text-xs text-slate-600 font-mono">
            {editor?.storage.characterCount.characters() || 0} 字符
          </div>
        </div>
        
        {/* 编辑器 */}
        <div className="flex-1 overflow-y-auto flex justify-center py-12">
          <div className="w-full max-w-3xl px-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    );
  }

  // 如果无选中章节，显示章节选择器
  if (!currentChapter) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <div className="text-center">
          <BookOpen size={64} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-300 mb-2">选择章节开始写作</h3>
          <p className="text-slate-500 mb-6">从左侧列表选择章节，或前往章节规划器创建新章节</p>
          <button
            onClick={() => setActiveSection(AppSection.OUTLINER)}
            className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto transition-all"
          >
            <PenTool size={18} />
            前往章节规划器
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-950">
      {/* 主编辑区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50">
          <div className="flex items-center gap-4">
            {/* 返回按钮 */}
            <button
              onClick={() => setActiveSection(AppSection.OUTLINER)}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="返回章节规划器"
            >
              <ChevronLeft size={18} />
            </button>

            {/* 章节信息 */}
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentChapter.title}
                  onChange={(e) => updateChapter(currentChapter.id, { title: e.target.value })}
                  className="bg-transparent text-white font-bold text-lg border-none focus:ring-0 p-0 w-64"
                />
                {currentChapter.writingStatus === 'POLISHED' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                    已完成
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {currentVolume?.title} · 第 {currentChapter.volumeOrder !== undefined ? currentChapter.volumeOrder + 1 : '?'} 章
              </p>
            </div>
          </div>

          {/* 工具按钮组 */}
          <div className="flex items-center gap-2">
            {/* 字数统计 */}
            <div className="px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-400 font-mono mr-2">
              {editor?.storage.characterCount.characters() || 0} 字符
            </div>

            {/* 上下文面板切换 */}
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showContextPanel 
                  ? 'bg-sky-500/20 text-sky-400' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
              title="上下文面板"
            >
              <Layout size={18} />
            </button>

            {/* 禅模式 */}
            <button
              onClick={() => setIsZenMode(true)}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="禅模式"
            >
              <Maximize2 size={18} />
            </button>

            {/* 质量检查 */}
            <button
              onClick={() => setShowQualityPanel(!showQualityPanel)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                showQualityPanel 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
              title="质量检查"
            >
              <CheckCircle size={18} />
              <span className="text-xs font-medium">质控</span>
            </button>

            {/* AI 助手 */}
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                showAiPanel 
                  ? 'bg-violet-500/20 text-violet-400' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
              title="AI 助手"
            >
              <Sparkles size={18} />
              <span className="text-xs font-medium">AI</span>
            </button>
          </div>
        </div>

        {/* 编辑器区域 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 主编辑器 */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto py-8 px-12">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* AI 面板 */}
          {showAiPanel && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col animate-fade-in">
              <div className="p-4 border-b border-slate-800">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-400" />
                  AI 写作助手
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 续写建议 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <Zap size={12} />
                    续写建议
                  </h4>
                  <button
                    onClick={handleContinueWriting}
                    disabled={isGenerating}
                    className="w-full p-3 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-lg text-left text-sm text-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isGenerating && aiActionType === 'continue' ? (
                        <div className="w-4 h-4 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
                      ) : (
                        <Wand2 size={16} className="text-violet-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="font-medium">
                        {isGenerating && aiActionType === 'continue' ? '生成中...' : '基于上下文续写'}
                      </span>
                    </div>
                    <p className="text-xs text-violet-400/60 mt-1">
                      获取最后500字作为上下文，智能续写
                    </p>
                  </button>
                </div>

                {/* 润色选项 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <Sparkles size={12} />
                    润色优化
                  </h4>
                  <div className="space-y-2">
                    {polishOptions.map(({ label, icon, description }) => (
                      <button
                        key={label}
                        onClick={() => handlePolish(label)}
                        disabled={isGenerating}
                        className="w-full p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 group-hover:text-violet-400 transition-colors">
                            {icon}
                          </span>
                          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                            {label}
                          </span>
                          {isGenerating && aiActionType === 'polish' && (
                            <div className="ml-auto w-3 h-3 rounded-full border border-violet-400/30 border-t-violet-400 animate-spin" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 pl-5">
                          {description}
                        </p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">
                    提示：选中文字后点击，可润色选中部分
                  </p>
                </div>

                {/* 快捷提示 */}
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">使用说明</h4>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• 续写功能基于最后500字生成</li>
                    <li>• 润色支持选中和当前段落</li>
                    <li>• 生成结果可采纳或重新生成</li>
                    <li>• 支持流式显示生成进度</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="h-8 border-t border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-500 bg-slate-900/30">
          <div className="flex items-center gap-4">
            <span>{editor?.storage.characterCount.words() || 0} 词</span>
            <span>{currentChapter.writingStatus || 'OUTLINE'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>自动保存</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* 上下文面板 */}
      {renderContextPanel()}

      {/* 质量检查面板 */}
      {showQualityPanel && (
        <QualityPanel
          project={project}
          currentChapter={currentChapter}
          isOpen={showQualityPanel}
          onClose={() => setShowQualityPanel(false)}
        />
      )}

      {/* AI建议面板 */}
      <AiSuggestionPanel
        isOpen={showAiSuggestionPanel}
        onClose={handleRejectSuggestion}
        title={aiActionType === 'continue' ? 'AI续写建议' : 'AI润色结果'}
        content={aiSuggestion}
        isLoading={isGenerating}
        error={aiError}
        actionType={aiActionType}
        originalText={originalText}
        onAccept={handleAcceptSuggestion}
        onReject={handleRejectSuggestion}
        onRegenerate={handleRegenerate}
        hasSelection={hasSelection}
      />
    </div>
  );
};
