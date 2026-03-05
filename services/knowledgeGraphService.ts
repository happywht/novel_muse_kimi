/**
 * Knowledge Graph Service - 知识图谱服务
 * Phase 2 Week 5-6: Neo4j 图数据库支持
 */

import { ProjectState, Character, WorldSetting } from '../types';

// 图节点类型
export interface GraphNode {
  id: string;
  label: string;
  type: 'Character' | 'WorldSetting' | 'Event' | 'Echo';
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

// 图边类型
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

// 关系类型定义
export const RELATIONSHIP_TYPES = {
  // 角色间关系
  ENEMY_OF: { label: '仇敌', color: '#ef4444' },
  LOVES: { label: '爱慕', color: '#ec4899' },
  ALLY_OF: { label: '盟友', color: '#22c55e' },
  MENTORS: { label: '师徒', color: '#8b5cf6' },
  KIN_OF: { label: '血缘', color: '#f59e0b' },
  RIVAL_OF: { label: '竞争', color: '#f97316' },
  
  // 角色与世界观关系
  LOCATED_IN: { label: '位于', color: '#3b82f6' },
  ORIGIN_FROM: { label: '来自', color: '#06b6d4' },
  POSSESSES: { label: '拥有', color: '#eab308' },
  
  // 事件关系
  INVOLVED_IN: { label: '参与', color: '#6366f1' },
  CAUSED: { label: '导致', color: '#dc2626' },
  PREVENTED: { label: '阻止', color: '#16a34a' },
  
  // Echo 关系
  HAS_ECHO: { label: '回响', color: '#22d3ee' },
  RELATED_TO: { label: '关联', color: '#94a3b8' }
};

// ============================================
// 关系推断
// ============================================

// 从角色描述中推断关系
export const inferCharacterRelationships = (
  character: Character,
  allCharacters: Character[]
): Array<{ targetId: string; relType: string; confidence: number }> => {
  const relationships: Array<{ targetId: string; relType: string; confidence: number }> = [];
  
  if (!character.relationships) return relationships;
  
  const relText = character.relationships.toLowerCase();
  
  allCharacters.forEach(other => {
    if (other.id === character.id) return;
    
    const otherName = other.name.toLowerCase();
    if (!relText.includes(otherName)) return;
    
    // 关键词匹配
    if (/仇|恨|敌|对立|对抗|仇恨|杀/.test(relText)) {
      relationships.push({ targetId: other.id, relType: 'ENEMY_OF', confidence: 0.8 });
    } else if (/爱|恋|喜欢|暗恋|情|爱慕|心动/.test(relText)) {
      relationships.push({ targetId: other.id, relType: 'LOVES', confidence: 0.8 });
    } else if (/友|伙伴|盟友|同伴|挚友|兄弟|姐妹/.test(relText)) {
      relationships.push({ targetId: other.id, relType: 'ALLY_OF', confidence: 0.8 });
    } else if (/师|导师|徒|学生|老师|师父/.test(relText)) {
      relationships.push({ targetId: other.id, relType: 'MENTORS', confidence: 0.8 });
    } else if (/族|亲|兄|弟|姐|妹|父|母|子|女|血缘|家族/.test(relText)) {
      relationships.push({ targetId: other.id, relType: 'KIN_OF', confidence: 0.9 });
    } else if (/竞|争|对手|较量|比/.test(relText)) {
      relationships.push({ targetId: other.id, relType: 'RIVAL_OF', confidence: 0.7 });
    } else {
      // 默认关联
      relationships.push({ targetId: other.id, relType: 'RELATED_TO', confidence: 0.5 });
    }
  });
  
  return relationships;
};

// 推断角色与地点的关系
export const inferLocationRelationships = (
  character: Character,
  worldSettings: WorldSetting[]
): Array<{ targetId: string; relType: string; confidence: number }> => {
  const relationships: Array<{ targetId: string; relType: string; confidence: number }> = [];
  
  if (!character.description) return relationships;
  
  const desc = character.description.toLowerCase();
  
  worldSettings.forEach(setting => {
    if (setting.category !== 'Geography') return;
    
    const settingTitle = setting.title.toLowerCase();
    
    // 如果角色描述中提到了地点
    if (desc.includes(settingTitle)) {
      // 判断是否来自该地
      if (/来自|出身|故乡|出生于|生于/.test(desc) && 
          desc.indexOf(settingTitle) < desc.indexOf('来自') + 10) {
        relationships.push({ targetId: setting.id, relType: 'ORIGIN_FROM', confidence: 0.8 });
      } else {
        // 可能位于该地
        relationships.push({ targetId: setting.id, relType: 'LOCATED_IN', confidence: 0.6 });
      }
    }
  });
  
  return relationships;
};

// ============================================
// 图谱构建
// ============================================

export const buildKnowledgeGraph = (project: ProjectState): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // 添加角色节点
  project.characters.forEach(char => {
    nodes.push({
      id: char.id,
      label: char.name,
      type: 'Character',
      properties: {
        role: char.role,
        archetype: char.archetype,
        description: char.description?.slice(0, 100)
      }
    });
    
    // 推断并添加角色关系
    const charRels = inferCharacterRelationships(char, project.characters);
    charRels.forEach(rel => {
      edges.push({
        source: char.id,
        target: rel.targetId,
        type: rel.relType
      });
    });
    
    // 推断并添加地点关系
    const locRels = inferLocationRelationships(char, project.worldSettings);
    locRels.forEach(rel => {
      edges.push({
        source: char.id,
        target: rel.targetId,
        type: rel.relType
      });
    });
  });
  
  // 添加世界观节点
  project.worldSettings.forEach(setting => {
    nodes.push({
      id: setting.id,
      label: setting.title,
      type: 'WorldSetting',
      properties: {
        category: setting.category,
        content: setting.content?.slice(0, 100)
      }
    });
  });
  
  // 添加 Echo 节点
  project.echoes.filter(e => e.status === 'ACCEPTED').forEach(echo => {
    const echoNodeId = `echo-${echo.id}`;
    nodes.push({
      id: echoNodeId,
      label: echo.description.slice(0, 20) + '...',
      type: 'Echo',
      properties: {
        description: echo.description,
        timestamp: echo.timestamp
      }
    });
    
    edges.push({
      source: echo.targetId,
      target: echoNodeId,
      type: 'HAS_ECHO'
    });
  });
  
  // 添加时间线事件节点
  project.timeline.forEach(event => {
    const eventNodeId = `event-${event.id}`;
    nodes.push({
      id: eventNodeId,
      label: event.title,
      type: 'Event',
      properties: {
        worldDate: event.worldDate,
        description: event.description?.slice(0, 100)
      }
    });
    
    // 连接参与的角色
    event.involvedEntities?.forEach(entityId => {
      edges.push({
        source: entityId,
        target: eventNodeId,
        type: 'INVOLVED_IN'
      });
    });
  });
  
  return { nodes, edges };
};

// ============================================
// 图谱查询
// ============================================

// 查找最短路径
export const findShortestPath = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  fromId: string,
  toId: string
): GraphNode[] => {
  // 简化的 BFS 实现
  const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    
    if (id === toId) {
      return path.map(nodeId => nodes.find(n => n.id === nodeId)!).filter(Boolean);
    }
    
    if (visited.has(id)) continue;
    visited.add(id);
    
    // 找到所有邻居
    const neighbors = edges
      .filter(e => e.source === id || e.target === id)
      .map(e => e.source === id ? e.target : e.source);
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, path: [...path, neighbor] });
      }
    }
  }
  
  return [];
};

// 获取节点的邻居
export const getNodeNeighbors = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeId: string
): Array<{ node: GraphNode; relationship: string; direction: 'out' | 'in' }> => {
  const result: Array<{ node: GraphNode; relationship: string; direction: 'out' | 'in' }> = [];
  
  edges.forEach(edge => {
    if (edge.source === nodeId) {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode) {
        result.push({ node: targetNode, relationship: edge.type, direction: 'out' });
      }
    } else if (edge.target === nodeId) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        result.push({ node: sourceNode, relationship: edge.type, direction: 'in' });
      }
    }
  });
  
  return result;
};

// ============================================
// 图谱布局算法 (力导向)
// ============================================

export const calculateForceLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations: number = 100
): GraphNode[] => {
  // 初始化位置（圆形分布）
  const positionedNodes = nodes.map((node, i) => ({
    ...node,
    x: width / 2 + Math.cos((i / nodes.length) * Math.PI * 2) * 200,
    y: height / 2 + Math.sin((i / nodes.length) * Math.PI * 2) * 200
  }));
  
  // 简化的力导向算法
  for (let iter = 0; iter < iterations; iter++) {
    // 斥力
    for (let i = 0; i < positionedNodes.length; i++) {
      for (let j = i + 1; j < positionedNodes.length; j++) {
        const a = positionedNodes[i];
        const b = positionedNodes[j];
        
        const dx = (b.x || 0) - (a.x || 0);
        const dy = (b.y || 0) - (a.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        if (dist < 150) {
          const force = 500 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          a.x = (a.x || 0) - fx;
          a.y = (a.y || 0) - fy;
          b.x = (b.x || 0) + fx;
          b.y = (b.y || 0) + fy;
        }
      }
    }
    
    // 引力（边）
    edges.forEach(edge => {
      const source = positionedNodes.find(n => n.id === edge.source);
      const target = positionedNodes.find(n => n.id === edge.target);
      
      if (!source || !target) return;
      
      const dx = (target.x || 0) - (source.x || 0);
      const dy = (target.y || 0) - (source.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = (dist - 100) * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      source.x = (source.x || 0) + fx;
      source.y = (source.y || 0) + fy;
      target.x = (target.x || 0) - fx;
      target.y = (target.y || 0) - fy;
    });
    
    // 中心引力
    positionedNodes.forEach(node => {
      const dx = (width / 2) - (node.x || 0);
      const dy = (height / 2) - (node.y || 0);
      node.x = (node.x || 0) + dx * 0.01;
      node.y = (node.y || 0) + dy * 0.01;
    });
  }
  
  return positionedNodes;
};
