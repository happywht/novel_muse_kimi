/**
 * AI Suggestion Panel - AI建议面板
 * 显示AI生成内容，提供采纳/放弃/重新生成功能
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  X,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Copy,
  CheckCheck
} from 'lucide-react';

export type AIActionType = 'continue' | 'polish';

export interface AiSuggestionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  isLoading: boolean;
  error?: string | null;
  actionType: AIActionType;
  originalText?: string;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  hasSelection?: boolean;
}

export const AiSuggestionPanel: React.FC<AiSuggestionPanelProps> = ({
  isOpen,
  onClose,
  title,
  content,
  isLoading,
  error,
  actionType,
  originalText,
  onAccept,
  onReject,
  onRegenerate,
  hasSelection = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current && !isLoading) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isLoading]);

  // 复制内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-slide-in-right">
      {/* 头部 */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Sparkles size={16} className="text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">{title}</h3>
            <p className="text-[10px] text-slate-500">
              {actionType === 'continue' ? '续写建议' : '润色优化'}
              {hasSelection && ' · 基于选中文字'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 对比模式切换（仅润色模式） */}
        {actionType === 'polish' && originalText && (
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComparison(false)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  !showComparison ? 'bg-violet-500/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                润色结果
              </button>
              <button
                onClick={() => setShowComparison(true)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  showComparison ? 'bg-violet-500/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                对比模式
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        )}

        {/* 内容显示 */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        >
          {isLoading && !content ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                <Sparkles size={16} className="absolute inset-0 m-auto text-violet-400" />
              </div>
              <p className="text-sm text-slate-400">AI正在创作中...</p>
              <p className="text-xs text-slate-600">这可能需要几秒钟</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <AlertCircle size={24} className="text-rose-400" />
              </div>
              <p className="text-sm text-slate-400">生成失败</p>
              <p className="text-xs text-rose-400/80 max-w-xs text-center">{error}</p>
            </div>
          ) : showComparison && originalText ? (
            // 对比模式
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase mb-2 font-bold">原文</p>
                <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {originalText}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Sparkles size={14} className="text-violet-400" />
                </div>
              </div>
              <div className="bg-violet-900/10 rounded-lg p-3 border border-violet-500/30">
                <p className="text-[10px] text-violet-400 uppercase mb-2 font-bold">润色后</p>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              </div>
            </div>
          ) : (
            // 普通模式
            <div className="space-y-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-violet-400 text-xs">
                  <div className="w-3 h-3 rounded-full border border-violet-400/30 border-t-violet-400 animate-spin" />
                  生成中...
                </div>
              )}
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {content || '等待生成...'}
                  {isLoading && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-1 animate-pulse" />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-slate-800 p-4 bg-slate-900/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            disabled={isLoading || !content || !!error}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-medium transition-all"
          >
            <Check size={16} />
            {actionType === 'continue' ? '插入续写' : '应用润色'}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg font-medium transition-all"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">重新生成</span>
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-50 text-slate-300 rounded-lg font-medium transition-all"
          >
            <X size={16} />
            <span className="hidden sm:inline">放弃</span>
          </button>
        </div>
        
        {/* 快捷提示 */}
        <p className="text-[10px] text-slate-600 text-center mt-2">
          {actionType === 'continue' 
            ? '插入续写会将内容添加到编辑器末尾' 
            : '应用润色会替换选中的文字'}
        </p>
      </div>
    </div>
  );
};

export default AiSuggestionPanel;
