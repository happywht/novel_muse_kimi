/**
 * Novel Muse - Project Store (兼容层)
 * 
 * ⚠️ 警告：此文件已被废弃，请使用新的拆分Store
 * 
 * 新的Store位置：
 * - stores/useProjectStore.ts - 项目数据（持久化）
 * - stores/useUIStore.ts      - UI状态（非持久化）
 * - stores/useAIStore.ts      - AI状态（部分持久化）
 * - stores/index.ts           - 统一导出
 */

// 重新导出新的Store作为兼容层
export { 
  useProjectStore,
  useProjectStoreBase,
  useUIStore,
  useAIStore,
  useProjectTitle,
  useChapters,
  useVolumes,
  useCharacters,
  useWorldSettings,
  useWritingStats,
  INITIAL_PROJECT,
} from '../stores';

// 类型重新导出
export type { 
  ProjectStore,
  UIState,
  UIActions,
  AIState,
  AIActions,
} from '../stores';
