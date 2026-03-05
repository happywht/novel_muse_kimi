/**
 * Novel Muse - Core Types
 * Phase 1: 核心写作体验升级
 */

// ============================================
// 叙事节拍标签
// ============================================
export type BeatTag = 'INCITING_INCIDENT' | 'PLOT_POINT_1' | 'MIDPOINT' | 'PLOT_POINT_2' | 'CLIMAX' | 'RESOLUTION' | 'OTHER' | null;

// ============================================
// 分卷系统 (新增)
// ============================================
export interface Volume {
  id: string;
  volumeNumber: number;
  title: string;
  subtitle?: string;
  theme: string;           // 本卷主题
  synopsis: string;        // 卷简介
  targetWordCount: number;
  currentWordCount: number;
  status: 'PLANNED' | 'WRITING' | 'COMPLETED';
  color?: string;          // 可视化颜色标识
  plotNodeIds: string[];   // 关联的情节节点
}

// ============================================
// 情节节点
// ============================================
export interface PlotNode {
  id: string;
  title?: string;
  name?: string;           // 用于 PlotWeaver 的名称
  content: string; // The beat/summary
  description?: string;    // 详细描述
  order: number;
  beatTag?: BeatTag; // NEW: Narrative milestone tag
  relatedCharacters?: string[]; // IDs
  relatedLocations?: string[]; // IDs
  volumeId?: string;       // 关联的分卷 (新增)
  estimatedWordCount?: number; // 预计字数 (新增)
  
  // 增强字段 (PlotWeaver)
  type?: 'BATTLE' | 'POLITICAL' | 'EMOTIONAL' | 'MYSTERY' | 'TRANSITION';
  tension?: number;        // 张力值 0-100
  beats?: Beat[];          // 场景节拍链
  chapterIds?: string[];   // 关联章节
  involvedCharacterIds?: string[]; // 参与角色
}

// ============================================
// 节拍 (用于 PlotWeaver)
// ============================================
export interface Beat {
  id: string;
  type: 'SETUP' | 'INCITING' | 'RISING' | 'MIDPOINT' | 'CRISIS' | 'CLIMAX' | 'RESOLUTION';
  title: string;
  description: string;
  order: number;
  wordCountHint?: number;
  chapterId?: string;      // 绑定的章节
  isCompleted?: boolean;
}

// ============================================
// 剧情弧 (PlotWeaver)
// ============================================
export interface PlotArc {
  id: string;
  name: string;
  type: 'MAIN' | 'SUB' | 'ROMANCE' | 'MYSTERY' | 'CHARACTER';
  status: 'PLANNED' | 'ACTIVE' | 'RESOLVED';
  description?: string;
  involvedCharacterIds: string[];
  relatedWorldIds?: string[];
  relatedPlotNodeIds?: string[];
  progress: number;
  objectives: {
    description: string;
    completed: boolean;
  }[];
  createdAt?: number;
  resolvedAt?: number;
}

// ============================================
// AI 消息
// ============================================
export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  timestamp: number;
}

// ============================================
// 角色系统
// ============================================
export interface Character {
  id: string;
  name: string;
  role: string; // Protagonist, Antagonist, Support
  archetype: string;
  description: string;
  relationships?: string; // New field for interpersonal dynamics
  imageUrl?: string;
  
  // 人物弧光追踪 (新增)
  characterArc?: {
    startingState: string;
    incitingIncident: string;
    midpoint: string;
    climax: string;
    endingState: string;
  };
  
  // 动态状态 (可被 Echo 系统更新)
  dynamicState?: {
    physical: string;
    mental: string;
    location: string;
    possessions: string[];
  };
}

// ============================================
// 世界观设定
// ============================================
export interface WorldSetting {
  id: string;
  category: 'Geography' | 'Magic/Tech' | 'Society' | 'History' | 'Other';
  title: string;
  content: string;
  
  // 一致性规则 (新增)
  consistencyRules?: string[];
  // 关联设定
  relatedSettings?: string[];
}

// ============================================
// 大纲版本历史
// ============================================
export interface PlotVersion {
  id: string;
  timestamp: number;
  content: string;
  note: string;
}

// ============================================
// 章节节拍
// ============================================
export interface ChapterBeat {
  id: string;
  type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST' | 'DESCRIPTION';
  description: string;
  isCompleted: boolean;
  estimatedWordCount?: number;
}

// ============================================
// 草稿
// ============================================
export interface Draft {
  id: string;
  title: string;
  content: string;
  relatedPlotPoint?: string;
  lastModified: number;
  wordCount?: number;
}

// ============================================
// 章节 (增强版)
// ============================================
export interface Chapter {
  id: string;
  title: string;
  content: string;
  summary?: string;        // 章节细纲
  expectedPOV?: string;    // 预期视角人物
  plotNodeId?: string;     // 关联的 PlotNode
  volumeId?: string;       // 关联的分卷 (新增)
  order: number;           // 全局顺序
  volumeOrder?: number;    // 卷内顺序 (新增)
  lastModified: number;
  beats?: ChapterBeat[];   // 场景节拍链
  wordCount?: number;      // 字数统计 (缓存)
  
  // 写作状态 (新增)
  writingStatus?: 'OUTLINE' | 'DRAFT' | 'REVISION' | 'POLISHED';
  
  // 质量评分 (新增)
  qualityScore?: {
    consistency: number;
    pacing: number;
    engagement: number;
    overall: number;
  };
}

// ============================================
// 创作设置
// ============================================
export interface CreativeSettings {
  tone: string;            // e.g., "Dark", "Humorous", "Epic"
  style: string;           // e.g., "Descriptive", "Concise", "Poetic"
  creativity: number;      // 0.0 to 1.0 (Temperature)
  targetAudience: string;
  
  // AI 协作设置 (新增)
  aiCollaboration?: {
    mode: 'PASSIVE' | 'ACTIVE' | 'COLLABORATIVE';
    autoSuggest: boolean;
    triggerDelay: number;  // 秒
  };
}

// ============================================
// 世界观生成配置
// ============================================
export interface WorldGenConfig {
  detailLevel: 'Brief' | 'Standard' | 'Detailed';
  focus: 'Sensory' | 'Logic' | 'History' | 'Balanced';
}

// ============================================
// 应用页面
// ============================================
export enum AppSection {
  LOBBY = 'LOBBY',
  DASHBOARD = 'DASHBOARD',
  WORLD = 'WORLD',
  CHARACTERS = 'CHARACTERS',
  PLOT = 'PLOT',
  OUTLINER = 'OUTLINER',
  DRAFTING = 'DRAFTING',
  ECHOES = 'ECHOES',
  GRAPH = 'GRAPH',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'    // 新增设置页面
}

// ============================================
// 写作模式 (新增)
// ============================================
export type WritingMode = 'NORMAL' | 'ZEN' | 'FOCUS';

export interface WritingEnvironment {
  mode: WritingMode;
  font: string;
  fontSize: number;
  lineHeight: number;
  theme: 'DARK' | 'LIGHT' | 'SEPIA';
  showContextPanel: boolean;
  contextPanelSections: ('OUTLINE' | 'CHARACTERS' | 'WORLD' | 'PREVIOUS' | 'BEATS')[];
}

// ============================================
// Echo 系统
// ============================================
export interface Echo {
  id: string;
  type: 'CHARACTER' | 'WORLD' | 'RELATIONSHIP' | 'PLOT';
  targetId: string;
  targetName: string;
  description: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PREDICTION' | 'ARCHIVED';
  timestamp: number;
  
  // 连锁反应 (新增)
  cascadeEffects?: {
    description: string;
    affectedEntities: string[];
  }[];
}

// ============================================
// 状态变更建议
// ============================================
export interface StateChangeRecommendation {
  targetId: string;
  targetType: 'CHARACTER' | 'WORLD';
  targetName: string;
  suggestedUpdate: string;
  reason: string;
  severity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
}

// ============================================
// 时间线事件
// ============================================
export interface TimelineEvent {
  id: string;
  timestamp: number;       // Real world time
  worldDate: string;       // In-world date
  title: string;
  description: string;
  involvedEntities: string[];
  type: 'SCENE' | 'BACKGROUND' | 'ECHO';
  chapterId?: string;      // 关联章节
}

// ============================================
// 质量检查结果 (新增)
// ============================================
export interface QualityIssue {
  type: 'CONSISTENCY' | 'STYLE' | 'LOGIC' | 'GRAMMAR' | 'PACING';
  severity: 'INFO' | 'WARNING' | 'ERROR';
  location?: { start: number; end: number };
  message: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface QualityReport {
  timestamp: number;
  chapterId: string;
  score: number;
  issues: QualityIssue[];
  suggestions: string[];
}

// ============================================
// 版本控制 (新增)
// ============================================
export interface VersionBranch {
  name: string;
  head: string;
  base: string;
  description: string;
  createdAt: number;
  isExperiment: boolean;
}

export interface VersionCommit {
  id: string;
  parent: string;
  message: string;
  author: string;
  timestamp: number;
  changes: {
    entityType: 'chapter' | 'character' | 'world' | 'plot';
    entityId: string;
    changeType: 'CREATE' | 'UPDATE' | 'DELETE';
    diff?: any;
  }[];
  wordCount: number;
}

// ============================================
// 写作统计 (新增)
// ============================================
export interface WritingStats {
  totalWords: number;
  chapterWords: number;
  draftWords: number;
  chapterCount: number;
  draftCount: number;
  characterCount: number;
  worldSettingCount: number;
  echoCount: number;
  timelineCount: number;
  avgChapterWords: number;
  longestChapter: number;
  daysSinceUpdate: number;
  
  // 成就系统
  currentMilestone?: {
    threshold: number;
    label: string;
    icon: string;
  };
  nextMilestone?: {
    threshold: number;
    label: string;
    icon: string;
  };
  progress: number;
  
  // 活跃度
  writingStreak: number;        // 连续写作天数
  totalWritingDays: number;     // 总写作天数
  dailyAverage: number;         // 日均字数
}

// ============================================
// 项目状态 (完整版)
// ============================================
export interface ProjectState {
  id: string;
  lastModified: number;
  title: string;
  genre: string;
  premise: string;
  
  // 创作设置
  creativeSettings: CreativeSettings;
  worldGenConfig: WorldGenConfig;
  
  // 写作环境设置 (新增)
  writingEnvironment?: WritingEnvironment;
  
  // 核心数据
  characters: Character[];
  worldSettings: WorldSetting[];
  plotOutline?: string;
  plotNodes: PlotNode[];
  plotHistory: PlotVersion[];
  
  // 分卷系统 (新增)
  volumes: Volume[];
  
  // 剧情弧系统 (PlotWeaver)
  plotArcs: PlotArc[];
  
  // 章节与草稿
  chapters: Chapter[];
  drafts: Draft[];
  
  // Echo 系统
  echoes: Echo[];
  
  // 时间线
  timeline: TimelineEvent[];
  currentWorldDate: string;
  
  // 自定义提示词
  customPrompts: Record<string, string>;
  
  // 质量报告 (新增)
  qualityReports?: QualityReport[];
  
  // 版本控制 (新增)
  versionControl?: {
    branches: VersionBranch[];
    currentBranch: string;
    commits: VersionCommit[];
  };
  
  // 写作目标 (新增)
  goals?: {
    dailyWordCount: number;
    totalWordTarget: number;
    deadline?: number;
  };
}

// ============================================
// 初始化默认值
// ============================================
export const DEFAULT_WRITING_ENVIRONMENT: WritingEnvironment = {
  mode: 'NORMAL',
  font: 'serif',
  fontSize: 18,
  lineHeight: 1.8,
  theme: 'DARK',
  showContextPanel: true,
  contextPanelSections: ['OUTLINE', 'PREVIOUS', 'BEATS']
};

export const DEFAULT_CREATIVE_SETTINGS: CreativeSettings = {
  tone: '平衡 (Balanced)',
  style: '通俗易懂 (Standard)',
  creativity: 0.8,
  targetAudience: '成人 (Adult)',
  aiCollaboration: {
    mode: 'PASSIVE',
    autoSuggest: true,
    triggerDelay: 3
  }
};
