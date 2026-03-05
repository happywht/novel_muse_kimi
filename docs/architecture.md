# Novel Muse 核心功能架构方案

## 分卷系统 & 版本控制系统 完整实现指南

---

## 目录

1. [概述](#概述)
2. [分卷系统架构](#分卷系统架构)
3. [版本控制系统架构](#版本控制系统架构)
4. [数据流与状态管理](#数据流与状态管理)
5. [性能优化策略](#性能优化策略)
6. [扩展建议](#扩展建议)

---

## 概述

### 设计目标

| 功能 | 核心价值 | 技术挑战 |
|------|---------|---------|
| **分卷系统** | 支持长篇小说的多卷架构组织 | 章节与卷的关联管理、排序算法 |
| **版本控制** | 创作历史的可追溯与实验分支 | 数据结构快照、diff算法、存储优化 |

### 架构分层

```
前端层 (Frontend)
├── ChapterOutliner - 章节规划器（分卷管理UI）
├── VersionControlPanel - 版本控制面板
└── DraftingRoom - 写作工坊（集成上下文）

中端层 (Business Logic)
├── useProjectStore - Zustand状态管理
│   ├── 分卷Actions (createVolume/updateVolume/moveChapter)
│   └── 章节Actions (createChapter/updateChapter/reorder)
└── versionControlService - 版本控制服务
    ├── commit/switchBranch/createBranch
    └── getCommitHistory/cleanup

后端层 (Data)
├── TypeScript Types - Volume/Chapter/VersionBranch/VersionCommit
└── Persistence - localStorage/IndexedDB
```

---

## 分卷系统架构

### 前端层

#### 组件架构

```
ChapterOutliner
├── PlotNodeSidebar - 左侧情节节点选择
├── VolumeSection
│   ├── VolumeCard[]
│   │   ├── VolumeHeader - 标题、进度条、操作
│   │   └── VolumeContent
│   │       ├── ChapterCard[]
│   │       └── AddChapterButton
│   └── VolumeForm - 新建卷表单
└── UncategorizedSection - 未分类章节
```

#### 核心状态

```typescript
// 本地状态
const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
const [showVolumeForm, setShowVolumeForm] = useState(false);
const [volumeFormData, setVolumeFormData] = useState<Partial<Volume>>({});

// 派生计算 - 按卷分组章节
const chaptersByVolume = useMemo(() => {
  const map = new Map<string | undefined, Chapter[]>();
  project.volumes.forEach(vol => map.set(vol.id, []));
  map.set(undefined, []); // 未分类
  
  project.chapters.forEach(ch => {
    const list = map.get(ch.volumeId) || [];
    list.push(ch);
    map.set(ch.volumeId, list);
  });
  
  // 排序
  map.forEach((list, key) => {
    list.sort((a, b) => (a.volumeOrder || a.order) - (b.volumeOrder || b.order));
  });
  
  return map;
}, [project.chapters, project.volumes]);
```

#### 关键交互

```typescript
// 创建卷
const handleCreateVolume = () => {
  const volume = createVolume(volumeFormData);
  setExpandedVolumes(prev => new Set(prev).add(volume.id));
};

// 计算卷进度
const getVolumeProgress = (volumeId: string) => {
  const chapters = chaptersByVolume.get(volumeId) || [];
  const wordCount = chapters.reduce((sum, ch) => 
    sum + (ch.wordCount || ch.content?.length || 0), 0
  );
  return Math.min(100, (wordCount / volume.targetWordCount) * 100);
};
```

---

### 中端层

#### Store Actions

```typescript
// ===== createVolume =====
const createVolume = (data: Partial<Volume>): Volume => {
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
    color: data.color || generateRandomColor(),
    plotNodeIds: []
  };
  
  updateProject({ volumes: [...project.volumes, newVolume] });
  return newVolume;
};

// ===== deleteVolume =====
// 关键：删除卷时要处理其中的章节
const deleteVolume = (id: string) => {
  // 1. 将章节移至未分类
  const updatedChapters = project.chapters.map(ch => 
    ch.volumeId === id 
      ? { ...ch, volumeId: undefined, volumeOrder: undefined } 
      : ch
  );
  
  // 2. 删除卷
  updateProject({ 
    volumes: project.volumes.filter(v => v.id !== id),
    chapters: updatedChapters
  });
};

// ===== moveChapterToVolume =====
const moveChapterToVolume = (chapterId: string, targetVolumeId?: string) => {
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
};
```

---

### 后端层

#### 数据模型

```typescript
// Volume 类型
interface Volume {
  id: string;
  volumeNumber: number;           // 卷号（1, 2, 3...）
  title: string;
  subtitle?: string;
  theme: string;                  // 主题
  synopsis: string;               // 简介
  targetWordCount: number;
  currentWordCount: number;       // 缓存
  status: 'PLANNED' | 'WRITING' | 'COMPLETED';
  color?: string;                 // 可视化颜色
  plotNodeIds: string[];          // 关联情节节点
}

// Chapter 扩展
interface Chapter {
  id: string;
  volumeId?: string;              // 所属卷
  order: number;                  // 全局顺序
  volumeOrder?: number;           // 卷内顺序
}
```

#### 数据迁移

```typescript
// 旧项目兼容
const migrateLegacyData = (project: any): ProjectState => {
  return {
    ...INITIAL_PROJECT,
    ...project,
    volumes: project.volumes || [],
    chapters: (project.chapters || []).map((ch: any) => ({
      ...ch,
      volumeOrder: ch.volumeOrder ?? ch.order
    }))
  };
};
```

---

## 版本控制系统架构

### 前端层

#### 组件架构

```
VersionControlPanel
├── BranchInfoHeader - 当前分支信息
├── TabSwitch - 提交历史/分支切换
├── CommitsTab
│   ├── CommitActions - 提交/自动保存
│   ├── CommitForm - 手动提交表单
│   └── CommitTimeline - 提交历史时间线
└── BranchesTab
    ├── NewBranchForm - 新建分支表单
    └── BranchList - 分支列表
```

#### 关键交互

```typescript
// 创建提交
const handleCommit = () => {
  const { project: updated } = versionControlService.commit(
    project,
    commitMessage
  );
  updateProject({ versionControl: updated.versionControl });
};

// 创建分支
const handleCreateBranch = () => {
  const updated = versionControlService.createBranch(
    project,
    branchName,
    description,
    isExperiment
  );
  updateProject({ versionControl: updated.versionControl });
};
```

---

### 中端层

#### versionControlService

```typescript
export const versionControlService = {
  // 初始化
  initialize(project: ProjectState): ProjectState {
    if (project.versionControl) return project;
    
    return {
      ...project,
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
  },
  
  // 创建提交
  commit(project, message, author = '作者') {
    const vc = project.versionControl!;
    const wordCount = project.chapters?.reduce(
      (sum, ch) => sum + (ch.content?.length || 0), 0
    ) || 0;
    
    const commitId = `commit-${Date.now()}-${randomId()}`;
    const newCommit: VersionCommit = {
      id: commitId,
      parent: currentBranch?.head || '',
      message,
      author,
      timestamp: Date.now(),
      changes: [],
      wordCount
    };
    
    // 更新分支head
    const updatedBranches = vc.branches.map(b => 
      b.name === vc.currentBranch ? { ...b, head: commitId } : b
    );
    
    return {
      project: {
        ...project,
        versionControl: {
          ...vc,
          branches: updatedBranches,
          commits: [...vc.commits, newCommit]
        }
      },
      commitId
    };
  },
  
  // 获取提交历史（链表回溯）
  getCommitHistory(project, branchName?) {
    const vc = project.versionControl!;
    const branch = vc.branches.find(
      b => b.name === (branchName || vc.currentBranch)
    );
    if (!branch) return [];
    
    const history: VersionCommit[] = [];
    let currentId = branch.head;
    
    while (currentId) {
      const commit = vc.commits.find(c => c.id === currentId);
      if (!commit) break;
      history.push(commit);
      currentId = commit.parent;
    }
    
    return history;
  },
  
  // 清理旧提交（保留最近50个）
  cleanupCommits(project) {
    const vc = project.versionControl!;
    if (vc.commits.length <= 50) return project;
    
    const recentCommits = vc.commits.slice(-50);
    return {
      ...project,
      versionControl: {
        ...vc,
        commits: recentCommits
      }
    };
  }
};
```

---

### 后端层

#### 数据模型

```typescript
interface VersionBranch {
  name: string;           // 分支名
  head: string;           // 最新commit id
  base: string;           // 基于哪个commit创建
  description: string;
  createdAt: number;
  isExperiment: boolean;  // 实验分支标记
}

interface VersionCommit {
  id: string;
  parent: string;         // 父commit
  message: string;
  author: string;
  timestamp: number;
  changes: Array<{
    entityType: 'chapter' | 'character' | 'world' | 'plot';
    entityId: string;
    changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  }>;
  wordCount: number;      // 用于趋势图
}

// ProjectState扩展
interface ProjectState {
  versionControl?: {
    branches: VersionBranch[];
    currentBranch: string;
    commits: VersionCommit[];
  };
}
```

---

## 数据流与状态管理

### 单向数据流

```
User Action
    ↓
Component Handler (ChapterOutliner/VersionControlPanel)
    ↓
Store Action (useProjectStore)
    ↓
State Update + Persistence
    ↓
Component Re-render
```

### 关键原则

1. **派生数据用 useMemo** - chaptersByVolume、progress 等
2. **本地状态与全局状态分离** - 表单状态用 useState，业务数据用 Store
3. **批量更新** - 使用 updateProject 一次性更新多个字段

---

## 性能优化策略

### 1. 渲染优化

```typescript
// 使用选择器避免不必要渲染
export const useVolumes = () => useProjectStore((state) => state.project.volumes);
export const useChapters = () => useProjectStore((state) => state.project.chapters);

// VolumeCard 用 React.memo
const VolumeCard = React.memo(({ volume }: { volume: Volume }) => {
  // 只接收 volume 数据，不订阅整个 store
});
```

### 2. 存储优化

```typescript
// 字数缓存策略
const updateChapter = (id: string, data: Partial<Chapter>) => {
  if (data.content !== undefined) {
    data.wordCount = data.content.length;
  }
  updateChapterInStore(id, data);
};

// 提交历史限制
const MAX_COMMITS = 100;
const cleanupCommits = () => {
  if (commits.length > MAX_COMMITS) {
    // 保留最近100个
    commits = commits.slice(-MAX_COMMITS);
  }
};
```

### 3. 防抖处理

```typescript
// 自动保存防抖
const autoSave = debounce(() => {
  versionControlService.autoSave(project);
}, 5000);

// 字数统计防抖
const updateVolumeWordCount = debounce((volumeId: string) => {
  // 重新计算字数
}, 500);
```

---

## 扩展建议

### 短期优化

1. **拖拽排序** - 实现章节在卷间的拖拽移动
2. **卷模板** - 提供常见卷结构模板（起承转合）
3. **字数预警** - 当卷字数接近/超过目标时提醒

### 长期规划

1. **完整版本回退** - 保存完整数据快照，支持回退到任意提交
2. **分支合并** - 实验分支的合并功能
3. **冲突解决** - 分支合并时的冲突处理UI
4. **云端同步** - 版本历史同步到后端

---

## 总结

### 分卷系统核心价值
- **组织性** - 将长篇小说按卷划分，结构清晰
- **进度追踪** - 每卷独立字数目标和进度
- **灵活性** - 章节可在卷间自由移动

### 版本控制系统核心价值
- **安全感** - 创作历史可追溯，不怕误删
- **实验性** - 实验分支支持大胆尝试
- **趋势分析** - 字数增长曲线反映创作状态

### 技术亮点
1. **双向关联** - Chapter 与 Volume 的双向引用设计
2. **链表结构** - Commit 链表实现高效历史回溯
3. **懒加载优化** - 字数统计缓存避免重复计算
