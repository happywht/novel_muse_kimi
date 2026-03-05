/**
 * AI Services - 统一导出
 * Novel Muse AI服务层入口
 * 
 * @example
 * ```typescript
 * import { aiRouter, promptManager, streamHandler, fallbackStrategy } from './services/ai';
 * 
 * // 使用AI路由执行请求
 * const response = await aiRouter.executeAIRequest({
 *   taskType: 'continuation',
 *   prompt: '请续写下文...',
 * });
 * 
 * // 组装提示词
 * const prompt = promptManager.assemblePrompt('continuation', {
 *   projectTitle: '我的小说',
 *   previousContent: '前文内容...',
 * });
 * ```
 */

// ============================================
// 从 aiRouter 导出
// ============================================

export {
  // 核心函数
  executeAIRequest,
  executeStreamingAIRequest,
  selectModelForTask,
  getModelInfo,
  checkAllModelsAvailability,
  
  // 类型
  type AIModelType,
  type TaskType,
  type AIRequestConfig,
  type AIResponse,
} from './aiRouter';

// ============================================
// 从 promptManager 导出
// ============================================

export {
  // 核心函数
  assemblePrompt,
  getAvailableTemplates,
  getTemplateInfo,
  assembleCustomPrompt,
  validateContext,
  
  // 快捷方法
  createContinuationPrompt,
  createPolishPrompt,
  createEchoExtractionPrompt,
  createCharacterAnalysisPrompt,
  
  // 版本管理
  getTemplateVersion,
  checkTemplateUpdate,
  
  // 类型
  type PromptTemplateType,
  type PromptContext,
  type AssembledPrompt,
} from './promptManager';

// ============================================
// 从 streamHandler 导出
// ============================================

export {
  // 流式处理函数
  handleGeminiStream,
  handleGLMStream,
  handleGenericStream,
  
  // 工具函数
  createThrottledCallback,
  createAccumulatingCallbacks,
  
  // 类
  StreamProcessor,
  
  // 类型
  type StreamCallbacks,
  type StreamResult,
  type StreamConfig,
} from './streamHandler';

// ============================================
// 从 fallbackStrategy 导出
// ============================================

export {
  // 策略实例
  fallbackStrategy,
  
  // 类
  FallbackStrategy,
  
  // 配置
  DEFAULT_FALLBACK_CONFIG,
  DEFAULT_RETRY_CONFIG,
  defaultOfflineGenerator,
  
  // 重试工具
  calculateBackoffDelay,
  executeWithRetry,
  
  // 类型
  type ModelHealthStatus,
  type FallbackConfig,
  type OfflineResponseGenerator,
  type RetryConfig,
} from './fallbackStrategy';

// ============================================
// 便捷聚合对象
// ============================================

import { executeAIRequest, executeStreamingAIRequest, selectModelForTask, type AIRequestConfig } from './aiRouter';
import { 
  assemblePrompt, 
  createContinuationPrompt, 
  createPolishPrompt,
  createEchoExtractionPrompt,
  type PromptContext
} from './promptManager';
import { StreamProcessor } from './streamHandler';
import { fallbackStrategy, executeWithRetry } from './fallbackStrategy';

// 续写选项接口
export interface ContinueWritingOptions {
  style?: string;
  tone?: string;
  creativity?: number;
  chapterSummary?: string;
  expectedPOV?: string;
}

// 润色选项接口
export interface PolishOptions {
  style?: string;
  tone?: string;
  creativity?: number;
}

// 流式响应
export interface StreamResponse {
  content: string;
  done: boolean;
  error?: string;
}

/**
 * 续写生成器
 */
async function* continueWriting(
  context: string,
  options: ContinueWritingOptions = {}
): AsyncGenerator<StreamResponse> {
  const prompt = createContinuationPrompt({
    previousContent: context,
    style: options.style || '通俗易懂 (Standard)',
    tone: options.tone || '平衡 (Balanced)',
  });

  const config: AIRequestConfig = {
    taskType: 'continuation',
    prompt: prompt.userPrompt,
    systemPrompt: prompt.systemPrompt,
    temperature: options.creativity || 0.7,
    maxTokens: 2000,
    enableStreaming: false,
  };

  try {
    const response = await executeAIRequest(config);
    yield {
      content: response.content,
      done: true,
    };
  } catch (error) {
    yield {
      content: '',
      done: true,
      error: error instanceof Error ? error.message : '生成失败',
    };
  }
}

/**
 * 润色生成器
 */
async function* polish(
  text: string,
  instruction: string,
  options: PolishOptions = {}
): AsyncGenerator<StreamResponse> {
  const prompt = createPolishPrompt(text, instruction as any);

  const config: AIRequestConfig = {
    taskType: 'polish',
    prompt: prompt.userPrompt,
    systemPrompt: prompt.systemPrompt,
    temperature: options.creativity || 0.7,
    maxTokens: 2000,
    enableStreaming: false,
  };

  try {
    const response = await executeAIRequest(config);
    yield {
      content: response.content,
      done: true,
    };
  } catch (error) {
    yield {
      content: '',
      done: true,
      error: error instanceof Error ? error.message : '润色失败',
    };
  }
}

/**
 * AI路由快捷对象
 */
export const aiRouter = {
  execute: executeAIRequest,
  executeStream: executeStreamingAIRequest,
  selectModel: selectModelForTask,
  continueWriting,
  polish,
};

/**
 * 提示词管理快捷对象
 */
export const promptManager = {
  assemble: assemblePrompt,
  continuation: createContinuationPrompt,
  polish: createPolishPrompt,
  extractEcho: createEchoExtractionPrompt,
};

/**
 * 流式处理快捷对象
 */
export const streamManager = {
  createProcessor: () => new StreamProcessor(),
};

/**
 * 降级策略快捷对象
 */
export const fallbackManager = {
  strategy: fallbackStrategy,
  withRetry: executeWithRetry,
};

// ============================================
// 默认导出
// ============================================

export default {
  aiRouter,
  promptManager,
  streamManager,
  fallbackManager,
};
