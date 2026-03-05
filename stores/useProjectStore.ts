/**
 * Novel Muse - Project Store (重构后)
 * Phase 1: 核心项目数据管理（持久化）
 * 
 * 变更说明：
 * - 移除了所有UI状态（已迁移到 useUIStore）
 * - 移除了AI状态（已迁移到 useAIStore）
 * - 专注于项目数据的CRUD操作
 * - 添加了自动持久化副作用
 */

import { create } from 'zustand';
import { 
  ProjectState, 
  Volume, 
  Chapter,
  Character,
  WorldSetting,
  WritingEnvironment,
  DEFAULT_WRITING_ENVIRONMENT,
  DEFAULT_CREATIVE_SETTINGS
} from '../types';

// ============================================
// 默认项目状态
// ============================================
export const INITIAL_PROJECT: ProjectState = {
  id: 'default-project',
  lastModified: Date.now(),
  title: '',
  genre: '',
  premise: '',
  creativeSettings: DEFAULT_CREATIVE_SETTINGS,
  worldGenConfig: {
    detailLevel: 'Standard',
    focus: 'Balanced',
  },
  writingEnvironment: DEFAULT_WRITING_ENVIRONMENT,
  characters: [],
  worldSettings: [],
  plotOutline: '',
  plotHistory: [],
  drafts: [],
  chapters: [],
  volumes: [],
  plotArcs: [],
  customPrompts: {},
  plotNodes: [],
  echoes: [],
  timeline: [],
  currentWorldDate: '元年',
  qualityReports: [],
  goals: {
    dailyWordCount: 2000,
    totalWordTarget: 100000
  },
  versionControl: {
    branches: [{
      name: 'main',
      head: 'initial',
      base: '',
      description: '主分支',
      createdAt: Date.now(),
      isExperiment: false
    }],
    currentBranch: 'main',
    commits: [{
      id: 'initial',
      parent: '',
      message: '项目初始化',
      author: '系统',
      timestamp: Date.now(),
      changes: [],
      wordCount: 0
    }]
  }
};

// ============================================
// 持久化存储键名
// ============================================
const STORAGE_KEY = 'muse_projects';
const STORAGE_VERSION = '2.0';

// ============================================
// 防抖保存定时器
// ============================================
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1000;

// ============================================
// Project Store 接口定义
// ============================================
export interface ProjectStore {
  // --- 项目数据 ---
  project: ProjectState;
  savedProjects: ProjectState[];
  storageVersion: string;
  
  // --- 基础 Actions ---
  updateProject: (data: Partial<ProjectState>, options?: { skipPersist?: boolean }) => void;
  setProject: (project: ProjectState) => void;
  setSavedProjects: (projects: ProjectState[]) => void;
  
  // --- 项目生命周期 Actions ---
  initialize: () => Promise<void>;
  createProject: () => Promise<string>; // 返回新项目ID
  switchProject: (id: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  duplicateProject: (id: string) => Promise<string>;
  
  // --- 持久化 Actions ---
  saveToPersistentStorage: (immediate?: boolean) => Promise<void>;
  loadFromPersistentStorage: () => Promise<void>;
  exportProject: (id?: string) => string; // 返回JSON字符串
  importProject: (json: string) => Promise<string | null>; // 返回新项目ID或null
  
  // --- 分卷系统 Actions ---
  createVolume: (data: Partial<Volume>) => Volume;
  updateVolume: (id: string, data: Partial<Volume>) => void;
  deleteVolume: (id: string) => void;
  reorderVolumes: (volumeIds: string[]) => void;
  
  // --- 章节管理 Actions ---
  createChapter: (volumeId?: string, plotNodeId?: string) => Chapter | null;
  updateChapter: (id: string, data: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  moveChapterToVolume: (chapterId: string, targetVolumeId?: string) => void;
  reorderChapters: (chapterIds: string[]) => void;
  updateChapterOrder: (chapterId: string, newOrder: number) => void;
  
  // --- 角色管理 Actions ---
  createCharacter: (data: Partial<Character>) => Character;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  
  // --- 世界观管理 Actions ---
  createWorldSetting: (data: Partial<WorldSetting>) => WorldSetting;
  updateWorldSetting: (id: string, data: Partial<WorldSetting>) => void;
  deleteWorldSetting: (id: string) => void;
  
  // --- 写作环境 Actions ---
  updateWritingEnvironment: (env: Partial<WritingEnvironment>) => void;
  
  // --- 批量操作 Actions ---
  batchUpdate: (updates: Partial<ProjectState>) => void;
  
  // --- 统计计算 ---
  getWritingStats: () => {
    totalWords: number;
    chapterWords: number;
    chapterCount: number;
    volumeCount: number;
    characterCount: number;
    worldSettingCount: number;
    lastModified: number;
  };
  
  // --- 选择器辅助 ---
  getChapterById: (id: string) => Chapter | undefined;
  getVolumeById: (id: string) => Volume | undefined;
  getCharacterById: (id: string) => Character | undefined;
  getWorldSettingById: (id: string) => WorldSetting | undefined;
  getChaptersByVolume: (volumeId?: string) => Chapter[];
}

// ============================================
// Store 实现
// ============================================
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // --- 初始状态 ---
  project: INITIAL_PROJECT,
  savedProjects: [],
  storageVersion: STORAGE_VERSION,

  // --- 基础 Actions ---
  updateProject: (data, options = {}) => {
    set((state) => ({
      project: { 
        ...state.project, 
        ...data, 
        lastModified: Date.now() 
      },
    }));
    
    if (!options.skipPersist) {
      // 防抖保存
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        get().saveToPersistentStorage();
      }, DEBOUNCE_MS);
    }
  },

  setProject: (project) => set({ project }),
  setSavedProjects: (projects) => set({ savedProjects: projects }),

  // --- 项目生命周期 ---
  initialize: async () => {
    await get().loadFromPersistentStorage();
  },

  createProject: async () => {
    const newProject: ProjectState = {
      ...INITIAL_PROJECT,
      id: crypto.randomUUID(),
      lastModified: Date.now(),
      title: '未命名项目',
      volumes: [],
      chapters: [],
      characters: [],
      worldSettings: [],
    };

    set((state) => ({
      project: newProject,
      savedProjects: [...state.savedProjects, newProject],
    }));
    
    await get().saveToPersistentStorage(true);
    return newProject.id;
  },

  switchProject: async (id) => {
    const state = get();
    const target = state.savedProjects.find(p => p.id === id);
    if (target) {
      set({ 
        project: { ...INITIAL_PROJECT, ...target },
      });
      return true;
    }
    return false;
  },

  deleteProject: async (id) => {
    const state = get();
    if (state.savedProjects.length <= 1) {
      console.warn('至少需要保留一个项目！');
      return false;
    }
    
    const newList = state.savedProjects.filter(p => p.id !== id);
    const needsSwitch = state.project.id === id;
    
    set({
      savedProjects: newList,
      project: needsSwitch ? { ...INITIAL_PROJECT, ...newList[0] } : state.project,
    });
    
    await get().saveToPersistentStorage(true);
    return true;
  },

  duplicateProject: async (id) => {
    const state = get();
    const target = state.savedProjects.find(p => p.id === id);
    if (!target) throw new Error('Project not found');
    
    const newProject: ProjectState = {
      ...target,
      id: crypto.randomUUID(),
      title: `${target.title} (副本)`,
      lastModified: Date.now(),
    };
    
    set((state) => ({
      savedProjects: [...state.savedProjects, newProject],
    }));
    
    await get().saveToPersistentStorage(true);
    return newProject.id;
  },

  // --- 持久化存储 ---
  saveToPersistentStorage: async (immediate = false) => {
    const { project, savedProjects } = get();
    const updatedProject = { 
      ...project, 
      lastModified: Date.now(),
      _storageVersion: STORAGE_VERSION,
    };
    
    const index = savedProjects.findIndex(p => p.id === project.id);
    let newList: ProjectState[];
    
    if (index >= 0) {
      newList = [...savedProjects];
      newList[index] = updatedProject;
    } else {
      newList = [...savedProjects, updatedProject];
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      set({ savedProjects: newList });
    } catch (e) {
      console.error('Failed to save projects:', e);
      // 存储空间可能已满，尝试清理旧版本数据
    }
  },

  loadFromPersistentStorage: async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 数据迁移：确保所有必要字段存在
          const migrated = parsed.map(p => ({
            ...INITIAL_PROJECT,
            ...p,
            volumes: p.volumes || [],
            plotArcs: p.plotArcs || [],
            echoes: p.echoes || [],
            timeline: p.timeline || [],
            qualityReports: p.qualityReports || [],
            goals: p.goals || { dailyWordCount: 2000, totalWordTarget: 100000 },
            versionControl: p.versionControl || INITIAL_PROJECT.versionControl,
          }));
          
          const mostRecent = migrated.sort((a, b) => b.lastModified - a.lastModified)[0];
          set({
            savedProjects: migrated,
            project: mostRecent,
          });
          return;
        }
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }
    
    // 首次使用，创建默认项目
    const newProj = { 
      ...INITIAL_PROJECT, 
      id: crypto.randomUUID(), 
      title: '我的第一个项目',
      volumes: [] 
    };
    set({ project: newProj, savedProjects: [newProj] });
    await get().saveToPersistentStorage(true);
  },

  exportProject: (id) => {
    const state = get();
    const targetId = id || state.project.id;
    const target = state.savedProjects.find(p => p.id === targetId);
    if (!target) throw new Error('Project not found');
    return JSON.stringify(target, null, 2);
  },

  importProject: async (json) => {
    try {
      const imported = JSON.parse(json) as ProjectState;
      // 验证必要字段
      if (!imported.id || !imported.title) {
        throw new Error('Invalid project data');
      }
      
      // 生成新ID避免冲突
      const newProject: ProjectState = {
        ...imported,
        id: crypto.randomUUID(),
        title: `${imported.title} (导入)`,
        lastModified: Date.now(),
      };
      
      set((state) => ({
        savedProjects: [...state.savedProjects, newProject],
      }));
      
      await get().saveToPersistentStorage(true);
      return newProject.id;
    } catch (e) {
      console.error('Failed to import project:', e);
      return null;
    }
  },

  // --- 分卷系统 ---
  createVolume: (data) => {
    const { project, updateProject } = get();
    const newVolume: Volume = {
      id: crypto.randomUUID(),
      volumeNumber: project.volumes.length + 1,
      title: data.title || `第 ${project.volumes.length + 1} 卷`,
      subtitle: data.subtitle || '',
      theme: data.theme || '',
      synopsis: data.synopsis || '',
      targetWordCount: data.targetWordCount || 50000,
      currentWordCount: 0,
      status: 'PLANNED',
      color: data.color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      plotNodeIds: []
    };
    
    updateProject({ 
      volumes: [...project.volumes, newVolume] 
    });
    
    return newVolume;
  },

  updateVolume: (id, data) => {
    const { project, updateProject } = get();
    const updatedVolumes = project.volumes.map(v => 
      v.id === id ? { ...v, ...data } : v
    );
    updateProject({ volumes: updatedVolumes });
  },

  deleteVolume: (id) => {
    const { project, updateProject } = get();
    if (!confirm('删除分卷会将其中的章节移至未分类，确定继续？')) return;
    
    const updatedChapters = project.chapters.map(ch => 
      ch.volumeId === id ? { ...ch, volumeId: undefined } : ch
    );
    
    updateProject({ 
      volumes: project.volumes.filter(v => v.id !== id),
      chapters: updatedChapters
    });
  },

  reorderVolumes: (volumeIds) => {
    const { project, updateProject } = get();
    const volumeMap = new Map(project.volumes.map(v => [v.id, v]));
    const reordered = volumeIds
      .map(id => volumeMap.get(id))
      .filter((v): v is Volume => v !== undefined)
      .map((v, index) => ({ ...v, volumeNumber: index + 1 }));
    updateProject({ volumes: reordered });
  },

  // --- 章节管理 ---
  createChapter: (volumeId, plotNodeId) => {
    const { project, updateProject } = get();
    const volumeChapters = project.chapters.filter(ch => ch.volumeId === volumeId);
    
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: volumeId 
        ? `第 ${volumeChapters.length + 1} 章`
        : `未分类 ${project.chapters.filter(ch => !ch.volumeId).length + 1}`,
      content: '',
      summary: '',
      expectedPOV: '',
      volumeId,
      plotNodeId,
      order: project.chapters.length,
      volumeOrder: volumeChapters.length,
      lastModified: Date.now(),
      beats: [],
      writingStatus: 'OUTLINE'
    };
    
    updateProject({ chapters: [...project.chapters, newChapter] });
    return newChapter;
  },

  updateChapter: (id, data) => {
    const { project, updateProject } = get();
    const updatedChapters = project.chapters.map(ch => {
      if (ch.id !== id) return ch;
      const updated = { 
        ...ch, 
        ...data, 
        lastModified: Date.now() 
      };
      if (data.content !== undefined) {
        updated.wordCount = data.content.length;
      }
      return updated;
    });
    updateProject({ chapters: updatedChapters });
  },

  deleteChapter: (id) => {
    const { project, updateProject } = get();
    if (!confirm('确定删除此章节？此操作不可撤销。')) return;
    
    const filtered = project.chapters.filter(ch => ch.id !== id);
    // 重新计算order
    const reordered = filtered.map((ch, index) => ({ ...ch, order: index }));
    updateProject({ chapters: reordered });
  },

  moveChapterToVolume: (chapterId, targetVolumeId) => {
    const { project, updateProject } = get();
    const updatedChapters = project.chapters.map(ch => {
      if (ch.id === chapterId) {
        return { 
          ...ch, 
          volumeId: targetVolumeId,
          volumeOrder: targetVolumeId 
            ? project.chapters.filter(c => c.volumeId === targetVolumeId).length
            : undefined
        };
      }
      return ch;
    });
    updateProject({ chapters: updatedChapters });
  },

  reorderChapters: (chapterIds) => {
    const { project, updateProject } = get();
    const chapterMap = new Map(project.chapters.map(ch => [ch.id, ch]));
    const reordered = chapterIds
      .map(id => chapterMap.get(id))
      .filter((ch): ch is Chapter => ch !== undefined)
      .map((ch, index) => ({ ...ch, order: index }));
    updateProject({ chapters: reordered });
  },

  updateChapterOrder: (chapterId, newOrder) => {
    const { project, updateProject } = get();
    const chapters = [...project.chapters];
    const index = chapters.findIndex(ch => ch.id === chapterId);
    if (index === -1) return;
    
    const [moved] = chapters.splice(index, 1);
    chapters.splice(newOrder, 0, moved);
    
    const reordered = chapters.map((ch, idx) => ({ ...ch, order: idx }));
    updateProject({ chapters: reordered });
  },

  // --- 角色管理 ---
  createCharacter: (data) => {
    const { project, updateProject } = get();
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: data.name || '未命名角色',
      description: data.description || '',
      role: data.role || '配角',
      archetype: data.archetype || '',
      relationships: data.relationships || '',
      ...data
    };
    updateProject({ characters: [...project.characters, newCharacter] });
    return newCharacter;
  },

  updateCharacter: (id, data) => {
    const { project, updateProject } = get();
    const updatedCharacters = project.characters.map(char =>
      char.id === id ? { ...char, ...data } : char
    );
    updateProject({ characters: updatedCharacters });
  },

  deleteCharacter: (id) => {
    const { project, updateProject } = get();
    if (!confirm('确定删除此角色？此操作不可撤销。')) return;
    updateProject({ characters: project.characters.filter(char => char.id !== id) });
  },

  // --- 世界观管理 ---
  createWorldSetting: (data) => {
    const { project, updateProject } = get();
    const newSetting: WorldSetting = {
      id: crypto.randomUUID(),
      category: data.category || 'Other',
      title: data.title || '未命名设定',
      content: data.content || '',
      ...data
    };
    updateProject({ worldSettings: [...project.worldSettings, newSetting] });
    return newSetting;
  },

  updateWorldSetting: (id, data) => {
    const { project, updateProject } = get();
    const updatedSettings = project.worldSettings.map(setting =>
      setting.id === id ? { ...setting, ...data } : setting
    );
    updateProject({ worldSettings: updatedSettings });
  },

  deleteWorldSetting: (id) => {
    const { project, updateProject } = get();
    if (!confirm('确定删除此世界设定？此操作不可撤销。')) return;
    updateProject({ worldSettings: project.worldSettings.filter(s => s.id !== id) });
  },

  // --- 写作环境 ---
  updateWritingEnvironment: (env) => {
    const { project, updateProject } = get();
    const currentEnv = project.writingEnvironment || DEFAULT_WRITING_ENVIRONMENT;
    updateProject({
      writingEnvironment: { ...currentEnv, ...env }
    });
  },

  // --- 批量操作 ---
  batchUpdate: (updates) => {
    const { updateProject } = get();
    updateProject(updates);
  },

  // --- 统计计算 ---
  getWritingStats: () => {
    const { project } = get();
    const chapters = project.chapters || [];
    const chapterWords = chapters.reduce((sum, ch) => sum + (ch.content?.length || 0), 0);
    
    return {
      totalWords: chapterWords,
      chapterWords,
      chapterCount: chapters.length,
      volumeCount: project.volumes?.length || 0,
      characterCount: project.characters?.length || 0,
      worldSettingCount: project.worldSettings?.length || 0,
      lastModified: project.lastModified,
    };
  },

  // --- 选择器辅助 ---
  getChapterById: (id) => {
    return get().project.chapters.find(ch => ch.id === id);
  },

  getVolumeById: (id) => {
    return get().project.volumes.find(v => v.id === id);
  },

  getCharacterById: (id) => {
    return get().project.characters.find(char => char.id === id);
  },

  getWorldSettingById: (id) => {
    return get().project.worldSettings.find(s => s.id === id);
  },

  getChaptersByVolume: (volumeId) => {
    const chapters = get().project.chapters;
    if (!volumeId) {
      return chapters.filter(ch => !ch.volumeId);
    }
    return chapters
      .filter(ch => ch.volumeId === volumeId)
      .sort((a, b) => (a.volumeOrder || 0) - (b.volumeOrder || 0));
  },
}));

// ============================================
// 选择器 Hooks（用于性能优化）
// ============================================

/** 获取项目标题 */
export const useProjectTitle = () => useProjectStore((state) => state.project.title);

/** 获取章节列表（按order排序） */
export const useChapters = () => 
  useProjectStore((state) => state.project.chapters.slice().sort((a, b) => a.order - b.order));

/** 获取分卷列表 */
export const useVolumes = () => useProjectStore((state) => state.project.volumes);

/** 获取角色列表 */
export const useCharacters = () => useProjectStore((state) => state.project.characters);

/** 获取世界观设定列表 */
export const useWorldSettings = () => useProjectStore((state) => state.project.worldSettings);

/** 获取写作统计 */
export const useWritingStats = () => {
  const store = useProjectStore();
  return store.getWritingStats();
};
