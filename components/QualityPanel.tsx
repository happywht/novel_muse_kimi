/**
 * Quality Panel - 质量检查面板（增强版）
 * Phase 1 Week 3: 实时一致性检查 + AI 深度分析
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ProjectState, Chapter, QualityIssue, QualityReport } from '../types';
import { qualityService, EnhancedQualityReport, QualityCheckOptions } from '../services/qualityService';
// isAIEnabled 检查 - 临时实现，实际应该检查AI配置
const isAIEnabled = () => {
  return !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GLM_API_KEY);
};
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  RefreshCw,
  AlertTriangle,
  X,
  Sparkles,
  Brain,
  Clock,
  XCircle
} from 'lucide-react';

interface QualityPanelProps {
  project: ProjectState;
  currentChapter?: Chapter;
  isOpen: boolean;
  onClose: () => void;
}

// AI 问题分类标签
const IssueCategoryLabels: Record<string, { label: string; color: string }> = {
  CONSISTENCY: { label: '一致性', color: 'text-rose-400' },
  PACING: { label: '叙事节奏', color: 'text-amber-400' },
  STYLE: { label: '写作技巧', color: 'text-purple-400' },
  GRAMMAR: { label: '语言质量', color: 'text-sky-400' },
  LOGIC: { label: '逻辑', color: 'text-orange-400' }
};

export const QualityPanel: React.FC<QualityPanelProps> = ({
  project,
  currentChapter,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'project'>('current');
  const [isChecking, setIsChecking] = useState(false);
  const [currentReport, setCurrentReport] = useState<EnhancedQualityReport | null>(null);
  const [projectCheck, setProjectCheck] = useState<{
    globalIssues: QualityIssue[];
    chapterReports: QualityReport[];
  } | null>(null);
  
  // AI 深度检查相关状态
  const [useDeepCheck, setUseDeepCheck] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAIResults, setShowAIResults] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检查 AI 是否可用
  useEffect(() => {
    setAiAvailable(isAIEnabled());
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 检查当前章节
  const checkCurrentChapter = useCallback(async (options?: QualityCheckOptions) => {
    if (!currentChapter) return;
    
    // 取消之前的检查
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsChecking(true);
    setAiError(null);
    
    try {
      const report = await qualityService.generateReport(
        currentChapter, 
        project,
        {
          useAI: useDeepCheck && aiAvailable,
          signal: abortControllerRef.current.signal,
          ...options
        }
      );
      setCurrentReport(report);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Quality check failed:', error);
        setAiError(error.message || '检查失败');
      }
    } finally {
      setIsChecking(false);
      abortControllerRef.current = null;
    }
  }, [currentChapter, project, useDeepCheck, aiAvailable]);

  // 取消检查
  const cancelCheck = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsChecking(false);
    setAiError(null);
  }, []);

  // 检查整个项目
  const checkProject = useCallback(() => {
    setIsChecking(true);
    
    // 项目级检查不使用 AI，仅基础检查
    setTimeout(() => {
      const result = qualityService.checkProjectConsistency(project);
      setProjectCheck(result);
      setIsChecking(false);
    }, 500);
  }, [project]);

  // 自动检查当前章节（防抖）
  useEffect(() => {
    if (currentChapter && activeTab === 'current') {
      const timer = setTimeout(() => {
        checkCurrentChapter();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentChapter?.id, currentChapter?.content, activeTab, useDeepCheck]);

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return <AlertCircle size={16} className="text-rose-500" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-500" />;
      case 'INFO':
      default:
        return <Info size={16} className="text-sky-500" />;
    }
  };

  // 获取严重程度样式
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'WARNING':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'INFO':
      default:
        return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
    }
  };

  // 获取问题类型标签
  const getIssueTypeLabel = (type: string) => {
    const config = IssueCategoryLabels[type] || { label: type, color: 'text-slate-400' };
    return <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>;
  };

  // 计算项目整体质量
  const projectQuality = useMemo(() => {
    if (!projectCheck?.chapterReports.length) return null;
    
    const totalScore = projectCheck.chapterReports.reduce((sum, r) => sum + r.score, 0);
    const averageScore = Math.round(totalScore / projectCheck.chapterReports.length);
    const totalErrors = projectCheck.chapterReports.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'ERROR').length, 0
    );
    const totalWarnings = projectCheck.chapterReports.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'WARNING').length, 0
    );
    
    return { averageScore, totalErrors, totalWarnings };
  }, [projectCheck]);

  // 分离基础问题和 AI 问题
  const { basicIssues, aiIssues } = useMemo(() => {
    if (!currentReport) return { basicIssues: [], aiIssues: [] };
    return {
      basicIssues: currentReport.basicIssues || [],
      aiIssues: currentReport.aiIssues || []
    };
  }, [currentReport]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 animate-slide-in-right flex flex-col">
      {/* 头部 */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" />
          <h3 className="font-bold text-white">质量检查</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'current'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          当前章节
        </button>
        <button
          onClick={() => setActiveTab('project')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'project'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          项目整体
        </button>
      </div>

      {/* AI 深度检查开关 - 仅在当前章节标签显示 */}
      {activeTab === 'current' && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={16} className={useDeepCheck && aiAvailable ? "text-purple-400" : "text-slate-500"} />
              <span className="text-sm text-slate-300">AI 深度检查</span>
              {!aiAvailable && (
                <span className="text-xs text-slate-500" title="AI 未配置，将使用基础检查">
                  (未配置)
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setUseDeepCheck(!useDeepCheck);
                // 切换后立即重新检查
                if (currentChapter) {
                  checkCurrentChapter({ skipCache: true });
                }
              }}
              disabled={!aiAvailable || isChecking}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                useDeepCheck && aiAvailable ? 'bg-purple-600' : 'bg-slate-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  useDeepCheck && aiAvailable ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {useDeepCheck && aiAvailable && (
            <p className="text-xs text-slate-500 mt-1">
              使用 AI 进行一致性、叙事、技巧等深度分析
            </p>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {activeTab === 'current' ? (
          <>
            {currentChapter ? (
              <>
                {/* 分数显示 */}
                {currentReport && (
                  <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">质量评分</span>
                      <div className="flex items-center gap-2">
                        {currentReport.aiAnalysis?.aiProcessed && (
                          <span title="AI 分析完成">
                            <Sparkles size={14} className="text-purple-400" />
                          </span>
                        )}
                        <span className={`text-2xl font-bold ${
                          currentReport.score >= 80 ? 'text-emerald-400' :
                          currentReport.score >= 60 ? 'text-amber-400' :
                          'text-rose-400'
                        }`}>
                          {currentReport.score}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          currentReport.score >= 80 ? 'bg-emerald-500' :
                          currentReport.score >= 60 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${currentReport.score}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-3 text-xs">
                      <span className="text-rose-400">
                        错误: {currentReport.issues.filter(i => i.severity === 'ERROR').length}
                      </span>
                      <span className="text-amber-400">
                        警告: {currentReport.issues.filter(i => i.severity === 'WARNING').length}
                      </span>
                      <span className="text-sky-400">
                        建议: {currentReport.issues.filter(i => i.severity === 'INFO').length}
                      </span>
                    </div>
                  </div>
                )}

                {/* AI 分析摘要 */}
                {currentReport?.aiAnalysis?.aiProcessed && (
                  <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-purple-400" />
                      <span className="text-sm font-medium text-purple-300">AI 分析摘要</span>
                    </div>
                    {currentReport.aiAnalysis.strengths.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-slate-500">优点：</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentReport.aiAnalysis.strengths.map((strength, idx) => (
                            <span key={idx} className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {currentReport.aiAnalysis.weaknesses.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-500">改进空间：</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentReport.aiAnalysis.weaknesses.map((weakness, idx) => (
                            <span key={idx} className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                              {weakness}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 加载状态 */}
                {isChecking && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <RefreshCw size={24} className="animate-spin text-emerald-400 mb-3" />
                    <span className="text-slate-400">AI 分析中...</span>
                    <span className="text-xs text-slate-500 mt-1">这可能需要几秒钟</span>
                    <button
                      onClick={cancelCheck}
                      className="mt-3 text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1"
                    >
                      <XCircle size={12} />
                      取消
                    </button>
                  </div>
                )}

                {/* 错误状态 */}
                {aiError && !isChecking && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-rose-400">AI 分析失败</p>
                        <p className="text-xs text-slate-500 mt-1">{aiError}</p>
                        <button
                          onClick={() => checkCurrentChapter()}
                          className="text-xs text-emerald-400 hover:text-emerald-300 mt-2"
                        >
                          重试
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 问题列表 */}
                {!isChecking && (
                  <>
                    {/* AI 问题切换 */}
                    {aiIssues.length > 0 && (
                      <div className="mb-3 flex items-center gap-2">
                        <button
                          onClick={() => setShowAIResults(!showAIResults)}
                          className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300"
                        >
                          <Brain size={12} />
                          AI 发现 {aiIssues.length} 个问题
                          {showAIResults ? '▼' : '▶'}
                        </button>
                      </div>
                    )}

                    {currentReport?.issues.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                        <p className="text-emerald-400 font-medium">质量检查通过</p>
                        <p className="text-sm text-slate-500 mt-1">未发现明显问题</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 基础问题 */}
                        {basicIssues.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                              基础检查 ({basicIssues.length})
                            </h4>
                            <div className="space-y-2">
                              {basicIssues.map((issue, idx) => (
                                <IssueCard key={`basic-${idx}`} issue={issue} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI 深度分析问题 */}
                        {showAIResults && aiIssues.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
                              <Brain size={12} />
                              AI 深度分析 ({aiIssues.length})
                            </h4>
                            <div className="space-y-2">
                              {aiIssues.map((issue, idx) => (
                                <IssueCard key={`ai-${idx}`} issue={issue} isAI />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-600">
                <p>未选择章节</p>
                <p className="text-sm mt-1">请先选择一个章节</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* 项目整体质量 */}
            {projectQuality ? (
              <>
                <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">项目平均分</span>
                    <span className={`text-2xl font-bold ${
                      projectQuality.averageScore >= 80 ? 'text-emerald-400' :
                      projectQuality.averageScore >= 60 ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {projectQuality.averageScore}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        projectQuality.averageScore >= 80 ? 'bg-emerald-500' :
                        projectQuality.averageScore >= 60 ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${projectQuality.averageScore}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="text-rose-400">
                      总错误: {projectQuality.totalErrors}
                    </span>
                    <span className="text-amber-400">
                      总警告: {projectQuality.totalWarnings}
                    </span>
                  </div>
                </div>

                {/* 全局问题 */}
                {projectCheck!.globalIssues.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">全局问题</h4>
                    <div className="space-y-2">
                      {projectCheck!.globalIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${getSeverityStyle(issue.severity)}`}
                        >
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <p className="text-sm">{issue.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 各章节报告 */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">各章节评分</h4>
                  <div className="space-y-2">
                    {projectCheck!.chapterReports.map(report => {
                      const chapter = project.chapters.find(ch => ch.id === report.chapterId);
                      if (!chapter) return null;
                      
                      return (
                        <div
                          key={report.chapterId}
                          className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 flex items-center justify-between"
                        >
                          <span className="text-sm text-slate-300 truncate flex-1">
                            {chapter.title}
                          </span>
                          <span className={`text-sm font-bold ${
                            report.score >= 80 ? 'text-emerald-400' :
                            report.score >= 60 ? 'text-amber-400' :
                            'text-rose-400'
                          }`}>
                            {report.score}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <button
                  onClick={checkProject}
                  disabled={isChecking}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      检查中...
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      开始检查
                    </>
                  )}
                </button>
                <p className="text-sm text-slate-500 mt-4">
                  分析整个项目的一致性
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// 问题卡片组件
interface IssueCardProps {
  issue: QualityIssue;
  isAI?: boolean;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, isAI }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'WARNING':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'INFO':
      default:
        return isAI 
          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
          : 'bg-sky-500/10 border-sky-500/30 text-sky-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return <AlertCircle size={16} className="text-rose-500" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-500" />;
      case 'INFO':
      default:
        return <Info size={16} className={isAI ? "text-purple-400" : "text-sky-500"} />;
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const config = IssueCategoryLabels[type] || { label: type, color: 'text-slate-400' };
    return <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>;
  };

  return (
    <div className={`p-3 rounded-lg border ${getSeverityStyle(issue.severity)}`}>
      <div className="flex items-start gap-2">
        {getSeverityIcon(issue.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {getIssueTypeLabel(issue.type)}
            {issue.severity !== 'INFO' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                issue.severity === 'ERROR' 
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {issue.severity === 'ERROR' ? '严重' : '警告'}
              </span>
            )}
          </div>
          <p className="text-sm font-medium mt-1">{issue.message}</p>
          <p className="text-xs opacity-70 mt-1">{issue.suggestion}</p>
        </div>
      </div>
    </div>
  );
};

export default QualityPanel;
