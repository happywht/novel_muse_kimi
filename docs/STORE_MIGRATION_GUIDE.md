# Store 拆分迁移指南

## 概述

本次更新将庞大的 `useProjectStore` 拆分为三个专注的 Store，以提升性能和可维护性：

| Store | 职责 | 持久化 | 文件 |
|-------|------|--------|------|
| `useProjectStore` | 项目数据（章节、角色、世界观等） | ✅ 是 | `stores/useProjectStore.ts` |
| `useUIStore` | UI状态（导航、选中、面板显示） | ❌ 否 | `stores/useUIStore.ts` |
| `useAIStore` | AI状态（生成、流式输出、建议） | ⚡ 部分 | `stores/useAIStore.ts` |

## 快速迁移

### 方法1：使用兼容层（最快）

如果你的代码大量使用了旧的 Store API，可以使用兼容层快速过渡：

```typescript
// 之前
import { useProjectStore } from './store/useProjectStore';

function MyComponent() {
  const { project, activeSection, setActiveSection } = useProjectStore();
  // ...
}

// 之后（兼容层）
import { useProjectStoreLegacy } from './stores';

function MyComponent() {
  const { project, activeSection, setActiveSection } = useProjectStoreLegacy();
  // 代码无需修改！
}
```

**警告**：兼容层会订阅所有 Store，可能导致不必要的重渲染。建议在完成迁移后使用独立 Store。

### 方法2：使用独立 Store（推荐）

```typescript
// 之前
import { useProjectStore } from './store/useProjectStore';

function MyComponent() {
  const { 
    project, 
    activeSection, 
    setActiveSection,
    isGenerating 
  } = useProjectStore();
  // ...
}

// 之后（独立 Store）
import { 
  useProjectStore, 
  useUIStore, 
  useAIStore 
} from './stores';

function MyComponent() {
  const project = useProjectStore(state => state.project);
  const activeSection = useUIStore(state => state.activeSection);
  const setActiveSection = useUIStore(state => state.setActiveSection);
  const isGenerating = useAIStore(state => state.isGenerating);
  // ...
}
```

## 性能优化选择器

新 Store 提供了优化的选择器 Hooks，只订阅特定字段，避免不必要的重渲染：

```typescript
import { 
  useProjectTitle,      // 只订阅项目标题
  useChapters,          // 只订阅章节列表
  useVolumes,           // 只订阅分卷列表
  useCharacters,        // 只订阅角色列表
  useActiveSection,     // 只订阅当前导航
  useActiveChapterId,   // 只订阅当前章节ID
  useIsGenerating,      // 只订阅生成状态
  useShowContextPanel,  // 只订阅面板状态
} from './stores';

// 使用选择器（推荐）
function OptimizedComponent() {
  const title = useProjectTitle();
  const chapters = useChapters();
  const activeSection = useActiveSection();
  
  // 只有当这些特定字段变化时，组件才会重渲染
  return <div>{title}</div>;
}
```

## 常用操作对照表

### 项目数据操作

| 操作 | 之前 | 之后 |
|------|------|------|
| 读取项目 | `useProjectStore(s => s.project)` | `useProjectStore(s => s.project)` |
| 更新项目 | `updateProject(data)` | `updateProject(data)` |
| 创建章节 | `createChapter(vid, pid)` | `createChapter(vid, pid)` |
| 更新章节 | `updateChapter(id, data)` | `updateChapter(id, data)` |
| 删除章节 | `deleteChapter(id)` | `deleteChapter(id)` |
| 创建角色 | `createCharacter(data)` | `createCharacter(data)` |
| 更新角色 | `updateCharacter(id, data)` | `updateCharacter(id, data)` |
| 创建分卷 | `createVolume(data)` | `createVolume(data)` |

### UI 状态操作

| 操作 | 之前 | 之后 |
|------|------|------|
| 当前导航 | `useProjectStore(s => s.activeSection)` | `useUIStore(s => s.activeSection)` |
| 切换导航 | `setActiveSection(section)` | `useUIStore(s => s.setActiveSection)(section)` |
| 当前章节ID | `activeChapterId` | `useUIStore(s => s.activeChapterId)` |
| 设置当前章节 | `setActiveChapterId(id)` | `useUIStore(s => s.setActiveChapterId)(id)` |
| 上下文面板 | `showContextPanel` | `useUIStore(s => s.showContextPanel)` |
| 切换面板 | `setShowContextPanel(bool)` | `useUIStore(s => s.toggleContextPanel)()` |
| 写作模式 | `writingMode` | `useUIStore(s => s.writingMode)` |
| 保存状态 | `isSaving` | `useUIStore(s => s.isSaving)` |

### AI 状态操作

| 操作 | 之前 | 之后 |
|------|------|------|
| 生成状态 | `isGenerating` | `useAIStore(s => s.isGenerating)` |
| 开始生成 | - | `useAIStore(s => s.startGeneration)(task)` |
| 追加流 | - | `useAIStore(s => s.appendStream)(chunk)` |
| 结束生成 | - | `useAIStore(s => s.endGeneration)()` |
| 取消生成 | - | `useAIStore(s => s.cancelGeneration)()` |
| 流式输出 | - | `useAIStore(s => s.currentStream)` |

## 组合 Hooks

为了方便使用，我们提供了一些组合 Hooks：

```typescript
import { 
  useActiveChapterWithVolume,
  useChaptersByActiveVolume,
  useVolumesWithStats 
} from './stores';

// 获取当前章节及其所属卷
const { chapter, volume } = useActiveChapterWithVolume();

// 获取当前激活分卷下的所有章节
const chapters = useChaptersByActiveVolume();

// 获取带统计信息的分卷列表
const volumesWithStats = useVolumesWithStats();
// volumesWithStats[0].chapterCount
// volumesWithStats[0].currentWordCount
// volumesWithStats[0].progress
```

## 数据迁移

新的 Store 会自动处理数据迁移：

1. **首次加载**时会检查存储版本
2. **自动迁移**旧版本数据到新结构
3. **清理**已废弃的字段

无需手动干预，但建议在迁移后备份您的数据。

### 手动导出/导入

```typescript
import { useProjectStore } from './stores';

// 导出当前项目
const exportProject = () => {
  const json = useProjectStore.getState().exportProject();
  // 保存json到文件
};

// 导入项目
const importProject = async (json: string) => {
  const newId = await useProjectStore.getState().importProject(json);
  // newId 是新项目的ID
};
```

## 性能优化建议

### 1. 使用选择器

```typescript
// ❌ 不推荐：订阅整个项目对象
const project = useProjectStore(state => state.project);

// ✅ 推荐：只订阅需要的字段
const chapters = useProjectStore(state => state.project.chapters);

// ✅ 更好：使用优化的选择器
const chapters = useChapters();
```

### 2. 分离 UI 和数据的更新

```typescript
// ❌ 不推荐：UI变化触发数据保存
const handleTogglePanel = () => {
  setShowContextPanel(!showContextPanel); // 这会触发整个store更新
};

// ✅ 推荐：UI状态使用独立的Store
const handleTogglePanel = () => {
  useUIStore.getState().toggleContextPanel(); // 只更新UI，不触发数据保存
};
```

### 3. 批量更新

```typescript
// ❌ 不推荐：多次更新触发多次保存
updateProject({ title: 'New Title' });
updateProject({ genre: 'Fantasy' });

// ✅ 推荐：一次性批量更新
batchUpdate({ 
  title: 'New Title', 
  genre: 'Fantasy' 
});
```

## 文件结构

```
stores/
├── useProjectStore.ts      # 核心项目数据Store（持久化）
├── useUIStore.ts           # UI状态Store（非持久化）
├── useAIStore.ts           # AI相关状态Store（部分持久化）
└── index.ts                # 统一导出 + 兼容层 + 组合Hooks
```

## API 对比

### 原 useProjectStore（521行，混合所有状态）

```typescript
interface ProjectStore {
  // 项目数据
  project: ProjectState;
  savedProjects: ProjectState[];
  
  // UI状态（已迁移）
  activeSection: AppSection;
  activeChapterId: string | null;
  showContextPanel: boolean;
  writingMode: 'NORMAL' | 'ZEN' | 'FOCUS';
  // ... 更多UI状态
  
  // 29+ Actions 混合在一起
}
```

### 新拆分 Store

```typescript
// useProjectStore.ts - 只关注项目数据
interface ProjectStore {
  project: ProjectState;
  savedProjects: ProjectState[];
  // Actions: updateProject, CRUD operations
  // 自动持久化
}

// useUIStore.ts - 只关注UI状态
interface UIStore {
  activeSection: AppSection;
  activeChapterId: string | null;
  showContextPanel: boolean;
  // ... UI Actions
  // 不持久化
}

// useAIStore.ts - 只关注AI状态
interface AIStore {
  isGenerating: boolean;
  currentStream: string;
  aiSuggestions: Map<string, string>;
  // ... AI Actions
  // 部分持久化
}
```

## 故障排除

### 数据丢失

如果迁移后发现数据丢失：

1. 检查浏览器控制台是否有错误
2. 查看 localStorage 中 `muse_projects` 是否存在
3. 尝试从备份恢复

### TypeScript 错误

如果遇到类型错误，请确保：

1. 更新所有导入路径
2. 重新运行 TypeScript 编译器
3. 检查是否有循环依赖

### 性能问题

如果发现性能下降：

1. 使用 React DevTools Profiler 检查重渲染
2. 使用选择器 Hooks 替代完整 state 订阅
3. 避免在 render 中调用 `getState()`

---

**迁移截止日期**：建议在 2 周内完成迁移，届时将移除兼容层。
