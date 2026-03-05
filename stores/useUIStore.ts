/**
 * UI Store - UI状态管理（非持久化）
 * 负责管理所有临时UI状态，避免触发项目数据Store的更新
 */

import { create } from 'zustand';
import { AppSection } from '../types';

// ============================================
// UI Store 状态接口
// ============================================
export interface UIState {
  // --- 导航状态 ---
  activeSection: AppSection;
  
  // --- 选中状态 ---
  activePlotNodeId: string | null;
  activeChapterId: string | null;
  activeVolumeId: string | null;
  activeCharacterId: string | null;
  activeWorldSettingId: string | null;
  
  // --- 面板显示状态 ---
  showGuide: boolean;
  showSettings: boolean;
  showPromptTuner: boolean;
  showProjectList: boolean;
  showContextPanel: boolean;
  showAiPanel: boolean;
  showQualityPanel: boolean;
  
  // --- 写作模式 ---
  writingMode: 'NORMAL' | 'ZEN' | 'FOCUS';
  isZenMode: boolean;
  
  // --- 同步状态 ---
  isSaving: boolean;
  isLoading: boolean;
  
  // --- 移动端菜单 ---
  isMobileMenuOpen: boolean;
}

// ============================================
// UI Store Actions 接口
// ============================================
export interface UIActions {
  // 导航
  setActiveSection: (section: AppSection) => void;
  
  // 选中状态
  setActivePlotNodeId: (id: string | null) => void;
  setActiveChapterId: (id: string | null) => void;
  setActiveVolumeId: (id: string | null) => void;
  setActiveCharacterId: (id: string | null) => void;
  setActiveWorldSettingId: (id: string | null) => void;
  
  // 面板显示
  setShowGuide: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowPromptTuner: (show: boolean) => void;
  setShowProjectList: (show: boolean) => void;
  setShowContextPanel: (show: boolean) => void;
  setShowAiPanel: (show: boolean) => void;
  setShowQualityPanel: (show: boolean) => void;
  
  // 切换面板（取反）
  toggleContextPanel: () => void;
  toggleAiPanel: () => void;
  toggleQualityPanel: () => void;
  toggleZenMode: () => void;
  toggleMobileMenu: () => void;
  
  // 写作模式
  setWritingMode: (mode: 'NORMAL' | 'ZEN' | 'FOCUS') => void;
  setIsZenMode: (isZen: boolean) => void;
  
  // 同步状态
  setIsSaving: (saving: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  
  // 批量重置UI状态
  resetUIState: () => void;
}

// ============================================
// 初始状态
// ============================================
const INITIAL_UI_STATE: UIState = {
  activeSection: AppSection.LOBBY,
  activePlotNodeId: null,
  activeChapterId: null,
  activeVolumeId: null,
  activeCharacterId: null,
  activeWorldSettingId: null,
  showGuide: false,
  showSettings: false,
  showPromptTuner: false,
  showProjectList: false,
  showContextPanel: true,
  showAiPanel: false,
  showQualityPanel: false,
  writingMode: 'NORMAL',
  isZenMode: false,
  isSaving: false,
  isLoading: true,
  isMobileMenuOpen: false,
};

// ============================================
// Store 实现
// ============================================
export const useUIStore = create<UIState & UIActions>((set, get) => ({
  ...INITIAL_UI_STATE,

  // --- 导航 ---
  setActiveSection: (section) => set({ activeSection: section }),

  // --- 选中状态 ---
  setActivePlotNodeId: (id) => set({ activePlotNodeId: id }),
  setActiveChapterId: (id) => set({ activeChapterId: id }),
  setActiveVolumeId: (id) => set({ activeVolumeId: id }),
  setActiveCharacterId: (id) => set({ activeCharacterId: id }),
  setActiveWorldSettingId: (id) => set({ activeWorldSettingId: id }),

  // --- 面板显示 ---
  setShowGuide: (show) => set({ showGuide: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowPromptTuner: (show) => set({ showPromptTuner: show }),
  setShowProjectList: (show) => set({ showProjectList: show }),
  setShowContextPanel: (show) => set({ showContextPanel: show }),
  setShowAiPanel: (show) => set({ showAiPanel: show }),
  setShowQualityPanel: (show) => set({ showQualityPanel: show }),

  // --- 切换面板 ---
  toggleContextPanel: () => set((state) => ({ showContextPanel: !state.showContextPanel })),
  toggleAiPanel: () => set((state) => ({ showAiPanel: !state.showAiPanel })),
  toggleQualityPanel: () => set((state) => ({ showQualityPanel: !state.showQualityPanel })),
  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  // --- 写作模式 ---
  setWritingMode: (mode) => set({ writingMode: mode }),
  setIsZenMode: (isZen) => set({ isZenMode: isZen }),

  // --- 同步状态 ---
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  // --- 重置状态 ---
  resetUIState: () => set(INITIAL_UI_STATE),
}));

// ============================================
// 选择器 Hooks（用于性能优化，精确订阅）
// ============================================

/** 获取当前激活的章节ID */
export const useActiveChapterId = () => useUIStore((state) => state.activeChapterId);

/** 获取当前激活的卷ID */
export const useActiveVolumeId = () => useUIStore((state) => state.activeVolumeId);

/** 获取当前导航区域 */
export const useActiveSection = () => useUIStore((state) => state.activeSection);

/** 获取写作模式 */
export const useWritingMode = () => useUIStore((state) => state.writingMode);

/** 获取上下文面板显示状态 */
export const useShowContextPanel = () => useUIStore((state) => state.showContextPanel);

/** 获取加载状态 */
export const useIsLoading = () => useUIStore((state) => state.isLoading);

/** 获取保存状态 */
export const useIsSaving = () => useUIStore((state) => state.isSaving);
