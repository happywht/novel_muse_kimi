/**
 * Novel Muse - Project Store (已废弃)
 * 
 * ⚠️ 警告：此文件已被废弃，请使用新的拆分Store
 * 
 * 新的Store位置：
 * - stores/useProjectStore.ts - 项目数据（持久化）
 * - stores/useUIStore.ts      - UI状态（非持久化）
 * - stores/useAIStore.ts      - AI状态（部分持久化）
 * - stores/index.ts           - 统一导出
 * 
 * 迁移示例：
 * 
 * 之前：
 *   import { useProjectStore } from './store/useProjectStore';
 *   const { project, activeSection, isGenerating } = useProjectStore();
 * 
 * 之后：
 *   import { useProjectStore, useUIStore, useAIStore } from './stores';
 *   const project = useProjectStore(state => state.project);
 *   const activeSection = useUIStore(state => state.activeSection);
 *   const isGenerating = useAIStore(state => state.isGenerating);
 * 
 * 或者使用向后兼容Hook（临时方案）：
 *   import { useProjectStoreLegacy } from './stores';
 *   const { project, activeSection } = useProjectStoreLegacy();
 */

// 重新导出新的Store作为兼容层
export { 
  useProjectStore,
  useProjectStoreLegacy,
  useUIStore,
  useAIStore,
  useProjectTitle,
  useChapters,
  useVolumes,
  useActiveSection,
  useActiveChapterId,
  useIsGenerating,
  INITIAL_PROJECT,
  checkAndMigrateStores
} from '../stores';

// 类型重新导出
export type { 
  ProjectStore,
  UIState,
  UIActions,
  AIState,
  AIActions,
  AIGenerationTask,
  AIMessage,
  AISuggestion
} from '../stores';

// 在控制台输出废弃警告（开发环境）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.warn(
    '[Deprecated] store/useProjectStore.ts 已被废弃。\n' +
    '请迁移到新的Store结构：import { ... } from "./stores"\n' +
    '详见：https://github.com/your-repo/migration-guide.md'
  );
}
