/**
 * Echo Panel - 命运回响管理面板
 * Phase 2 Week 5-6: 连锁反应推演 + 记忆固化
 */

import React, { useState, useMemo } from 'react';
import { ProjectState, Echo, AppSection } from '../types';
import { echoService, deduceCascadeEffects } from '../services/echoService';
import { useProjectStore } from '../store/useProjectStore';
import {
  Bell,
  CheckCircle,
  XCircle,
  Archive,
  User,
  Globe,
  Users,
  BookOpen,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Filter,
  CheckSquare,
  ExternalLink,
  Sparkles,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface EchoPanelProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

type EchoStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ARCHIVED' | 'ALL';
type EchoType = 'CHARACTER' | 'WORLD' | 'RELATIONSHIP' | 'PLOT' | 'ALL';
type SortOrder = 'newest' | 'oldest';

interface CascadeEffect {
  description: string;
  affectedEntities: string[];
  probability: number;
  timeFrame: 'immediate' | 'short' | 'long';
}

export const EchoPanel: React.FC<EchoPanelProps> = ({ project, updateProject }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<EchoStatus>('PENDING');
  const [typeFilter, setTypeFilter] = useState<EchoType>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedEchoes, setSelectedEchoes] = useState<Set<string>>(new Set());
  const [expandedEchoes, setExpandedEchoes] = useState<Set<string>>(new Set());
  const [viewingSource, setViewingSource] = useState<string | null>(null);
  const { setActiveSection } = useProjectStore();

  // 统计数量
  const stats = useMemo(() => ({
    pending: project.echoes?.filter(e => e.status === 'PENDING').length || 0,
    accepted: project.echoes?.filter(e => e.status === 'ACCEPTED').length || 0,
    rejected: project.echoes?.filter(e => e.status === 'REJECTED').length || 0,
    archived: project.echoes?.filter(e => e.status === 'ARCHIVED').length || 0,
    total: project.echoes?.length || 0
  }), [project.echoes]);

  // 过滤和排序Echo列表
  const filteredEchoes = useMemo(() => {
    let echoes = project.echoes || [];
    
    // 状态过滤
    if (activeStatusTab !== 'ALL') {
      echoes = echoes.filter(e => e.status === activeStatusTab);
    }
    
    // 类型过滤
    if (typeFilter !== 'ALL') {
      echoes = echoes.filter(e => e.type === typeFilter);
    }
    
    // 排序
    echoes = [...echoes].sort((a, b) => {
      return sortOrder === 'newest' 
        ? b.timestamp - a.timestamp 
        : a.timestamp - b.timestamp;
    });
    
    return echoes;
  }, [project.echoes, activeStatusTab, typeFilter, sortOrder]);

  // 获取类型图标
  const getTypeIcon = (type: Echo['type']) => {
    switch (type) {
      case 'CHARACTER': return <User size={14} className="text-sky-400" />;
      case 'WORLD': return <Globe size={14} className="text-emerald-400" />;
      case 'RELATIONSHIP': return <Users size={14} className="text-rose-400" />;
      case 'PLOT': return <BookOpen size={14} className="text-amber-400" />;
      default: return <Bell size={14} className="text-slate-400" />;
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: Echo['type']) => {
    switch (type) {
      case 'CHARACTER': return '角色';
      case 'WORLD': return '世界观';
      case 'RELATIONSHIP': return '关系';
      case 'PLOT': return '剧情';
      default: return type;
    }
  };

  // 获取状态样式
  const getStatusStyle = (status: Echo['status']) => {
    switch (status) {
      case 'PENDING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-400',
          label: '待处理'
        };
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          badge: 'bg-emerald-500/20 text-emerald-400',
          label: '已接受'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-400',
          label: '已拒绝'
        };
      case 'ARCHIVED':
        return {
          bg: 'bg-slate-500/10 border-slate-500/30',
          badge: 'bg-slate-500/20 text-slate-400',
          label: '已归档'
        };
      case 'PREDICTION':
        return {
          bg: 'bg-violet-500/10 border-violet-500/30',
          badge: 'bg-violet-500/20 text-violet-400',
          label: '预测'
        };
      default:
        return {
          bg: 'bg-slate-700/30 border-slate-700',
          badge: 'bg-slate-600 text-slate-300',
          label: status
        };
    }
  };

  // 接受Echo
  const handleAccept = (echoId: string) => {
    const updated = echoService.acceptEcho(project, echoId);
    updateProject({ echoes: updated.echoes });
  };

  // 拒绝Echo
  const handleReject = (echoId: string) => {
    const updated = echoService.rejectEcho(project, echoId);
    updateProject({ echoes: updated.echoes });
  };

  // 归档Echo
  const handleArchive = (entityId: string) => {
    const updated = echoService.archiveEchoes(project, entityId);
    updateProject({ echoes: updated.echoes });
  };

  // 批量接受
  const handleBatchAccept = () => {
    let updated = project;
    selectedEchoes.forEach(echoId => {
      updated = echoService.acceptEcho(updated, echoId);
    });
    updateProject({ echoes: updated.echoes });
    setSelectedEchoes(new Set());
  };

  // 批量拒绝
  const handleBatchReject = () => {
    let updated = project;
    selectedEchoes.forEach(echoId => {
      updated = echoService.rejectEcho(updated, echoId);
    });
    updateProject({ echoes: updated.echoes });
    setSelectedEchoes(new Set());
  };

  // 一键归档已处理
  const handleArchiveAllAccepted = () => {
    const acceptedEchoes = project.echoes?.filter(e => e.status === 'ACCEPTED') || [];
    const entityIds = new Set(acceptedEchoes.map(e => e.targetId));
    
    let updated = project;
    entityIds.forEach(entityId => {
      updated = echoService.archiveEchoes(updated, entityId);
    });
    updateProject({ echoes: updated.echoes });
  };

  // 切换选择
  const toggleSelection = (echoId: string) => {
    const newSet = new Set(selectedEchoes);
    if (newSet.has(echoId)) {
      newSet.delete(echoId);
    } else {
      newSet.add(echoId);
    }
    setSelectedEchoes(newSet);
  };

  // 全选
  const selectAll = () => {
    if (selectedEchoes.size === filteredEchoes.length) {
      setSelectedEchoes(new Set());
    } else {
      setSelectedEchoes(new Set(filteredEchoes.map(e => e.id)));
    }
  };

  // 切换展开
  const toggleExpand = (echoId: string) => {
    const newSet = new Set(expandedEchoes);
    if (newSet.has(echoId)) {
      newSet.delete(echoId);
    } else {
      newSet.add(echoId);
    }
    setExpandedEchoes(newSet);
  };



  // 时间格式化
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 跳转到相关实体
  const navigateToEntity = (echo: Echo) => {
    if (echo.type === 'CHARACTER') {
      setActiveSection(AppSection.CHARACTERS);
    } else if (echo.type === 'WORLD') {
      setActiveSection(AppSection.WORLD);
    } else if (echo.type === 'PLOT') {
      setActiveSection(AppSection.PLOT);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* 头部 */}
      <header className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white font-serif flex items-center gap-3">
            <Bell size={28} className="text-violet-400" />
            命运回响
          </h1>
          <p className="text-slate-400">
            管理故事中的状态变化，追踪角色成长与世界演变。
          </p>
        </div>
        
        {/* 统计概览 */}
        <div className="flex gap-3">
          {[
            { label: '待处理', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: '已接受', value: stats.accepted, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: '已归档', value: stats.archived, color: 'text-slate-400', bg: 'bg-slate-500/10' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-lg px-4 py-2 text-center`}>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* 状态标签切换 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex gap-1">
          {[
            { id: 'PENDING' as EchoStatus, label: '待处理', count: stats.pending, icon: AlertTriangle },
            { id: 'ACCEPTED' as EchoStatus, label: '已接受', count: stats.accepted, icon: CheckCircle },
            { id: 'REJECTED' as EchoStatus, label: '已拒绝', count: stats.rejected, icon: XCircle },
            { id: 'ARCHIVED' as EchoStatus, label: '已归档', count: stats.archived, icon: Archive },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeStatusTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  activeStatusTab === tab.id ? 'bg-white/20' : 'bg-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 批量操作 */}
        {selectedEchoes.size > 0 && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-slate-400">
              已选择 {selectedEchoes.size} 项
            </span>
            <button
              onClick={handleBatchAccept}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle size={14} />
              接受
            </button>
            <button
              onClick={handleBatchReject}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors"
            >
              <XCircle size={14} />
              拒绝
            </button>
            <button
              onClick={() => setSelectedEchoes(new Set())}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              取消
            </button>
          </div>
        )}

        {/* 一键归档按钮 */}
        {activeStatusTab === 'ACCEPTED' && stats.accepted > 0 && selectedEchoes.size === 0 && (
          <button
            onClick={handleArchiveAllAccepted}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
          >
            <Archive size={14} />
            一键归档
          </button>
        )}
      </div>

      {/* 过滤器栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 类型过滤器 */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EchoType)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-violet-500 outline-none"
            >
              <option value="ALL">全部类型</option>
              <option value="CHARACTER">角色</option>
              <option value="WORLD">世界观</option>
              <option value="RELATIONSHIP">关系</option>
              <option value="PLOT">剧情</option>
            </select>
          </div>

          {/* 排序 */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-violet-500 outline-none"
          >
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
          </select>
        </div>

        {/* 全选按钮 */}
        {filteredEchoes.length > 0 && (
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <CheckSquare size={16} className={selectedEchoes.size === filteredEchoes.length ? 'text-violet-400' : ''} />
            {selectedEchoes.size === filteredEchoes.length ? '取消全选' : '全选'}
          </button>
        )}
      </div>

      {/* Echo列表 */}
      <div className="space-y-3">
        {filteredEchoes.length === 0 ? (
          /* 空状态 */
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-400 mb-2">
              {activeStatusTab === 'PENDING' ? '没有待处理的回响' : '暂无相关回响'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {activeStatusTab === 'PENDING' 
                ? '当你在写作中创造重要的剧情转折时，系统会自动检测并创建回响。'
                : '切换到其他状态标签查看已处理的回响记录。'}
            </p>
          </div>
        ) : (
          filteredEchoes.map(echo => {
            const statusStyle = getStatusStyle(echo.status);
            const isExpanded = expandedEchoes.has(echo.id);
            const isSelected = selectedEchoes.has(echo.id);
            const cascadeEffects = isExpanded ? deduceCascadeEffects(echo, project) : [];

            return (
              <div
                key={echo.id}
                className={`group relative bg-slate-900/50 border rounded-xl overflow-hidden transition-all hover:border-slate-600 ${
                  isSelected ? 'border-violet-500 ring-1 ring-violet-500/30' : statusStyle.bg
                }`}
              >
                {/* 选择框 */}
                <div className="absolute left-3 top-4 z-10">
                  <button
                    onClick={() => toggleSelection(echo.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-violet-600 border-violet-600' 
                        : 'border-slate-600 hover:border-slate-400 bg-slate-800/50'
                    }`}
                  >
                    {isSelected && <CheckCircle size={12} className="text-white" />}
                  </button>
                </div>

                <div className="p-4 pl-10">
                  {/* 头部信息 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-lg">
                        {getTypeIcon(echo.type)}
                        <span className="text-xs text-slate-400">{getTypeLabel(echo.type)}</span>
                      </div>
                      <h4 className="font-bold text-white">{echo.targetName}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.badge}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} />
                      {formatTime(echo.timestamp)}
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-slate-300 text-sm mb-2">{echo.description}</p>

                  {/* 原因 */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <Sparkles size={12} className="text-violet-400" />
                    <span>{echo.reason}</span>
                  </div>

                  {/* 连锁反应预览 */}
                  {echo.status === 'PENDING' && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => toggleExpand(echo.id)}
                        className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors mb-2"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Zap size={14} />
                        连锁反应预测
                        {cascadeEffects.length > 0 && ` (${cascadeEffects.length})`}
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 animate-fade-in">
                          {cascadeEffects.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">暂无明显连锁反应</p>
                          ) : (
                            cascadeEffects.map((effect, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 p-2 bg-slate-800/50 rounded-lg"
                              >
                                <div className="mt-0.5">
                                  <Zap size={12} className="text-amber-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-slate-300">{effect.description}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-slate-500">
                                      概率: {Math.round(effect.probability * 100)}%
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      时效: {
                                        effect.timeFrame === 'immediate' ? '即时' :
                                        effect.timeFrame === 'short' ? '短期' : '长期'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 已接受的连锁反应显示 */}
                  {echo.status === 'ACCEPTED' && echo.cascadeEffects && echo.cascadeEffects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
                        <Zap size={14} />
                        已确认的连锁反应
                      </div>
                      <div className="space-y-1">
                        {echo.cascadeEffects.map((effect, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="text-emerald-500">✓</span>
                            {effect.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 mt-4">
                    {echo.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAccept(echo.id)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle size={14} />
                          接受
                        </button>
                        <button
                          onClick={() => handleReject(echo.id)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle size={14} />
                          拒绝
                        </button>
                      </>
                    )}
                    
                    {echo.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleArchive(echo.targetId)}
                        className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Archive size={14} />
                        归档
                      </button>
                    )}

                    <button
                      onClick={() => setViewingSource(echo.id)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-300 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink size={14} />
                      查看原文
                    </button>

                    <button
                      onClick={() => navigateToEntity(echo)}
                      className="px-3 py-1.5 text-slate-500 hover:text-violet-400 rounded-lg text-sm flex items-center gap-1.5 transition-colors ml-auto"
                    >
                      前往实体
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 查看原文弹窗 */}
      {viewingSource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-bold text-white">来源章节</h3>
              <button
                onClick={() => setViewingSource(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {(() => {
                const echo = project.echoes?.find(e => e.id === viewingSource);
                const chapter = project.chapters?.find(ch => 
                  echo?.reason?.includes(ch.title)
                );
                
                if (!chapter) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                      <p>无法找到来源章节</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <h4 className="font-medium text-white">{chapter.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        最后修改: {new Date(chapter.lastModified).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {chapter.content || '暂无内容'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EchoPanel;
