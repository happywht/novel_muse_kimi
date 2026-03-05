/**
 * AI Router - AI模型路由管理
 * 负责根据任务类型选择最优模型，管理模型调用和错误处理
 */

import { streamHandler, StreamCallbacks } from './streamHandler';
import { fallbackStrategy } from './fallbackStrategy';

// ============================================
// 类型定义
// ============================================

/** 支持的AI模型类型 */
export type AIModelType = 'gemini-pro' | 'gemini-flash' | 'glm-5';

/** 任务类型枚举 */
export type TaskType = 
  | 'continuation'      // 续写
  | 'polish'            // 润色
  | 'analysis'          // 分析
  | 'echo-extraction'   // Echo提取
  | 'brainstorm'        // 头脑风暴
  | 'summary'           // 总结
  | 'translation';      // 翻译

/** 模型配置接口 */
interface ModelConfig {
  name: AIModelType;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  supportsStreaming: boolean;
}

/** AI请求配置 */
export interface AIRequestConfig {
  taskType: TaskType;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableStreaming?: boolean;
  callbacks?: StreamCallbacks;
  context?: string[];
}

/** AI响应接口 */
export interface AIResponse {
  content: string;
  model: AIModelType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  latency: number;
}

/** 路由决策结果 */
interface RoutingDecision {
  primaryModel: AIModelType;
  fallbackModels: AIModelType[];
  reason: string;
}

// ============================================
// 模型配置
// ============================================

/** 从环境变量读取模型配置 */
const getModelConfigs = (): Record<AIModelType, ModelConfig> => ({
  'gemini-pro': {
    name: 'gemini-pro',
    displayName: 'Gemini 3 Pro',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    maxTokens: 8192,
    temperature: 0.7,
    timeout: 60000,
    supportsStreaming: true,
  },
  'gemini-flash': {
    name: 'gemini-flash',
    displayName: 'Gemini 3 Flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    maxTokens: 8192,
    temperature: 0.7,
    timeout: 30000,
    supportsStreaming: true,
  },
  'glm-5': {
    name: 'glm-5',
    displayName: 'GLM-5',
    baseUrl: import.meta.env.VITE_GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic',
    apiKey: import.meta.env.VITE_GLM_API_KEY || '',
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 45000,
    supportsStreaming: true,
  },
});

/** 任务类型到模型的映射策略 */
const TASK_MODEL_MAPPING: Record<TaskType, RoutingDecision> = {
  'continuation': {
    primaryModel: 'gemini-pro',
    fallbackModels: ['glm-5', 'gemini-flash'],
    reason: '续写需要高质量创意输出，优先使用Gemini Pro',
  },
  'polish': {
    primaryModel: 'gemini-flash',
    fallbackModels: ['glm-5', 'gemini-pro'],
    reason: '润色任务需要快速响应，使用Gemini Flash',
  },
  'analysis': {
    primaryModel: 'gemini-pro',
    fallbackModels: ['glm-5'],
    reason: '分析任务需要深度推理能力，使用Gemini Pro',
  },
  'echo-extraction': {
    primaryModel: 'glm-5',
    fallbackModels: ['gemini-pro', 'gemini-flash'],
    reason: 'Echo提取使用GLM-5中文理解优势',
  },
  'brainstorm': {
    primaryModel: 'gemini-flash',
    fallbackModels: ['glm-5', 'gemini-pro'],
    reason: '头脑风暴需要快速生成多个点子，使用Gemini Flash',
  },
  'summary': {
    primaryModel: 'gemini-flash',
    fallbackModels: ['glm-5', 'gemini-pro'],
    reason: '总结任务需要快速处理长文本，使用Gemini Flash',
  },
  'translation': {
    primaryModel: 'glm-5',
    fallbackModels: ['gemini-pro'],
    reason: '翻译任务使用GLM-5中文优势',
  },
};

// ============================================
// 路由决策
// ============================================

/**
 * 根据任务类型选择最佳模型
 * @param taskType - 任务类型
 * @returns 路由决策结果
 */
export function selectModelForTask(taskType: TaskType): RoutingDecision {
  return TASK_MODEL_MAPPING[taskType] || {
    primaryModel: 'gemini-flash',
    fallbackModels: ['glm-5', 'gemini-pro'],
    reason: '默认使用Gemini Flash',
  };
}

/**
 * 检查模型配置是否有效
 * @param model - 模型类型
 * @returns 是否有效
 */
function isModelAvailable(model: AIModelType): boolean {
  const configs = getModelConfigs();
  const config = configs[model];
  return !!config.apiKey && config.apiKey.length > 10;
}

// ============================================
// API调用实现
// ============================================

/**
 * 构建Gemini API请求
 */
async function callGeminiAPI(
  model: 'gemini-pro' | 'gemini-flash',
  config: AIRequestConfig,
  onRetry?: (attempt: number) => void
): Promise<AIResponse> {
  const configs = getModelConfigs();
  const modelConfig = configs[model];
  const modelName = model === 'gemini-pro' 
    ? (import.meta.env.VITE_GEMINI_PRO_MODEL || 'gemini-1.5-pro-latest')
    : (import.meta.env.VITE_GEMINI_FLASH_MODEL || 'gemini-1.5-flash-latest');
  
  const url = `${modelConfig.baseUrl}/${modelName}:generateContent?key=${modelConfig.apiKey}`;
  
  const requestBody = {
    contents: [
      ...(config.systemPrompt ? [{
        role: 'user',
        parts: [{ text: config.systemPrompt }],
      }] : []),
      {
        role: 'user',
        parts: [{ text: config.prompt }],
      },
    ],
    generationConfig: {
      temperature: config.temperature ?? modelConfig.temperature,
      maxOutputTokens: config.maxTokens ?? modelConfig.maxTokens,
    },
  };

  const startTime = Date.now();
  
  try {
    // 如果启用流式输出
    if (config.enableStreaming && config.callbacks) {
      const streamUrl = url.replace(':generateContent', ':streamGenerateContent');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout);
      
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await streamHandler.handleGeminiStream(
        response,
        config.callbacks,
        controller
      );
      
      return {
        content: result.content,
        model,
        finishReason: result.finishReason,
        latency: Date.now() - startTime,
      };
    }
    
    // 非流式调用
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
      finishReason: data.candidates?.[0]?.finishReason || 'STOP',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 构建GLM API请求
 */
async function callGLMAPI(
  config: AIRequestConfig,
  onRetry?: (attempt: number) => void
): Promise<AIResponse> {
  const configs = getModelConfigs();
  const modelConfig = configs['glm-5'];
  const modelName = import.meta.env.VITE_GLM_MODEL_NAME || 'glm-5';
  
  const url = `${modelConfig.baseUrl}/v1/messages`;
  
  const messages = [
    ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
    ...(config.context?.map((ctx, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: ctx,
    })) || []),
    { role: 'user', content: config.prompt },
  ];
  
  const requestBody = {
    model: modelName,
    messages,
    max_tokens: config.maxTokens ?? modelConfig.maxTokens,
    temperature: config.temperature ?? modelConfig.temperature,
    stream: config.enableStreaming ?? false,
  };

  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`,
        'x-api-key': modelConfig.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`GLM API Error: ${response.status} ${response.statusText}`);
    }
    
    // 流式处理
    if (config.enableStreaming && config.callbacks) {
      const result = await streamHandler.handleGLMStream(
        response,
        config.callbacks,
        controller
      );
      
      return {
        content: result.content,
        model: 'glm-5',
        finishReason: result.finishReason,
        latency: Date.now() - startTime,
      };
    }
    
    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || data.choices?.[0]?.message?.content || '',
      model: 'glm-5',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      finishReason: data.stop_reason || 'stop',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================
// 带重试的API调用
// ============================================

/**
 * 执行带重试机制的API调用
 * @param model - 目标模型
 * @param config - 请求配置
 * @param maxRetries - 最大重试次数
 * @returns AI响应
 */
async function callWithRetry(
  model: AIModelType,
  config: AIRequestConfig,
  maxRetries: number = 2
): Promise<AIResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[AI Router] 重试调用 ${model}, 第 ${attempt} 次`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      if (model === 'gemini-pro' || model === 'gemini-flash') {
        return await callGeminiAPI(model, config);
      } else if (model === 'glm-5') {
        return await callGLMAPI(config);
      }
      
      throw new Error(`不支持的模型类型: ${model}`);
    } catch (error) {
      lastError = error as Error;
      console.warn(`[AI Router] ${model} 调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, lastError.message);
      
      // 特定错误不重试
      if (error instanceof Error) {
        const nonRetryableErrors = ['401', '403', 'invalid_api_key', 'content_filter'];
        if (nonRetryableErrors.some(e => error.message.toLowerCase().includes(e))) {
          throw error;
        }
      }
    }
  }
  
  throw lastError || new Error(`调用 ${model} 失败，已用尽重试次数`);
}

// ============================================
// 主路由函数
// ============================================

/**
 * 执行AI请求，自动选择模型并处理降级
 * @param config - AI请求配置
 * @returns AI响应
 */
export async function executeAIRequest(config: AIRequestConfig): Promise<AIResponse> {
  const routing = selectModelForTask(config.taskType);
  const availableModels = [routing.primaryModel, ...routing.fallbackModels]
    .filter(isModelAvailable);
  
  if (availableModels.length === 0) {
    throw new Error('没有可用的AI模型，请检查API密钥配置');
  }
  
  console.log(`[AI Router] 任务类型: ${config.taskType}, 选择模型: ${availableModels.join(' -> ')}`);
  
  let lastError: Error | null = null;
  
  for (const model of availableModels) {
    try {
      const response = await callWithRetry(model, config);
      console.log(`[AI Router] 成功使用 ${model} 完成请求，耗时 ${response.latency}ms`);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[AI Router] ${model} 失败，尝试下一个模型`);
      
      // 记录失败到降级策略
      fallbackStrategy.recordFailure(model, error as Error);
    }
  }
  
  // 所有模型都失败，返回降级响应
  return fallbackStrategy.getOfflineResponse(config.taskType, lastError);
}

/**
 * 获取指定模型的配置信息
 * @param model - 模型类型
 * @returns 模型配置
 */
export function getModelInfo(model: AIModelType): Omit<ModelConfig, 'apiKey'> {
  const configs = getModelConfigs();
  const config = configs[model];
  const { apiKey, ...publicConfig } = config;
  return publicConfig;
}

/**
 * 检查所有模型可用状态
 * @returns 可用状态映射
 */
export function checkAllModelsAvailability(): Record<AIModelType, boolean> {
  return {
    'gemini-pro': isModelAvailable('gemini-pro'),
    'gemini-flash': isModelAvailable('gemini-flash'),
    'glm-5': isModelAvailable('glm-5'),
  };
}

// ============================================
// 流式请求专用函数
// ============================================

/**
 * 执行流式AI请求
 * @param config - AI请求配置（必须包含callbacks）
 * @returns 可中断的控制器
 */
export function executeStreamingAIRequest(
  config: AIRequestConfig
): { abort: () => void; promise: Promise<AIResponse> } {
  if (!config.callbacks) {
    throw new Error('流式请求必须提供callbacks');
  }
  
  const controller = new AbortController();
  
  const promise = executeAIRequest({
    ...config,
    enableStreaming: true,
  });
  
  return {
    abort: () => controller.abort(),
    promise,
  };
}
