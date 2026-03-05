/**
 * Fallback Strategy - 降级策略模块
 * 处理模型失败时的备用方案和离线模式
 */

import { AIModelType, TaskType, AIResponse } from './aiRouter';

// ============================================
// 类型定义
// ============================================

/** 模型健康状态 */
export interface ModelHealthStatus {
  model: AIModelType;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  averageLatency: number;
  failureRate: number;
}

/** 降级策略配置 */
export interface FallbackConfig {
  /** 最大连续失败次数 */
  maxConsecutiveFailures: number;
  /** 失败后冷却时间（毫秒） */
  cooldownPeriod: number;
  /** 是否启用离线模式 */
  enableOfflineMode: boolean;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
}

/** 离线模式响应生成器 */
export type OfflineResponseGenerator = (taskType: TaskType, originalError?: Error | null) => string;

// ============================================
// 默认配置
// ============================================

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  maxConsecutiveFailures: 3,
  cooldownPeriod: 60000, // 1分钟
  enableOfflineMode: true,
  healthCheckInterval: 30000, // 30秒
};

// ============================================
// 模型健康监控
// ============================================

class ModelHealthMonitor {
  private status: Map<AIModelType, ModelHealthStatus> = new Map();
  private config: FallbackConfig;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
    this.initializeStatus();
  }

  private initializeStatus(): void {
    const models: AIModelType[] = ['gemini-pro', 'gemini-flash', 'glm-5'];
    models.forEach(model => {
      this.status.set(model, {
        model,
        isHealthy: true,
        consecutiveFailures: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        averageLatency: 0,
        failureRate: 0,
      });
    });
  }

  /**
   * 记录模型调用成功
   * @param model - 模型类型
   * @param latency - 响应延迟（毫秒）
   */
  recordSuccess(model: AIModelType, latency: number): void {
    const current = this.status.get(model);
    if (!current) return;

    const newAverageLatency = current.averageLatency === 0 
      ? latency 
      : (current.averageLatency * 0.8 + latency * 0.2);

    this.status.set(model, {
      ...current,
      isHealthy: true,
      consecutiveFailures: 0,
      lastSuccessTime: Date.now(),
      averageLatency: newAverageLatency,
      failureRate: Math.max(0, current.failureRate - 0.1),
    });
  }

  /**
   * 记录模型调用失败
   * @param model - 模型类型
   * @param error - 错误对象
   */
  recordFailure(model: AIModelType, error: Error): void {
    const current = this.status.get(model);
    if (!current) return;

    const newConsecutiveFailures = current.consecutiveFailures + 1;
    const newFailureRate = Math.min(1, (current.failureRate * 9 + 1) / 10);
    
    // 判断是否应该标记为不健康
    const shouldMarkUnhealthy = newConsecutiveFailures >= this.config.maxConsecutiveFailures;

    this.status.set(model, {
      ...current,
      isHealthy: !shouldMarkUnhealthy,
      consecutiveFailures: newConsecutiveFailures,
      lastFailureTime: Date.now(),
      failureRate: newFailureRate,
    });

    console.warn(`[FallbackStrategy] ${model} 失败次数: ${newConsecutiveFailures}, 失败率: ${(newFailureRate * 100).toFixed(1)}%`);
  }

  /**
   * 检查模型是否可用
   * @param model - 模型类型
   * @returns 是否可用
   */
  isModelAvailable(model: AIModelType): boolean {
    const current = this.status.get(model);
    if (!current) return false;

    // 如果不健康，检查冷却时间是否已过
    if (!current.isHealthy && current.lastFailureTime) {
      const timeSinceFailure = Date.now() - current.lastFailureTime;
      if (timeSinceFailure >= this.config.cooldownPeriod) {
        // 重置为健康状态，允许重试
        this.status.set(model, {
          ...current,
          isHealthy: true,
          consecutiveFailures: 0,
        });
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * 获取所有模型的健康状态
   * @returns 健康状态列表
   */
  getAllStatus(): ModelHealthStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * 获取特定模型的健康状态
   * @param model - 模型类型
   * @returns 健康状态
   */
  getModelStatus(model: AIModelType): ModelHealthStatus | undefined {
    return this.status.get(model);
  }

  /**
   * 获取健康模型列表（按优先级排序）
   * @returns 健康模型列表
   */
  getHealthyModels(): AIModelType[] {
    const healthy: AIModelType[] = [];
    const unhealthy: AIModelType[] = [];

    this.status.forEach((status, model) => {
      if (this.isModelAvailable(model)) {
        healthy.push(model);
      } else {
        unhealthy.push(model);
      }
    });

    // 按延迟排序，优先使用响应快的模型
    return healthy.sort((a, b) => {
      const statusA = this.status.get(a)!;
      const statusB = this.status.get(b)!;
      return statusA.averageLatency - statusB.averageLatency;
    });
  }

  /**
   * 重置特定模型的状态
   * @param model - 模型类型
   */
  resetModelStatus(model: AIModelType): void {
    const current = this.status.get(model);
    if (current) {
      this.status.set(model, {
        ...current,
        isHealthy: true,
        consecutiveFailures: 0,
        lastFailureTime: null,
        failureRate: 0,
      });
    }
  }

  /**
   * 重置所有模型状态
   */
  resetAllStatus(): void {
    this.initializeStatus();
  }
}

// ============================================
// 离线响应生成器
// ============================================

/**
 * 默认的离线响应生成器
 * @param taskType - 任务类型
 * @param originalError - 原始错误
 * @returns 离线模式响应文本
 */
const defaultOfflineGenerator: OfflineResponseGenerator = (taskType, originalError) => {
  const offlineResponses: Record<TaskType, string> = {
    'continuation': `【离线模式 - 续写功能暂不可用】

抱歉，AI续写服务当前不可用。${originalError ? `错误原因：${originalError.message}` : ''}

建议：
1. 检查网络连接是否正常
2. 稍后重试（模型可能在维护中）
3. 尝试手动续写或使用本地草稿

您可以继续编辑现有内容，待服务恢复后再次尝试。`,

    'polish': `【离线模式 - 润色功能暂不可用】

抱歉，AI润色服务当前不可用。

临时建议：
1. 大声朗读文本，检查不通顺的地方
2. 检查是否有重复用词
3. 简化过于复杂的句子
4. 稍后重试自动润色功能`,

    'analysis': `【离线模式 - 分析功能暂不可用】

抱歉，AI分析服务当前不可用。

您可以尝试：
1. 自行检查角色设定的一致性
2. 回顾大纲确保情节走向正确
3. 阅读前文检查伏笔是否回收
4. 稍后重试自动分析功能`,

    'echo-extraction': `【离线模式 - Echo提取功能暂不可用】

抱歉，AI Echo提取服务当前不可用。

建议手动标记：
1. 阅读文本时记录印象深刻的片段
2. 注意独特的设定和对话
3. 标记可能有后续发展的情节线索
4. 稍后使用自动提取功能`,

    'brainstorm': `【离线模式 - 头脑风暴功能暂不可用】

抱歉，AI创意生成功能当前不可用。

自助头脑风暴方法：
1. 列出3个最不寻常的发展方向
2. 思考"如果...会怎样"的情景
3. 参考类似作品的经典桥段
4. 与其他作者交流想法
5. 稍后重试AI头脑风暴`,

    'summary': `【离线模式 - 总结功能暂不可用】

抱歉，AI总结服务当前不可用。

您可以：
1. 手动记录章节要点
2. 用一句话概括核心事件
3. 列出出现的关键角色和变化
4. 稍后重试自动总结功能`,

    'translation': `【离线模式 - 翻译功能暂不可用】

抱歉，AI翻译服务当前不可用。

建议：
1. 使用其他翻译工具作为临时替代
2. 注意保持专业术语的一致性
3. 翻译后人工审校确保流畅
4. 稍后重试AI翻译功能`,
  };

  return offlineResponses[taskType] || `【离线模式】

AI服务当前不可用。${originalError ? `错误信息：${originalError.message}` : ''}

请检查网络连接或稍后重试。`;
};

// ============================================
// 降级策略主类
// ============================================

class FallbackStrategy {
  private healthMonitor: ModelHealthMonitor;
  private config: FallbackConfig;
  private offlineGenerator: OfflineResponseGenerator;

  constructor(
    config: Partial<FallbackConfig> = {},
    offlineGenerator?: OfflineResponseGenerator
  ) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
    this.healthMonitor = new ModelHealthMonitor(this.config);
    this.offlineGenerator = offlineGenerator || defaultOfflineGenerator;
  }

  /**
   * 记录模型成功
   */
  recordSuccess(model: AIModelType, latency: number): void {
    this.healthMonitor.recordSuccess(model, latency);
  }

  /**
   * 记录模型失败
   */
  recordFailure(model: AIModelType, error: Error): void {
    this.healthMonitor.recordFailure(model, error);
  }

  /**
   * 检查是否应该使用备用模型
   * @param primaryModel - 主模型
   * @returns 是否建议使用备用
   */
  shouldUseFallback(primaryModel: AIModelType): boolean {
    return !this.healthMonitor.isModelAvailable(primaryModel);
  }

  /**
   * 获取备用模型列表
   * @param excludeModel - 要排除的模型
   * @returns 备用模型列表
   */
  getFallbackModels(excludeModel?: AIModelType): AIModelType[] {
    const healthy = this.healthMonitor.getHealthyModels();
    return excludeModel 
      ? healthy.filter(m => m !== excludeModel)
      : healthy;
  }

  /**
   * 获取最佳可用模型
   * @param preferredModels - 优先考虑的模型列表
   * @returns 最佳模型或null
   */
  getBestAvailableModel(preferredModels?: AIModelType[]): AIModelType | null {
    const healthy = this.healthMonitor.getHealthyModels();
    
    if (preferredModels) {
      for (const model of preferredModels) {
        if (healthy.includes(model)) {
          return model;
        }
      }
    }
    
    return healthy[0] || null;
  }

  /**
   * 获取离线模式响应
   * @param taskType - 任务类型
   * @param originalError - 原始错误
   * @returns AI响应对象
   */
  getOfflineResponse(taskType: TaskType, originalError?: Error | null): AIResponse {
    const content = this.offlineGenerator(taskType, originalError);
    
    return {
      content,
      model: 'gemini-flash', // 使用一个默认模型标识
      finishReason: 'OFFLINE_MODE',
      latency: 0,
    };
  }

  /**
   * 检查是否处于完全离线状态（所有模型都不可用）
   * @returns 是否完全离线
   */
  isCompletelyOffline(): boolean {
    const healthy = this.healthMonitor.getHealthyModels();
    return healthy.length === 0;
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): ModelHealthStatus[] {
    return this.healthMonitor.getAllStatus();
  }

  /**
   * 重置特定模型
   */
  resetModel(model: AIModelType): void {
    this.healthMonitor.resetModelStatus(model);
  }

  /**
   * 重置所有模型
   */
  resetAll(): void {
    this.healthMonitor.resetAllStatus();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 设置自定义离线响应生成器
   */
  setOfflineGenerator(generator: OfflineResponseGenerator): void {
    this.offlineGenerator = generator;
  }
}

// ============================================
// 重试策略
// ============================================

/**
 * 指数退避重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
};

/**
 * 计算退避延迟
 * @param attempt - 当前尝试次数
 * @param config - 重试配置
 * @returns 延迟时间（毫秒）
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Partial<RetryConfig> = {}
): number {
  const { baseDelay, maxDelay, exponentialBase } = { ...DEFAULT_RETRY_CONFIG, ...config };
  const delay = baseDelay * Math.pow(exponentialBase, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * 执行带重试的异步函数
 * @param fn - 要执行的函数
 * @param shouldRetry - 判断是否重试的函数
 * @param config - 重试配置
 * @returns 执行结果
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  shouldRetry?: (error: Error, attempt: number) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries } = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 判断是否应该重试
      if (attempt < maxRetries) {
        const shouldRetryResult = shouldRetry 
          ? shouldRetry(lastError, attempt)
          : isRetryableError(lastError);
        
        if (!shouldRetryResult) {
          throw lastError;
        }

        // 等待后重试
        const delay = calculateBackoffDelay(attempt, config);
        console.log(`[FallbackStrategy] 等待 ${delay}ms 后重试 (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * 判断错误是否可重试
 * @param error - 错误对象
 * @returns 是否可重试
 */
function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'timeout',
    'network',
    'econnreset',
    'etimedout',
    'econnrefused',
    '503',
    '502',
    '504',
    '429',
    'rate limit',
    'too many requests',
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some(e => errorMessage.includes(e));
}

// ============================================
// 导出
// ============================================

export const fallbackStrategy = new FallbackStrategy();

export { FallbackStrategy, DEFAULT_FALLBACK_CONFIG, DEFAULT_RETRY_CONFIG, defaultOfflineGenerator };

export default fallbackStrategy;
