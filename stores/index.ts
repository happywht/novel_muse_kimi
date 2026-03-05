/**
 * Stores Index - 统一导出所有Store
 */

import { useMemo } from 'react';

// ============================================
// 基础 Store 导出
// ============================================

export { 
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

export { 
  useUIStore,
  type UIState,
  type UIActions
} from './useUIStore';

export { 
  useAIStore,
  type AIState,
  type AIActions
} from './useAIStore';

// ============================================
// 向后兼容的 useProjectStore
// ============================================

import { useProjectStore as useProjectStoreBase, type ProjectStore } from './useProjectStore';
import { useUIStore, type UIState, type UIActions } from './useUIStore';
import { useAIStore, type AIState, type AIActions } from './useAIStore';

// 组合类型（包含状态和actions）
// 注意：isLoading 和 isSaving 使用 ProjectStore 中的版本
type CombinedStore = ProjectStore & Omit<UIState, 'isLoading' | 'isSaving'> & UIActions & AIState & AIActions;

/**
 * 向后兼容的 useProjectStore - 组合所有状态
 * @deprecated 建议使用拆分后的独立Store
 */
export function useProjectStore<T = CombinedStore>(selector?: (state: CombinedStore) => T): T {
  const projectState = useProjectStoreBase();
  const uiState = useUIStore();
  const aiState = useAIStore();
  
  const combinedState = useMemo(() => {
    // 解构分离出 isLoading 和 isSaving，确保使用 projectState 中的版本
    const { isLoading: _, isSaving: __, ...uiStateWithoutSync } = uiState;
    return {
      ...aiState,
      ...uiStateWithoutSync,
      ...projectState, // projectState 放在最后，确保 isLoading/isSaving 优先级最高
    } as CombinedStore;
  }, [projectState, uiState, aiState]);
  
  return selector ? selector(combinedState) : combinedState as unknown as T;
}
