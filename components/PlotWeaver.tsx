/**
 * Plot Weaver - 大纲编织机
 * Phase 2 Week 7-8: 剧情规划 + 节拍管理
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ProjectState, PlotNode, PlotArc, Beat } from '../types';
import { 
  GitGraph, 
  Plus, 
  ArrowRight, 
  Trash2, 
  Edit2, 
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Layout,
  TreePine,
  Settings,
  Sparkles,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  Layers
} from 'lucide-react';

interface PlotWeaverProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

// 节拍卡片
const BeatCard: React.FC<{
  beat: Beat;
  index: number;
  onUpdate: (updated: Beat) => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ beat, index, onUpdate, onDelete, isSelected, onSelect }) => {
  const typeColors = {
    SETUP: { bg: 'bg-slate-800', border: 'border-slate-600', icon: '⏱️' },
    INCITING: { bg: 'bg-amber-900/30', border: 'border-amber-500/50', icon: '⚡' },
    RISING: { bg: 'bg-blue-900/30', border: 'border-blue-500/50', icon: '📈' },
    MIDPOINT: { bg: 'bg-violet-900/30', border: 'border-violet-500/50', icon: '🔀' },
    CRISIS: { bg: 'bg-red-900/30', border: 'border-red-500/50', icon: '⚠️' },
    CLIMAX: { bg: 'bg-rose-900/30', border: 'border-rose-500/50', icon: '🔥' },
    RESOLUTION: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/50', icon: '✨' }
  };
  
  const colors = typeColors[beat.type] || typeColors.SETUP;
  
  return (
    <div
      onClick={onSelect}
      className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900' : ''
      } ${colors.bg} ${colors.border} hover:shadow-lg hover:shadow-violet-500/10`}
    >
      <div className="p-3">
        {/* 头部 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{colors.icon}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {beat.type}
          </span>
          <span className="text-xs text-slate-600">#{index + 1}</span>
        </div>
        
        {/* 标题 */}
        <input
          value={beat.title}
          onChange={(e) => onUpdate({ ...beat, title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-sm font-medium text-slate-200 focus:outline-none focus:text-white placeholder-slate-600"
          placeholder="节拍标题..."
        />
        
        {/* 描述 */}
        <textarea
          value={beat.description}
          onChange={(e) => onUpdate({ ...beat, description: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          rows={2}
          className="w-full bg-transparent text-xs text-slate-400 focus:outline-none resize-none mt-1 placeholder-slate-600"
          placeholder="描述..."
        />
        
        {/* 底部信息 */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {beat.wordCountHint && (
              <span className="flex items-center gap-1">
                <Target size={10} />
                {beat.wordCountHint.toLocaleString()} 字
              </span>
            )}
            {beat.chapterId && (
              <span className="flex items-center gap-1 text-violet-400">
                <CheckCircle2 size={10} />
                已绑定
              </span>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {/* 连接线（向下） */}
      <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-slate-700 transform -translate-x-1/2" />
    </div>
  );
};

// 剧情弧卡片
const ArcCard: React.FC<{
  arc: PlotArc;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: PlotArc) => void;
}> = ({ arc, isSelected, onSelect, onUpdate }) => {
  const statusColors = {
    PLANNED: 'bg-slate-700 text-slate-400',
    ACTIVE: 'bg-violet-600 text-white',
    RESOLVED: 'bg-emerald-600 text-white'
  };
  
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-violet-500 bg-violet-900/20' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-200">{arc.name}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[arc.status]}`}>
              {arc.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{arc.type}</p>
        </div>
        
        <div className="flex items-center gap-1">
          {arc.involvedCharacterIds.map(charId => (
            <div key={charId} className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
          ))}
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>进度</span>
          <span>{arc.progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
            style={{ width: `${arc.progress}%` }}
          />
        </div>
      </div>
      
      {/* 目标进度 */}
      <div className="mt-3 space-y-1">
        {arc.objectives.slice(0, 2).map((obj, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            {obj.completed ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-slate-600" />
            )}
            <span className={obj.completed ? 'text-slate-500 line-through' : 'text-slate-400'}>
              {obj.description}
            </span>
          </div>
        ))}
        {arc.objectives.length > 2 && (
          <p className="text-xs text-slate-600 ml-5">
            +{arc.objectives.length - 2} 个目标
          </p>
        )}
      </div>
    </div>
  );
};

export const PlotWeaver: React.FC<PlotWeaverProps> = ({
  project,
  updateProject
}) => {
  const [activeView, setActiveView] = useState<'beats' | 'arcs' | 'timeline'>('beats');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isAddingArc, setIsAddingArc] = useState(false);
  
  // 获取选中的剧情节点
  const selectedNode = project.plotNodes.find(n => n.id === selectedNodeId);
  const selectedArc = project.plotArcs.find(a => a.id === selectedArcId);
  
  // 添加新剧情节点
  const handleAddNode = () => {
    const newNode: PlotNode = {
      id: `node-${Date.now()}`,
      title: '新剧情节点',
      name: '新剧情节点',
      description: '',
      content: '',
      type: 'BATTLE',
      order: project.plotNodes.length,
      beats: [],
      chapterIds: [],
      estimatedWordCount: 3000,
      tension: 50,
      involvedCharacterIds: []
    };
    
    updateProject({
      plotNodes: [...project.plotNodes, newNode]
    });
    setSelectedNodeId(newNode.id);
    setIsAddingNode(false);
  };
  
  // 添加新剧情弧
  const handleAddArc = () => {
    const newArc: PlotArc = {
      id: `arc-${Date.now()}`,
      name: '新剧情弧',
      type: 'MAIN',
      status: 'PLANNED',
      involvedCharacterIds: [],
      relatedWorldIds: [],
      relatedPlotNodeIds: [],
      progress: 0,
      objectives: []
    };
    
    updateProject({
      plotArcs: [...project.plotArcs, newArc]
    });
    setSelectedArcId(newArc.id);
    setIsAddingArc(false);
  };
  
  // 更新节点
  const handleUpdateNode = (updated: PlotNode) => {
    updateProject({
      plotNodes: project.plotNodes.map(n => n.id === updated.id ? updated : n)
    });
  };
  
  // 更新剧情弧
  const handleUpdateArc = (updated: PlotArc) => {
    updateProject({
      plotArcs: project.plotArcs.map(a => a.id === updated.id ? updated : a)
    });
  };
  
  // 添加节拍
  const handleAddBeat = (nodeId: string) => {
    const node = project.plotNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const newBeat: Beat = {
      id: `beat-${Date.now()}`,
      type: 'RISING',
      title: '',
      description: '',
      order: node.beats?.length || 0
    };
    
    handleUpdateNode({
      ...node,
      beats: [...(node.beats || []), newBeat]
    });
  };
  
  // 更新节拍
  const handleUpdateBeat = (nodeId: string, updated: Beat) => {
    const node = project.plotNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    handleUpdateNode({
      ...node,
      beats: (node.beats || []).map(b => b.id === updated.id ? updated : b)
    });
  };
  
  // 删除节拍
  const handleDeleteBeat = (nodeId: string, beatId: string) => {
    const node = project.plotNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    handleUpdateNode({
      ...node,
      beats: (node.beats || []).filter(b => b.id !== beatId)
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* 头部工具栏 */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <GitGraph className="text-violet-400" size={20} />
          <h2 className="text-lg font-bold text-white">大纲编织机</h2>
          
          {/* 视图切换 */}
          <div className="flex bg-slate-900 rounded-lg p-1 ml-6">
            {[
              { key: 'beats', label: '剧情节点', icon: Layout },
              { key: 'arcs', label: '剧情弧', icon: TreePine },
              { key: 'timeline', label: '时间线', icon: Clock }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeView === key
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={activeView === 'beats' ? handleAddNode : handleAddArc}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            {activeView === 'beats' ? '新建节点' : '新建剧情弧'}
          </button>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧列表 */}
        <div className="w-80 border-r border-slate-800 overflow-y-auto">
          {activeView === 'beats' && (
            <div className="p-4 space-y-3">
              {project.plotNodes.map(node => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedNodeId === node.id
                      ? 'border-violet-500 bg-violet-900/20'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{node.name}</span>
                    <span className="text-xs text-slate-600 px-2 py-0.5 bg-slate-800 rounded">
                      {node.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {node.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    <span>{node.beats?.length || 0} 节拍</span>
                    <span>{node.chapterIds?.length || 0} 章节</span>
                    <span className="flex items-center gap-1">
                      <Target size={10} />
                      {((node.estimatedWordCount || 0) / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              ))}
              
              {project.plotNodes.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  <Layout size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无剧情节点</p>
                  <p className="text-sm mt-1">点击上方按钮创建</p>
                </div>
              )}
            </div>
          )}
          
          {activeView === 'arcs' && (
            <div className="p-4 space-y-3">
              {project.plotArcs.map(arc => (
                <ArcCard
                  key={arc.id}
                  arc={arc}
                  isSelected={selectedArcId === arc.id}
                  onSelect={() => setSelectedArcId(arc.id)}
                  onUpdate={handleUpdateArc}
                />
              ))}
              
              {project.plotArcs.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  <TreePine size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无剧情弧</p>
                  <p className="text-sm mt-1">点击上方按钮创建</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 中间/右侧详情区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeView === 'beats' && selectedNode && (
            <div className="max-w-2xl mx-auto">
              {/* 节点信息编辑 */}
              <div className="mb-8 p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                <input
                  value={selectedNode.name}
                  onChange={(e) => handleUpdateNode({ ...selectedNode, name: e.target.value })}
                  className="w-full text-2xl font-bold bg-transparent text-white focus:outline-none placeholder-slate-600"
                  placeholder="节点名称..."
                />
                <textarea
                  value={selectedNode.description}
                  onChange={(e) => handleUpdateNode({ ...selectedNode, description: e.target.value })}
                  rows={2}
                  className="w-full mt-2 bg-transparent text-slate-400 focus:outline-none resize-none placeholder-slate-600"
                  placeholder="节点描述..."
                />
                
                <div className="flex gap-4 mt-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">类型</label>
                    <select
                      value={selectedNode.type}
                      onChange={(e) => handleUpdateNode({ ...selectedNode, type: e.target.value as any })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                    >
                      <option value="BATTLE">战斗</option>
                      <option value="POLITICAL">政治</option>
                      <option value="EMOTIONAL">情感</option>
                      <option value="MYSTERY">悬疑</option>
                      <option value="TRANSITION">过渡</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">预计字数</label>
                    <input
                      type="number"
                      value={selectedNode.estimatedWordCount}
                      onChange={(e) => handleUpdateNode({ ...selectedNode, estimatedWordCount: parseInt(e.target.value) || 0 })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-32"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">张力</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedNode.tension}
                      onChange={(e) => handleUpdateNode({ ...selectedNode, tension: parseInt(e.target.value) })}
                      className="w-32 mt-2"
                    />
                  </div>
                </div>
              </div>
              
              {/* 节拍链 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">节拍链</h3>
                  <button
                    onClick={() => handleAddBeat(selectedNode.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                  >
                    <Plus size={14} />
                    添加节拍
                  </button>
                </div>
                
                <div className="space-y-6">
                  {(selectedNode.beats || []).map((beat, idx) => (
                    <BeatCard
                      key={beat.id}
                      beat={beat}
                      index={idx}
                      onUpdate={(updated) => handleUpdateBeat(selectedNode.id, updated)}
                      onDelete={() => handleDeleteBeat(selectedNode.id, beat.id)}
                      isSelected={false}
                      onSelect={() => {}}
                    />
                  ))}
                  
                  {(selectedNode.beats || []).length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                      <Layers size={32} className="mx-auto mb-2 text-slate-600" />
                      <p className="text-slate-500">点击上方添加节拍</p>
                      <p className="text-xs text-slate-600 mt-1">
                        建议：SETUP → INCITING → RISING → MIDPOINT → CRISIS → CLIMAX → RESOLUTION
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeView === 'arcs' && selectedArc && (
            <div className="max-w-2xl mx-auto space-y-6">
              <input
                value={selectedArc.name}
                onChange={(e) => handleUpdateArc({ ...selectedArc, name: e.target.value })}
                className="w-full text-2xl font-bold bg-transparent text-white focus:outline-none"
              />
              
              {/* 剧情弧详情编辑 */}
              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-2">类型</label>
                  <select
                    value={selectedArc.type}
                    onChange={(e) => handleUpdateArc({ ...selectedArc, type: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    <option value="MAIN">主线</option>
                    <option value="SUB">支线</option>
                    <option value="ROMANCE">感情线</option>
                    <option value="MYSTERY">悬疑线</option>
                    <option value="CHARACTER">角色成长</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-slate-500 block mb-2">状态</label>
                  <select
                    value={selectedArc.status}
                    onChange={(e) => handleUpdateArc({ ...selectedArc, status: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    <option value="PLANNED">规划中</option>
                    <option value="ACTIVE">进行中</option>
                    <option value="RESOLVED">已完结</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-slate-500 block mb-2">进度</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedArc.progress}
                    onChange={(e) => handleUpdateArc({ ...selectedArc, progress: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm text-slate-400">{selectedArc.progress}%</span>
                </div>
              </div>
              
              {/* 目标列表 */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">剧情目标</h3>
                <div className="space-y-2">
                  {selectedArc.objectives.map((obj, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={obj.completed}
                        onChange={(e) => {
                          const newObjectives = [...selectedArc.objectives];
                          newObjectives[idx] = { ...obj, completed: e.target.checked };
                          handleUpdateArc({ ...selectedArc, objectives: newObjectives });
                        }}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                      />
                      <span className={obj.completed ? 'text-slate-500 line-through' : 'text-slate-300'}>
                        {obj.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {!selectedNode && activeView === 'beats' && (
            <div className="h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <Layout size={64} className="mx-auto mb-4 opacity-30" />
                <p>选择一个剧情节点查看详情</p>
              </div>
            </div>
          )}
          
          {!selectedArc && activeView === 'arcs' && (
            <div className="h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <TreePine size={64} className="mx-auto mb-4 opacity-30" />
                <p>选择一个剧情弧查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
