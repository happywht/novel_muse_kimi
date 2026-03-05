/**
 * KnowledgeGraphView - 知识图谱可视化组件
 * 展示角色关系网、世界观关联和事件关系
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  Search, 
  X, 
  RotateCcw, 
  Maximize2, 
  Users, 
  Globe, 
  Calendar, 
  Sparkles,
  Filter,
  Eye,
  EyeOff,
  ChevronRight,
  Target,
  Heart,
  Sword,
  GraduationCap,
  Users2,
  Trophy,
  MapPin,
  Home,
  Package,
  Link2,
  Zap,
  Trash2,
  GitBranch
} from 'lucide-react';
import { ProjectState, Character, WorldSetting, TimelineEvent, AppSection } from '../types';
import { 
  buildKnowledgeGraph, 
  calculateForceLayout,
  RELATIONSHIP_TYPES,
  GraphNode,
  GraphEdge,
  getNodeNeighbors
} from '../services/knowledgeGraphService';

// ============================================
// 类型定义
// ============================================

interface KnowledgeGraphViewProps {
  project: ProjectState;
  updateProject?: (updates: Partial<ProjectState>) => void;
  onNavigate?: (section: AppSection, data?: any) => void;
}

type NodeType = 'Character' | 'WorldSetting' | 'Event' | 'Echo';
type RelationshipType = keyof typeof RELATIONSHIP_TYPES | 'ALL';

// ============================================
// 样式配置
// ============================================

const NODE_COLORS: Record<NodeType, string> = {
  Character: '#8b5cf6',   // 紫色
  WorldSetting: '#06b6d4', // 青色
  Event: '#f59e0b',        // 琥珀色
  Echo: '#22d3ee'          // 青色
};

const NODE_SHAPES: Record<NodeType, string> = {
  Character: 'circle',
  WorldSetting: 'square',
  Event: 'diamond',
  Echo: 'hexagon'
};

const RELATIONSHIP_ICONS: Record<string, React.ReactNode> = {
  ENEMY_OF: <Sword size={14} />,
  LOVES: <Heart size={14} />,
  ALLY_OF: <Users2 size={14} />,
  MENTORS: <GraduationCap size={14} />,
  KIN_OF: <Users size={14} />,
  RIVAL_OF: <Trophy size={14} />,
  LOCATED_IN: <MapPin size={14} />,
  ORIGIN_FROM: <Home size={14} />,
  POSSESSES: <Package size={14} />,
  INVOLVED_IN: <Zap size={14} />,
  CAUSED: <Target size={14} />,
  PREVENTED: <Trash2 size={14} />,
  HAS_ECHO: <Sparkles size={14} />,
  RELATED_TO: <Link2 size={14} />
};

// ============================================
// 主组件
// ============================================

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  project,
  updateProject,
  onNavigate
}) => {
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  
  // 双击检测
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickRef = useRef<{ nodeId: string; time: number } | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  
  // 筛选状态
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<NodeType>>(
    new Set(['Character', 'WorldSetting', 'Event', 'Echo'])
  );
  const [visibleRelationships, setVisibleRelationships] = useState<Set<string>>(
    new Set(Object.keys(RELATIONSHIP_TYPES))
  );

  // 构建图谱数据
  const { allNodes, allEdges } = useMemo(() => {
    const { nodes, edges } = buildKnowledgeGraph(project);
    return { allNodes: nodes, allEdges: edges };
  }, [project]);

  // 筛选后的数据
  const { filteredNodes, filteredEdges } = useMemo(() => {
    const nodes = allNodes.filter(n => visibleNodeTypes.has(n.type));
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = allEdges.filter(e => 
      visibleRelationships.has(e.type) && 
      nodeIds.has(e.source) && 
      nodeIds.has(e.target)
    );
    return { filteredNodes: nodes, filteredEdges: edges };
  }, [allNodes, allEdges, visibleNodeTypes, visibleRelationships]);

  // 转换为 ForceGraph 数据格式
  const graphData = useMemo(() => {
    // 高亮搜索匹配
    const highlightedIds = new Set<string>();
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNodes.forEach(n => {
        if (n.label.toLowerCase().includes(query) || 
            n.properties?.description?.toLowerCase().includes(query)) {
          highlightedIds.add(n.id);
        }
      });
    }

    // 聚焦模式
    const focusedIds = new Set<string>();
    if (focusedNodeId) {
      focusedIds.add(focusedNodeId);
      filteredEdges.forEach(e => {
        if (e.source === focusedNodeId) focusedIds.add(e.target);
        if (e.target === focusedNodeId) focusedIds.add(e.source);
      });
    }

    const nodes = filteredNodes.map(n => ({
      ...n,
      val: n.type === 'Character' ? 8 : n.type === 'WorldSetting' ? 6 : 4,
      color: NODE_COLORS[n.type],
      highlighted: highlightedIds.has(n.id),
      dimmed: focusedNodeId && !focusedIds.has(n.id),
      searchMatched: highlightedIds.has(n.id)
    }));

    const links = filteredEdges.map((e, i) => ({
      id: `link-${i}`,
      source: e.source,
      target: e.target,
      type: e.type,
      color: RELATIONSHIP_TYPES[e.type as keyof typeof RELATIONSHIP_TYPES]?.color || '#94a3b8',
      label: RELATIONSHIP_TYPES[e.type as keyof typeof RELATIONSHIP_TYPES]?.label || e.type,
      value: 1
    }));

    return { nodes, links };
  }, [filteredNodes, filteredEdges, searchQuery, focusedNodeId]);

  // 邻居信息（用于详情面板）
  const nodeNeighbors = useMemo(() => {
    if (!selectedNode) return [];
    return getNodeNeighbors(allNodes, allEdges, selectedNode.id);
  }, [selectedNode, allNodes, allEdges]);

  // ============================================
  // 事件处理
  // ============================================

  const handleNodeClick = useCallback((node: any) => {
    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 300;
    const lastClick = lastClickRef.current;
    
    if (lastClick && lastClick.nodeId === node.id && 
        now - lastClick.time < DOUBLE_CLICK_DELAY) {
      // 双击 - 聚焦
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (focusedNodeId === node.id) {
        setFocusedNodeId(null);
      } else {
        setFocusedNodeId(node.id);
        setSelectedNode(node);
      }
      lastClickRef.current = null;
    } else {
      // 单击 - 选择
      lastClickRef.current = { nodeId: node.id, time: now };
      clickTimeoutRef.current = setTimeout(() => {
        setSelectedNode(node);
        clickTimeoutRef.current = null;
      }, DOUBLE_CLICK_DELAY);
    }
  }, [focusedNodeId]);



  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query && graphData.nodes.length > 0) {
      const matched = graphData.nodes.find((n: any) => 
        n.label.toLowerCase().includes(query.toLowerCase())
      );
      if (matched && graphRef.current) {
        graphRef.current.centerAt(matched.x, matched.y, 1000);
        graphRef.current.zoom(2, 500);
      }
    }
  }, [graphData.nodes]);

  const resetView = useCallback(() => {
    setSelectedNode(null);
    setFocusedNodeId(null);
    setSearchQuery('');
    if (graphRef.current) {
      graphRef.current.zoomToFit(500);
    }
  }, []);

  const toggleNodeType = useCallback((type: NodeType) => {
    setVisibleNodeTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleRelationship = useCallback((type: string) => {
    setVisibleRelationships(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const autoLayout = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, []);

  // ============================================
  // 渲染辅助函数
  // ============================================

  const renderNodeCanvas = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = node.val * (node.searchMatched ? 1.5 : 1);
    const color = node.color;
    const isDimmed = node.dimmed;
    const isHighlighted = node.highlighted;
    
    ctx.globalAlpha = isDimmed ? 0.2 : 1;
    
    // 绘制节点形状
    ctx.beginPath();
    switch (node.type) {
      case 'Character': // 圆形
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        break;
      case 'WorldSetting': // 方形
        ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
        break;
      case 'Event': // 菱形
        ctx.moveTo(node.x, node.y - size);
        ctx.lineTo(node.x + size, node.y);
        ctx.lineTo(node.x, node.y + size);
        ctx.lineTo(node.x - size, node.y);
        ctx.closePath();
        break;
      case 'Echo': // 六边形
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = node.x + size * Math.cos(angle);
          const y = node.y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
    }
    
    // 填充
    ctx.fillStyle = color;
    ctx.fill();
    
    // 高亮边框
    if (isHighlighted || node.id === focusedNodeId) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // 节点标签
    if (globalScale > 0.8 || node.searchMatched) {
      ctx.font = `${node.searchMatched ? 'bold' : 'normal'} ${12}px sans-serif`;
      ctx.fillStyle = isDimmed ? '#64748b' : '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x, node.y + size + 12);
    }
    
    ctx.globalAlpha = 1;
  }, [focusedNodeId]);

  const renderLinkCanvas = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const isDimmed = focusedNodeId && 
      link.source.id !== focusedNodeId && 
      link.target.id !== focusedNodeId;
    
    ctx.globalAlpha = isDimmed ? 0.1 : 0.6;
    ctx.strokeStyle = link.color;
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  }, [focusedNodeId]);

  // ============================================
  // 渲染
  // ============================================

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-slate-950">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="text-violet-500" size={20} />
            知识图谱
          </h2>
          
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="搜索角色、设定..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 w-64"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Filter size={16} />
            筛选
          </button>
          <button
            onClick={autoLayout}
            className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <Sparkles size={16} />
            自动布局
          </button>
          <button
            onClick={resetView}
            className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={16} />
            重置视图
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 筛选面板 */}
        {showFilters && (
          <div className="w-64 bg-slate-900/80 border-r border-slate-800 p-4 overflow-y-auto">
            {/* 节点类型筛选 */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Eye size={14} />
                显示节点类型
              </h3>
              <div className="space-y-2">
                {[
                  { type: 'Character' as NodeType, label: '角色', icon: Users, color: NODE_COLORS.Character },
                  { type: 'WorldSetting' as NodeType, label: '世界观', icon: Globe, color: NODE_COLORS.WorldSetting },
                  { type: 'Event' as NodeType, label: '事件', icon: Calendar, color: NODE_COLORS.Event },
                  { type: 'Echo' as NodeType, label: '回响', icon: Sparkles, color: NODE_COLORS.Echo }
                ].map(({ type, label, icon: Icon, color }) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleNodeTypes.has(type)}
                      onChange={() => toggleNodeType(type)}
                      className="rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                    />
                    <Icon size={16} style={{ color }} />
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 关系类型筛选 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Link2 size={14} />
                显示关系类型
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {Object.entries(RELATIONSHIP_TYPES).map(([type, config]) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleRelationships.has(type)}
                      onChange={() => toggleRelationship(type)}
                      className="rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                    />
                    <span style={{ color: config.color }}>
                      {RELATIONSHIP_ICONS[type] || <Link2 size={14} />}
                    </span>
                    <span className="text-sm text-slate-300">{config.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">图例</h3>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <span>角色（圆形）</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-500" />
                  <span>世界观（方形）</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rotate-45 bg-amber-500" />
                  <span>事件（菱形）</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-400" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                  <span>Echo（六边形）</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 图谱画布 */}
        <div className="flex-1 relative">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={renderNodeCanvas}
            linkCanvasObject={renderLinkCanvas}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={(node: any) => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            onBackgroundClick={handleBackgroundClick}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              const size = node.val * 1.5;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.fill();
            }}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkWidth={1.5}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={100}
            cooldownTicks={50}
            backgroundColor="#0f172a"
          />

          {/* 图谱统计信息 */}
          <div className="absolute bottom-4 left-4 px-3 py-2 bg-slate-900/90 backdrop-blur rounded-lg border border-slate-800 text-xs text-slate-400">
            节点: {graphData.nodes.length} | 关系: {graphData.links.length}
            {focusedNodeId && ' | 聚焦模式'}
            {searchQuery && ` | 搜索: "${searchQuery}"`}
          </div>

          {/* 操作提示 */}
          <div className="absolute bottom-4 right-4 px-3 py-2 bg-slate-900/90 backdrop-blur rounded-lg border border-slate-800 text-xs text-slate-500">
            <div className="flex flex-col gap-1">
              <span>🖱️ 拖拽移动节点</span>
              <span>🔍 滚轮缩放</span>
              <span>👆 单击查看详情</span>
              <span>👆👆 双击聚焦</span>
            </div>
          </div>
        </div>

        {/* 详情面板 */}
        {selectedNode && (
          <div className="w-80 bg-slate-900/90 border-l border-slate-800 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{selectedNode.label}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* 节点类型标签 */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ 
                  backgroundColor: `${NODE_COLORS[selectedNode.type]}20`,
                  color: NODE_COLORS[selectedNode.type]
                }}
              >
                {selectedNode.type === 'Character' && '角色'}
                {selectedNode.type === 'WorldSetting' && '世界观'}
                {selectedNode.type === 'Event' && '事件'}
                {selectedNode.type === 'Echo' && '回响'}
              </span>
              {selectedNode.properties?.role && (
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                  {selectedNode.properties.role}
                </span>
              )}
            </div>

            {/* 描述 */}
            {selectedNode.properties?.description && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 mb-2">描述</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedNode.properties.description}
                </p>
              </div>
            )}

            {/* 相关属性 */}
            <div className="space-y-3 mb-4">
              {selectedNode.properties?.archetype && (
                <div>
                  <span className="text-xs text-slate-500">原型:</span>
                  <span className="text-sm text-slate-300 ml-2">{selectedNode.properties.archetype}</span>
                </div>
              )}
              {selectedNode.properties?.category && (
                <div>
                  <span className="text-xs text-slate-500">分类:</span>
                  <span className="text-sm text-slate-300 ml-2">{selectedNode.properties.category}</span>
                </div>
              )}
              {selectedNode.properties?.worldDate && (
                <div>
                  <span className="text-xs text-slate-500">时间:</span>
                  <span className="text-sm text-slate-300 ml-2">{selectedNode.properties.worldDate}</span>
                </div>
              )}
            </div>

            {/* 关联关系 */}
            {nodeNeighbors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 mb-2">
                  关联 ({nodeNeighbors.length})
                </h4>
                <div className="space-y-1">
                  {nodeNeighbors.slice(0, 10).map((neighbor, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => {
                        const node = allNodes.find(n => n.id === neighbor.node.id);
                        if (node) setSelectedNode(node);
                      }}
                    >
                      <span style={{ 
                        color: RELATIONSHIP_TYPES[neighbor.relationship as keyof typeof RELATIONSHIP_TYPES]?.color || '#94a3b8'
                      }}>
                        {RELATIONSHIP_ICONS[neighbor.relationship] || <Link2 size={14} />}
                      </span>
                      <span className="text-sm text-slate-300 flex-1 truncate">
                        {neighbor.node.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {neighbor.direction === 'out' ? '→' : '←'}
                      </span>
                    </div>
                  ))}
                  {nodeNeighbors.length > 10 && (
                    <div className="text-xs text-slate-500 text-center py-1">
                      还有 {nodeNeighbors.length - 10} 个关联...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-2">
              <button
                onClick={() => setFocusedNodeId(selectedNode.id)}
                className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Target size={16} />
                聚焦此节点
              </button>
              
              {selectedNode.type === 'Character' && onNavigate && (
                <button
                  onClick={() => {
                    const char = project.characters.find(c => c.id === selectedNode.id);
                    if (char) onNavigate(AppSection.CHARACTERS, char);
                  }}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronRight size={16} />
                  编辑角色
                </button>
              )}
              
              {selectedNode.type === 'WorldSetting' && onNavigate && (
                <button
                  onClick={() => {
                    const setting = project.worldSettings.find(s => s.id === selectedNode.id);
                    if (setting) onNavigate(AppSection.WORLD, setting);
                  }}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronRight size={16} />
                  编辑设定
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
