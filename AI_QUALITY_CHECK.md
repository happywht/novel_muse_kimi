# AI 深度质量检查使用说明

## 功能概述

质量检查系统现已增强，支持基于 LLM 的 AI 深度分析功能。AI 将从以下维度分析章节质量：

1. **一致性检查** - 角色行为、时间线逻辑、地点转换
2. **叙事质量** - 节奏分析、情节推进、悬念设置
3. **写作技巧** - 视角一致性、展示vs讲述、情感渲染
4. **语言质量** - 对话自然度、描写生动性、重复冗余

## 配置方法

### 1. 环境变量配置

在项目根目录的 `.env.local` 文件中添加：

```bash
# AI 服务提供商：openai | gemini | mock
VITE_AI_PROVIDER=openai

# API 密钥
VITE_AI_API_KEY=your-api-key-here

# 模型名称（可选，默认 gpt-4o-mini）
VITE_AI_MODEL=gpt-4o-mini

# 自定义 API 基础地址（可选）
VITE_AI_BASE_URL=https://api.openai.com/v1
```

### 2. Mock 模式

如需离线测试，将 `VITE_AI_PROVIDER` 设置为 `mock`，将返回模拟数据。

## 使用方式

### 在 QualityPanel 中使用

```tsx
import { QualityPanel } from './components/QualityPanel';

// 组件已内置 AI 深度检查开关
<QualityPanel
  project={project}
  currentChapter={currentChapter}
  isOpen={isQualityPanelOpen}
  onClose={() => setIsQualityPanelOpen(false)}
/>
```

### 程序化使用

```tsx
import { qualityService } from './services/qualityService';

// 完整质量报告（含 AI 分析）
const report = await qualityService.generateReport(chapter, project, {
  useAI: true,        // 启用 AI 分析
  skipCache: false,   // 使用缓存（5分钟内不重复分析同一章节）
  timeout: 60000      // 60秒超时
});

// 仅基础检查
const basicReport = await qualityService.generateReport(chapter, project, {
  useAI: false
});

// 仅 AI 分析
const aiResult = await qualityService.runAIAnalysis(chapter, project);
```

## API 说明

### QualityCheckOptions

```typescript
interface QualityCheckOptions {
  useAI?: boolean;      // 是否使用 AI 深度分析（默认 true）
  skipCache?: boolean;  // 是否跳过缓存（默认 false）
  timeout?: number;     // 超时时间（毫秒）
  signal?: AbortSignal; // 用于取消请求
}
```

### EnhancedQualityReport

```typescript
interface EnhancedQualityReport extends QualityReport {
  aiAnalysis?: {
    strengths: string[];      // AI 识别的优点
    weaknesses: string[];     // AI 识别的不足
    aiProcessed: boolean;     // 是否成功完成 AI 分析
  };
  basicIssues: QualityIssue[];  // 基础检查问题
  aiIssues: QualityIssue[];     // AI 深度分析问题
}
```

## 功能特点

### 1. 智能缓存
- 同一章节 5 分钟内不重复分析
- 缓存自动失效当章节内容变更

### 2. 取消/超时处理
- 支持 AbortController 取消正在进行的分析
- 默认 60 秒超时，可自定义

### 3. 错误降级
- AI 分析失败时自动回退到基础检查
- UI 显示错误信息并提供重试按钮

### 4. UI 增强
- AI 深度检查开关
- 实时加载状态显示
- AI 问题独立分类显示
- AI 分析摘要（优点/不足）

## 文件变更

### 新增文件
- `services/ai/aiService.ts` - AI 调用服务
- `AI_QUALITY_CHECK.md` - 本文档

### 修改文件
- `services/qualityService.ts` - 添加 AI 深度分析功能
- `components/QualityPanel.tsx` - 添加深度检查开关和 AI 结果展示
- `services/ai/types.ts` - 添加 AI 质量分析类型定义

## 注意事项

1. AI 分析需要网络连接和有效的 API 密钥
2. 长章节可能会被截断至 8000 字符以控制 API 成本
3. AI 分析结果仅供参考，建议结合作者自身判断
4. 建议将 `.env.local` 添加到 `.gitignore` 以保护 API 密钥
