/**
 * Echo Service - 命运回响系统 (升级)
 * Phase 2 Week 5-6: 连锁反应推演 + 记忆固化
 */

import { ProjectState, Echo, Character, WorldSetting, Chapter } from '../types';

// ============================================
// 连锁反应预测
// ============================================

interface CascadeEffect {
  description: string;
  affectedEntities: string[];
  probability: number; // 0-1
  timeFrame: 'immediate' | 'short' | 'long'; // 即时/短期/长期
}

// 推演 Echo 的连锁反应
export const deduceCascadeEffects = (
  echo: Echo,
  project: ProjectState
): CascadeEffect[] => {
  const effects: CascadeEffect[] = [];
  
  // 获取目标实体
  const targetChar = echo.type === 'CHARACTER' 
    ? project.characters.find(c => c.id === echo.targetId)
    : null;
  
  const targetWorld = echo.type === 'WORLD'
    ? project.worldSettings.find(w => w.id === echo.targetId)
    : null;
  
  // 基于不同类型的 Echo 推演
  if (targetChar) {
    // 角色受伤的连锁反应
    if (echo.description.includes('受伤') || echo.description.includes('重伤')) {
      // 影响相关角色
      project.characters.forEach(char => {
        if (char.id === targetChar.id) return;
        if (char.relationships?.includes(targetChar.name)) {
          effects.push({
            description: `${char.name} 得知 ${targetChar.name} 受伤，可能产生情绪波动或采取行动`,
            affectedEntities: [char.id],
            probability: 0.8,
            timeFrame: 'short'
          });
        }
      });
      
      // 影响后续剧情
      effects.push({
        description: `${targetChar.name} 的伤势可能影响后续战斗能力`,
        affectedEntities: [targetChar.id],
        probability: 0.9,
        timeFrame: 'immediate'
      });
    }
    
    // 角色获得新能力的连锁反应
    if (echo.description.includes('获得') || echo.description.includes('觉醒')) {
      effects.push({
        description: `其他势力可能注意到 ${targetChar.name} 的新能力，产生新的冲突`,
        affectedEntities: [],
        probability: 0.6,
        timeFrame: 'long'
      });
    }
    
    // 角色关系变化的连锁反应
    if (echo.description.includes('关系') || echo.description.includes('决裂') || echo.description.includes('结盟')) {
      effects.push({
        description: `关系变化可能引发相关势力的连锁反应`,
        affectedEntities: [],
        probability: 0.7,
        timeFrame: 'short'
      });
    }
  }
  
  if (targetWorld) {
    // 世界观状态变化的连锁反应
    effects.push({
      description: `${targetWorld.title} 的变化可能影响整个世界的势力平衡`,
      affectedEntities: [],
      probability: 0.5,
      timeFrame: 'long'
    });
  }
  
  return effects;
};

// ============================================
// 记忆固化
// ============================================

interface ConsolidationResult {
  newDescription: string;
  changeSummary: string[];
}

// 将多个 Echo 合并到长期档案
export const consolidateEchoes = (
  entity: Character | WorldSetting,
  entityType: 'CHARACTER' | 'WORLD',
  echoes: Echo[]
): ConsolidationResult => {
  const currentDesc = entityType === 'CHARACTER' 
    ? (entity as Character).description 
    : (entity as WorldSetting).content;
  
  const acceptedEchoes = echoes.filter(e => e.status === 'ACCEPTED');
  
  // 生成新的描述（简化版）
  const newSections: string[] = [];
  const changeSummary: string[] = [];
  
  acceptedEchoes.forEach(echo => {
    const date = new Date(echo.timestamp).toLocaleDateString();
    newSections.push(`[${date}] ${echo.description}`);
    changeSummary.push(echo.description);
  });
  
  const newDescription = `${currentDesc}\n\n## 状态变更记录\n\n${newSections.join('\n\n')}`;
  
  return {
    newDescription,
    changeSummary
  };
};

// ============================================
// Echo 生成器
// ============================================

interface StateChange {
  targetId: string;
  targetType: 'CHARACTER' | 'WORLD';
  targetName: string;
  description: string;
  reason: string;
}

// 从章节内容中提取状态变化
export const extractEchoesFromChapter = (
  chapter: Chapter,
  project: ProjectState
): StateChange[] => {
  const changes: StateChange[] = [];
  const content = chapter.content?.toLowerCase() || '';
  
  // 检查每个角色的状态变化
  project.characters.forEach(char => {
    const charName = char.name.toLowerCase();
    if (!content.includes(charName)) return;
    
    // 检测受伤
    const injuryTerms = ['受伤', '重伤', '流血', '倒下', '昏迷', '断', '骨折'];
    for (const term of injuryTerms) {
      if (content.includes(`${charName}${term}`) || content.includes(`${term}${charName}`)) {
        changes.push({
          targetId: char.id,
          targetType: 'CHARACTER',
          targetName: char.name,
          description: `${char.name} 在战斗/事件中受伤`,
          reason: `在章节「${chapter.title}」中检测到受伤描写`
        });
        break;
      }
    }
    
    // 检测获得物品/能力
    const gainTerms = ['获得', '得到', '觉醒', '领悟', '发现'];
    for (const term of gainTerms) {
      if (content.includes(`${charName}${term}`)) {
        changes.push({
          targetId: char.id,
          targetType: 'CHARACTER',
          targetName: char.name,
          description: `${char.name} 可能获得了新的能力或物品`,
          reason: `在章节「${chapter.title}」中检测到获得/觉醒描写`
        });
        break;
      }
    }
    
    // 检测情绪变化
    const emotionTerms = ['愤怒', '悲伤', '绝望', '决心', '领悟'];
    for (const term of emotionTerms) {
      if (content.includes(`${charName}${term}`)) {
        changes.push({
          targetId: char.id,
          targetType: 'CHARACTER',
          targetName: char.name,
          description: `${char.name} 经历了情绪转变：${term}`,
          reason: `在章节「${chapter.title}」中检测到心理变化`
        });
        break;
      }
    }
  });
  
  // 检查世界观变化
  project.worldSettings.forEach(setting => {
    const settingTitle = setting.title.toLowerCase();
    if (!content.includes(settingTitle)) return;
    
    const changeTerms = ['毁灭', '崩塌', '改变', '消失', '诞生'];
    for (const term of changeTerms) {
      if (content.includes(`${settingTitle}${term}`)) {
        changes.push({
          targetId: setting.id,
          targetType: 'WORLD',
          targetName: setting.title,
          description: `${setting.title} 发生了重大变化：${term}`,
          reason: `在章节「${chapter.title}」中检测到世界观变化`
        });
        break;
      }
    }
  });
  
  return changes;
};

// ============================================
// Echo 管理服务
// ============================================

export const echoService = {
  // 接受 Echo
  acceptEcho(project: ProjectState, echoId: string): ProjectState {
    const echo = project.echoes.find(e => e.id === echoId);
    if (!echo) return project;
    
    // 推演连锁反应
    const cascadeEffects = deduceCascadeEffects(echo, project);
    
    const updatedEcho: Echo = {
      ...echo,
      status: 'ACCEPTED',
      cascadeEffects
    };
    
    return {
      ...project,
      echoes: project.echoes.map(e => e.id === echoId ? updatedEcho : e)
    };
  },
  
  // 拒绝 Echo
  rejectEcho(project: ProjectState, echoId: string): ProjectState {
    return {
      ...project,
      echoes: project.echoes.map(e => 
        e.id === echoId ? { ...e, status: 'REJECTED' } : e
      )
    };
  },
  
  // 归档已固化的 Echo
  archiveEchoes(project: ProjectState, entityId: string): ProjectState {
    return {
      ...project,
      echoes: project.echoes.map(e => 
        e.targetId === entityId && e.status === 'ACCEPTED'
          ? { ...e, status: 'ARCHIVED' }
          : e
      )
    };
  },
  
  // 批量创建 Echo
  batchCreateEchoes(project: ProjectState, changes: StateChange[]): ProjectState {
    const newEchoes: Echo[] = changes.map(change => ({
      id: `echo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: change.targetType,
      targetId: change.targetId,
      targetName: change.targetName,
      description: change.description,
      reason: change.reason,
      status: 'PENDING',
      timestamp: Date.now()
    }));
    
    return {
      ...project,
      echoes: [...project.echoes, ...newEchoes]
    };
  },
  
  // 分析章节并自动提取 Echo
  analyzeChapter(project: ProjectState, chapterId: string): ProjectState {
    const chapter = project.chapters.find(ch => ch.id === chapterId);
    if (!chapter) return project;
    
    const changes = extractEchoesFromChapter(chapter, project);
    if (changes.length === 0) return project;
    
    return this.batchCreateEchoes(project, changes);
  },
  
  // 获取实体的 Echo 历史
  getEntityEchoes(project: ProjectState, entityId: string): Echo[] {
    return project.echoes
      .filter(e => e.targetId === entityId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },
  
  // 获取待处理的 Echo
  getPendingEchoes(project: ProjectState): Echo[] {
    return project.echoes
      .filter(e => e.status === 'PENDING' || e.status === 'PREDICTION')
      .sort((a, b) => b.timestamp - a.timestamp);
  }
};
