/**
 * Stores Index - 统一导出所有Store
 * 
 * 使用指南：
 * 
 * 1. 新项目开发请使用拆分后的独立Store：
 *    ```typescript
 *    import { useProjectStore, useUIStore, useAIStore } from './stores';
 *    
 *    // 项目数据（持久化）
 *    const project = useProjectStore((state) => state.project);
 *    
 *    // UI状态（非持久化）
 *    const activeSection = useUIStore((state) => state.activeSection);
 *    
 *    // AI状态（部分持久化）
 *    const isGenerating = useAIStore((state) => state.isGenerating);
 *    ```
 * 
 * 2. 性能优化选择器（推荐）：
 *    ```typescript
 *    import { 
 *      useProjectTitle, 
 *      useChapters, 
 *      useActiveSection,
 *      useIsGenerating 
 *    } from './stores';
 *    
 *    // 这些选择器只订阅特定字段，避免不必要的重渲染
 *    const title = useProjectTitle();
 *    const chapters = useChapters();
 *    ```
 */

// ============================================
// 基础 Store 导出
// ============================================

import { 
  useProjectStore as useProjectStoreBase,
  useProjectTitle,
  useChapters,
  useVolumes,
  useCharacters,
  useWorldSettings,
  useWritingStats,
  INITIAL_PROJECT,
  type ProjectStore
} from './useProjectStore';

// 重新导出基础 store
export {
  useProjectStoreBase,
  useProjectTitle,
  useChapters,
  useVolumes,
  useCharacters,
  useWorldSettings,
  useWritingStats,
  INITIAL_PROJECT,
  type ProjectStore
};

export { 
  useUIStore,
  useActiveChapterId,
  useActiveVolumeId,
  useActiveSection,
  useWritingMode,
  useShowContextPanel,
  useIsLoading,
  useIsSaving,
  type UIState,
  type UIActions
} from './useUIStore';

export { 
  useAIStore,
  useIsGenerating,
  useCurrentStream,
  useCurrentTask,
  useGenerationProgress,
  useAISettings,
  usePendingSuggestionsCount,
  type AIGenerationTask,
  type AIMessage,
  type AISuggestion,
  type AIState,
  type AIActions
} from './useAIStore';

// ============================================
// 向后兼容层 - useProjectStore
// 组合所有状态以保持向后兼容
// ============================================

import { useMemo } from 'react';
import { type ProjectStore as BaseProjectStore } from './useProjectStore';
import { useUIStore, type UIState, type UIActions } from './useUIStore';
import { useAIStore, type AIState, type AIActions } from './useAIStore';
import type { AppSection } from '../types';

// 组合状态类型
type CombinedState = BaseProjectStore & UIState & AIState;
type CombinedActions = UIActions & AIActions;

/**
 * 向后兼容的 useProjectStore - 组合所有状态
 * 
 * 警告：此Hook会订阅多个Store，可能导致不必要的重渲染。
 * 建议在迁移完成后使用独立的 Store：
 * - useProjectStoreBase - 项目数据
 * - useUIStore - UI状态
 * - useAIStore - AI状态
 * 
 * @deprecated 请使用拆分后的独立Store以获得更好的性能
 */
export function useProjectStore<T = CombinedState & CombinedActions>(
  selector?: (state: CombinedState & CombinedActions) => T
): T {
  const projectState = useProjectStoreBase((state: BaseProjectStore) => state);
  const uiState = useUIStore();
  const aiState = useAIStore();
  
  const combinedState = useMemo(() => {
    return {
      // ProjectStore 状态
      ...projectState,
      // UIStore 状态
      activeSection: uiState.activeSection,
      setActiveSection: uiState.setActiveSection,
      activePlotNodeId: uiState.activePlotNodeId,
      setActivePlotNodeId: uiState.setActivePlotNodeId,
      activeChapterId: uiState.activeChapterId,
      setActiveChapterId: uiState.setActiveChapterId,
      activeVolumeId: uiState.activeVolumeId,
      setActiveVolumeId: uiState.setActiveVolumeId,
      activeCharacterId: uiState.activeCharacterId,
      setActiveCharacterId: uiState.setActiveCharacterId,
      activeWorldSettingId: uiState.activeWorldSettingId,
      setActiveWorldSettingId: uiState.setActiveWorldSettingId,
      showGuide: uiState.showGuide,
      setShowGuide: uiState.setShowGuide,
      showSettings: uiState.showSettings,
      setShowSettings: uiState.setShowSettings,
      showPromptTuner: uiState.showPromptTuner,
      setShowPromptTuner: uiState.setShowPromptTuner,
      showProjectList: uiState.showProjectList,
      setShowProjectList: uiState.setShowProjectList,
      writingMode: uiState.writingMode,
      setWritingMode: uiState.setWritingMode,
      showContextPanel: uiState.showContextPanel,
      setShowContextPanel: uiState.setShowContextPanel,
      showAiPanel: uiState.showAiPanel,
      setShowAiPanel: uiState.setShowAiPanel,
      showQualityPanel: uiState.showQualityPanel,
      setShowQualityPanel: uiState.setShowQualityPanel,
      isZenMode: uiState.isZenMode,
      setIsZenMode: uiState.setIsZenMode,
      toggleZenMode: uiState.toggleZenMode,
      toggleContextPanel: uiState.toggleContextPanel,
      toggleAiPanel: uiState.toggleAiPanel,
      toggleQualityPanel: uiState.toggleQualityPanel,
      toggleMobileMenu: uiState.toggleMobileMenu,
      isMobileMenuOpen: uiState.isMobileMenuOpen,
      isSaving: uiState.isSaving,
      setIsSaving: uiState.setIsSaving,
      isLoading: uiState.isLoading,
      setIsLoading: uiState.setIsLoading,
      resetUIState: uiState.resetUIState,
      // AIStore 状态
      isGenerating: aiState.isGenerating,
      currentTask: aiState.currentTask,
      currentStream: aiState.currentStream,
      generationProgress: aiState.generationProgress,
      messages: aiState.messages,
      currentConversationId: aiState.currentConversationId,
      suggestions: aiState.suggestions,
      pendingSuggestions: aiState.pendingSuggestions,
      settings: aiState.settings,
      stats: aiState.stats,
      startGeneration: aiState.startGeneration,
      appendStream: aiState.appendStream,
      endGeneration: aiState.endGeneration,
      cancelGeneration: aiState.cancelGeneration,
      setGenerationProgress: aiState.setGenerationProgress,
      addMessage: aiState.addMessage,
      clearMessages: aiState.clearMessages,
      setCurrentConversation: aiState.setCurrentConversation,
      addSuggestion: aiState.addSuggestion,
      acceptSuggestion: aiState.acceptSuggestion,
      rejectSuggestion: aiState.rejectSuggestion,
      clearSuggestions: aiState.clearSuggestions,
      getSuggestionById: aiState.getSuggestionById,
      getSuggestionsByChapter: aiState.getSuggestionsByChapter,
      updateSettings: aiState.updateSettings,
      recordGeneration: aiState.recordGeneration,
      resetAIState: aiState.resetAIState,
    } as CombinedState & CombinedActions;
  }, [projectState, uiState, aiState]);
  
  if (selector) {
    return selector(combinedState);
  }
  
  return combinedState as T;
}

/**
 * 向后兼容Hook - 模拟原useProjectStore的API
 * 
 * 警告：此Hook会订阅多个Store，可能导致不必要的重渲染。
 * 建议在迁移完成后使用独立的Store。
 * 
 * @deprecated 请使用拆分后的独立Store
 */
export function useProjectStoreLegacy() {
  // 项目数据
  const projectStore = useProjectStoreBase((state) => ({
    project: state.project,
    savedProjects: state.savedProjects,
    updateProject: state.updateProject,
    setProject: state.setProject,
    initialize: state.initialize,
    createProject: state.createProject,
    switchProject: state.switchProject,
    deleteProject: state.deleteProject,
    createVolume: state.createVolume,
    updateVolume: state.updateVolume,
    deleteVolume: state.deleteVolume,
    createChapter: state.createChapter,
    updateChapter: state.updateChapter,
    deleteChapter: state.deleteChapter,
    moveChapterToVolume: state.moveChapterToVolume,
    createCharacter: state.createCharacter,
    updateCharacter: state.updateCharacter,
    deleteCharacter: state.deleteCharacter,
    createWorldSetting: state.createWorldSetting,
    updateWorldSetting: state.updateWorldSetting,
    deleteWorldSetting: state.deleteWorldSetting,
    updateWritingEnvironment: state.updateWritingEnvironment,
    getWritingStats: state.getWritingStats,
  }));

  // UI状态
  const uiStore = useUIStore((state) => ({
    activeSection: state.activeSection,
    setActiveSection: state.setActiveSection,
    activePlotNodeId: state.activePlotNodeId,
    setActivePlotNodeId: state.setActivePlotNodeId,
    activeChapterId: state.activeChapterId,
    setActiveChapterId: state.setActiveChapterId,
    activeVolumeId: state.activeVolumeId,
    setActiveVolumeId: state.setActiveVolumeId,
    showGuide: state.showGuide,
    setShowGuide: state.setShowGuide,
    showSettings: state.showSettings,
    setShowSettings: state.setShowSettings,
    showPromptTuner: state.showPromptTuner,
    setShowPromptTuner: state.setShowPromptTuner,
    showProjectList: state.showProjectList,
    setShowProjectList: state.setShowProjectList,
    writingMode: state.writingMode,
    setWritingMode: state.setWritingMode,
    showContextPanel: state.showContextPanel,
    setShowContextPanel: state.setShowContextPanel,
    isSaving: state.isSaving,
    setIsSaving: state.setIsSaving,
    isLoading: state.isLoading,
    setIsLoading: state.setIsLoading,
  }));

  // AI状态
  const aiStore = useAIStore((state) => ({
    isGenerating: state.isGenerating,
    currentStream: state.currentStream,
    startGeneration: state.startGeneration,
    appendStream: state.appendStream,
    endGeneration: state.endGeneration,
    cancelGeneration: state.cancelGeneration,
  }));

  return {
    ...projectStore,
    ...uiStore,
    ...aiStore,
    // 提供getState方法用于直接访问
    getState: () => ({
      ...useProjectStoreBase.getState(),
      ...useUIStore.getState(),
      ...useAIStore.getState(),
    }),
  };
}

// ============================================
// 便捷组合Hooks
// ============================================

/**
 * 获取当前活跃的章节详情（包含所属卷信息）
 */
export function useActiveChapterWithVolume() {
  const activeChapterId = useUIStore((state: UIState & UIActions) => state.activeChapterId);
  const getChapterById = useProjectStoreBase((state: BaseProjectStore) => state.getChapterById);
  const getVolumeById = useProjectStoreBase((state: BaseProjectStore) => state.getVolumeById);
  
  return useMemo(() => {
    if (!activeChapterId) return null;
    const chapter = getChapterById(activeChapterId);
    if (!chapter) return null;
    const volume = chapter.volumeId ? getVolumeById(chapter.volumeId) : null;
    return { chapter, volume };
  }, [activeChapterId, getChapterById, getVolumeById]);
}

/**
 * 获取当前活跃分卷下的所有章节
 */
export function useChaptersByActiveVolume() {
  const activeVolumeId = useUIStore((state: UIState & UIActions) => state.activeVolumeId);
  const getChaptersByVolume = useProjectStoreBase((state: BaseProjectStore) => state.getChaptersByVolume);
  
  return useMemo(() => {
    return getChaptersByVolume(activeVolumeId || undefined);
  }, [activeVolumeId, getChaptersByVolume]);
}

/**
 * 获取带有统计信息的分卷列表
 */
export function useVolumesWithStats() {
  const volumes = useProjectStoreBase((state: BaseProjectStore) => state.project.volumes);
  const chapters = useProjectStoreBase((state: BaseProjectStore) => state.project.chapters);
  
  return useMemo(() => {
    return volumes.map((volume: BaseProjectStore['project']['volumes'][0]) => {
      const volumeChapters = chapters.filter((ch: BaseProjectStore['project']['chapters'][0]) => ch.volumeId === volume.id);
      const wordCount = volumeChapters.reduce((sum: number, ch: BaseProjectStore['project']['chapters'][0]) => sum + (ch.content?.length || 0), 0);
      return {
        ...volume,
        chapterCount: volumeChapters.length,
        currentWordCount: wordCount,
        progress: volume.targetWordCount > 0 
          ? Math.min(100, Math.round((wordCount / volume.targetWordCount) * 100))
          : 0,
      };
    });
  }, [volumes, chapters]);
}

// ============================================
// 存储版本管理
// ============================================

const STORES_VERSION = '2.0';

/**
 * 检查并执行存储迁移
 */
export function checkAndMigrateStores(): void {
  const storedVersion = localStorage.getItem('muse_stores_version');
  
  if (storedVersion !== STORES_VERSION) {
    console.log(`[Store Migration] Migrating from ${storedVersion || 'unknown'} to ${STORES_VERSION}`);
    
    // 执行迁移逻辑
    migrateFromV1ToV2();
    
    localStorage.setItem('muse_stores_version', STORES_VERSION);
  }
}

/**
 * 从V1迁移到V2
 * - 将UI状态从项目存储中分离
 */
function migrateFromV1ToV2(): void {
  try {
    const stored = localStorage.getItem('muse_projects');
    if (!stored) return;
    
    const projects = JSON.parse(stored);
    if (!Array.isArray(projects)) return;
    
    // 清理项目数据中的UI状态字段
    const cleaned = projects.map((p: any) => {
      // 删除已迁移到UIStore的字段
      delete p.activeSection;
      delete p.activeChapterId;
      delete p.activeVolumeId;
      delete p.showContextPanel;
      delete p.writingMode;
      
      return p;
    });
    
    localStorage.setItem('muse_projects', JSON.stringify(cleaned));
    console.log('[Store Migration] V1 -> V2 completed');
  } catch (e) {
    console.error('[Store Migration] Failed:', e);
  }
}

// 应用启动时自动执行迁移
checkAndMigrateStores();
