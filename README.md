# Novel Muse - 小说架构师

一个 AI 辅助的小说创作工具，专注于「让小说更好写，写更好」。

## 核心功能

### Phase 1: 核心写作体验 (已完成)

#### Week 1: 分卷系统 + Chapter Outliner
- ✅ **分卷管理**: 支持创建多个分卷，每卷有独立的目标字数、主题和进度追踪
- ✅ **章节规划器**: 将 PlotNode 裂变为具体章节，支持细纲编辑和场景节拍链
- ✅ **双向绑定**: Chapter Outliner 与 DraftingRoom 无缝联动

#### Week 2: 沉浸式写作环境
- ✅ **智能上下文面板**: 侧边栏显示细纲、前文、场景节拍和世界观设定
- ✅ **禅模式**: 全屏无干扰写作模式
- ✅ **AI 助手面板**: 续写建议、润色优化
- ✅ **Tiptap 编辑器**: 富文本编辑，支持气泡菜单

#### Week 3-4: 基础架构
- ✅ **Zustand 状态管理**: 完整的状态管理，支持自动保存
- ✅ **TypeScript 类型系统**: 完整的类型定义，支持分卷、章节、人物弧光等
- ✅ **响应式 UI**: 基于 Tailwind CSS 的现代化界面

### Phase 2: 智能增强 (开发中)

- 🚧 Echo 系统升级: 自动状态追踪与连锁反应推演
- 🚧 知识图谱: Neo4j 图数据库支持的关系可视化
- 🚧 AI 协作写作: 人机交替写作模式

### Phase 3: 完善与优化 (部分完成)

- ✅ 写作统计: 字数统计、里程碑系统、分卷进度
- 🚧 导入导出: 支持多种格式导出
- 🚧 性能优化: 大数据量优化

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **状态管理**: Zustand
- **编辑器**: Tiptap (ProseMirror)
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **AI**: Google Gemini + 智谱 GLM (多模型路由)

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
GEMINI_API_KEY=your_gemini_api_key
GLM_API_KEY=your_glm_api_key
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

## 项目结构

```
novel_muse/
├── components/           # React 组件
│   ├── ChapterOutliner.tsx   # 章节规划器
│   ├── DraftingRoom.tsx      # 写作工坊
│   ├── Dashboard.tsx         # 仪表盘
│   ├── WorldBuilder.tsx      # 世界观构建
│   ├── CharacterCreator.tsx  # 人物创建
│   ├── PlotWeaver.tsx        # 情节编织
│   ├── WritingStats.tsx      # 写作统计
│   └── Sidebar.tsx           # 侧边栏
├── store/               # 状态管理
│   └── useProjectStore.ts    # Zustand Store
├── services/            # 服务层
│   ├── apiService.ts         # API 请求
│   └── storageService.ts     # 本地存储
├── types.ts             # TypeScript 类型定义
├── App.tsx              # 主应用
└── index.tsx            # 入口文件
```

## 核心特性

### 1. 分卷系统 (Volume System)

```typescript
interface Volume {
  id: string;
  volumeNumber: number;
  title: string;
  theme: string;
  targetWordCount: number;
  currentWordCount: number;
  status: 'PLANNED' | 'WRITING' | 'COMPLETED';
  color: string;
}
```

每卷有独立的进度条，章节可以归属于特定卷或保持未分类。

### 2. 智能上下文面板

写作时自动显示：
- **细纲**: 当前章节的详细大纲
- **前文**: 上一章的最后 1000 字符
- **节拍**: 场景节拍链 (动作/对话/反转)
- **设定**: 相关世界观设定

### 3. 章节状态追踪

```typescript
writingStatus: 'OUTLINE' | 'DRAFT' | 'REVISION' | 'POLISHED'
```

清晰的写作流程：大纲 → 草稿 → 修订 → 润色完成

### 4. 里程碑系统

- 🌱 新手村毕业 (1,000 字)
- ⚔️ 初露锋芒 (5,000 字)
- 📖 笔耕不辍 (10,000 字)
- 📚 中篇成型 (20,000 字)
- 🏰 长篇巨制 (50,000 字)
- 👑 传世之作 (100,000 字)
- 🔥 封神之路 (200,000 字)

## 开发路线图

详见项目计划文档。

## License

MIT
