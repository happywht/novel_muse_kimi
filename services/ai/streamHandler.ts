/**
 * Stream Handler - 流式输出处理模块
 * 处理SSE (Server-Sent Events) 和流式文本接收
 */

// ============================================
// 类型定义
// ============================================

/** 流式回调函数 */
export interface StreamCallbacks {
  /** 接收到新内容时调用 */
  onContent: (content: string, delta: string) => void;
  /** 流式完成时调用 */
  onComplete: (fullContent: string) => void;
  /** 发生错误时调用 */
  onError: (error: Error) => void;
  /** 流式开始时调用 */
  onStart?: () => void;
}

/** 流式处理结果 */
export interface StreamResult {
  content: string;
  finishReason: string;
}

/** 流式处理配置 */
export interface StreamConfig {
  /** 是否累积完整内容 */
  accumulateContent: boolean;
  /** 内容回调间隔（毫秒） */
  throttleInterval: number;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_STREAM_CONFIG: StreamConfig = {
  accumulateContent: true,
  throttleInterval: 16, // ~60fps
};

// ============================================
// Gemini 流式处理
// ============================================

/**
 * 处理Gemini API的流式响应
 * @param response - fetch响应对象
 * @param callbacks - 回调函数
 * @param controller - AbortController用于中断
 * @returns 流式处理结果
 */
export async function handleGeminiStream(
  response: Response,
  callbacks: StreamCallbacks,
  controller?: AbortController
): Promise<StreamResult> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  let isCancelled = false;

  // 通知开始
  callbacks.onStart?.();

  try {
    while (!isCancelled) {
      const { done, value } = await reader.read();
      
      if (done) break;

      // 检查是否已取消
      if (controller?.signal.aborted) {
        isCancelled = true;
        break;
      }

      // 解码并处理数据
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 处理缓冲区中的完整行
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的最后一行

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        try {
          // Gemini流式格式：每行是一个JSON对象
          const json = JSON.parse(trimmedLine);
          
          // 提取内容
          const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (content) {
            fullContent += content;
            callbacks.onContent(fullContent, content);
          }

          // 检查是否完成
          const finishReason = json.candidates?.[0]?.finishReason;
          if (finishReason && finishReason !== 'STOP') {
            console.warn(`[StreamHandler] Gemini finish reason: ${finishReason}`);
          }
        } catch (e) {
          // 忽略解析错误的行，可能是保持连接的空行
          if (trimmedLine.startsWith('[') || trimmedLine.startsWith('{')) {
            console.warn('[StreamHandler] Failed to parse JSON:', trimmedLine);
          }
        }
      }
    }

    // 处理缓冲区剩余内容
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer.trim());
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (content) {
          fullContent += content;
          callbacks.onContent(fullContent, content);
        }
      } catch (e) {
        // 忽略
      }
    }

    // 完成回调
    if (!isCancelled) {
      callbacks.onComplete(fullContent);
    }

    return {
      content: fullContent,
      finishReason: isCancelled ? 'CANCELLED' : 'STOP',
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError(err);
    throw err;
  } finally {
    reader.releaseLock();
  }
}

// ============================================
// GLM 流式处理
// ============================================

/**
 * 处理GLM API的流式响应（SSE格式）
 * @param response - fetch响应对象
 * @param callbacks - 回调函数
 * @param controller - AbortController用于中断
 * @returns 流式处理结果
 */
export async function handleGLMStream(
  response: Response,
  callbacks: StreamCallbacks,
  controller?: AbortController
): Promise<StreamResult> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  let isCancelled = false;

  // 通知开始
  callbacks.onStart?.();

  try {
    while (!isCancelled) {
      const { done, value } = await reader.read();
      
      if (done) break;

      // 检查是否已取消
      if (controller?.signal.aborted) {
        isCancelled = true;
        break;
      }

      // 解码并处理数据
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 处理SSE格式：data: {...}\n\n
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // 保留不完整的最后部分

      for (const event of events) {
        const lines = event.split('\n');
        let dataLine = '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataLine = line.slice(5).trim();
            break;
          }
        }

        if (!dataLine) continue;

        // 检查结束标记
        if (dataLine === '[DONE]') {
          if (!isCancelled) {
            callbacks.onComplete(fullContent);
          }
          return {
            content: fullContent,
            finishReason: 'STOP',
          };
        }

        try {
          const json = JSON.parse(dataLine);
          
          // GLM格式：delta.text
          let content = '';
          
          if (json.delta?.text) {
            content = json.delta.text;
          } else if (json.choices?.[0]?.delta?.content) {
            content = json.choices[0].delta.content;
          } else if (json.content?.[0]?.text) {
            content = json.content[0].text;
          }

          if (content) {
            fullContent += content;
            callbacks.onContent(fullContent, content);
          }

          // 检查停止原因
          const stopReason = json.stop_reason || json.choices?.[0]?.finish_reason;
          if (stopReason && stopReason !== 'null' && stopReason !== null) {
            console.log(`[StreamHandler] GLM stop reason: ${stopReason}`);
          }
        } catch (e) {
          console.warn('[StreamHandler] Failed to parse SSE data:', dataLine);
        }
      }
    }

    // 完成回调（如果没有收到[DONE]）
    if (!isCancelled) {
      callbacks.onComplete(fullContent);
    }

    return {
      content: fullContent,
      finishReason: isCancelled ? 'CANCELLED' : 'STOP',
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError(err);
    throw err;
  } finally {
    reader.releaseLock();
  }
}

// ============================================
// 通用SSE处理
// ============================================

/**
 * 通用SSE流处理器
 * @param response - fetch响应对象
 * @param callbacks - 回调函数
 * @param extractContent - 从JSON中提取内容的函数
 * @param controller - AbortController
 * @returns 流式处理结果
 */
export async function handleGenericStream<T>(
  response: Response,
  callbacks: StreamCallbacks,
  extractContent: (data: T) => { content: string; finishReason?: string } | null,
  controller?: AbortController
): Promise<StreamResult> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';
  let isCancelled = false;

  callbacks.onStart?.();

  try {
    while (!isCancelled) {
      const { done, value } = await reader.read();
      
      if (done) break;
      if (controller?.signal.aborted) {
        isCancelled = true;
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // SSE格式处理
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const lines = event.split('\n');
        let dataLine = '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataLine = line.slice(5).trim();
            break;
          }
        }

        if (!dataLine || dataLine === '[DONE]') continue;

        try {
          const json = JSON.parse(dataLine) as T;
          const result = extractContent(json);
          
          if (result?.content) {
            fullContent += result.content;
            callbacks.onContent(fullContent, result.content);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    if (!isCancelled) {
      callbacks.onComplete(fullContent);
    }

    return {
      content: fullContent,
      finishReason: isCancelled ? 'CANCELLED' : 'STOP',
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError(err);
    throw err;
  } finally {
    reader.releaseLock();
  }
}

// ============================================
// 流式控制类
// ============================================

/**
 * 流式处理器类 - 提供更精细的控制
 */
export class StreamProcessor {
  private abortController: AbortController;
  private isRunning: boolean = false;
  private accumulatedContent: string = '';
  private config: StreamConfig;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
    this.abortController = new AbortController();
  }

  /**
   * 开始流式处理
   * @param response - fetch响应
   * @param callbacks - 回调函数
   */
  async start(
    response: Response,
    callbacks: StreamCallbacks,
    streamType: 'gemini' | 'glm' | 'generic' = 'generic',
    extractContent?: (data: any) => { content: string; finishReason?: string } | null
  ): Promise<StreamResult> {
    if (this.isRunning) {
      throw new Error('Stream is already running');
    }

    this.isRunning = true;
    this.accumulatedContent = '';

    const wrappedCallbacks: StreamCallbacks = {
      onStart: () => {
        callbacks.onStart?.();
      },
      onContent: (content: string, delta: string) => {
        this.accumulatedContent = content;
        callbacks.onContent(content, delta);
      },
      onComplete: (content: string) => {
        this.isRunning = false;
        callbacks.onComplete(content);
      },
      onError: (error: Error) => {
        this.isRunning = false;
        callbacks.onError(error);
      },
    };

    try {
      switch (streamType) {
        case 'gemini':
          return await handleGeminiStream(response, wrappedCallbacks, this.abortController);
        case 'glm':
          return await handleGLMStream(response, wrappedCallbacks, this.abortController);
        case 'generic':
        default:
          if (!extractContent) {
            throw new Error('Generic stream requires extractContent function');
          }
          return await handleGenericStream(
            response,
            wrappedCallbacks,
            extractContent,
            this.abortController
          );
      }
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 中断流式处理
   */
  abort(): void {
    if (this.isRunning) {
      this.abortController.abort();
      this.isRunning = false;
    }
  }

  /**
   * 获取当前累积的内容
   */
  getAccumulatedContent(): string {
    return this.accumulatedContent;
  }

  /**
   * 检查是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 重置处理器
   */
  reset(): void {
    this.abort();
    this.abortController = new AbortController();
    this.accumulatedContent = '';
  }
}

// ============================================
// 工具函数
// ============================================

/**
 * 创建节流的内容回调
 * @param callback - 原始回调
 * @param interval - 节流间隔（毫秒）
 * @returns 节流的回调
 */
export function createThrottledCallback(
  callback: (content: string, delta: string) => void,
  interval: number = 50
): (content: string, delta: string) => void {
  let lastCall = 0;
  let pendingContent = '';
  let pendingDelta = '';
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (content: string, delta: string) => {
    pendingContent = content;
    pendingDelta += delta;

    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= interval) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      callback(pendingContent, pendingDelta);
      pendingDelta = '';
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        callback(pendingContent, pendingDelta);
        pendingDelta = '';
        timeoutId = null;
      }, interval - timeSinceLastCall);
    }
  };
}

/**
 * 创建累积内容的回调
 * @param onUpdate - 更新回调
 * @returns 回调函数对象
 */
export function createAccumulatingCallbacks(
  onUpdate: (content: string, isComplete: boolean, error?: Error) => void
): StreamCallbacks {
  return {
    onContent: (content: string) => {
      onUpdate(content, false);
    },
    onComplete: (content: string) => {
      onUpdate(content, true);
    },
    onError: (error: Error) => {
      onUpdate('', false, error);
    },
  };
}

// ============================================
// 导出对象
// ============================================

export const streamHandler = {
  handleGeminiStream,
  handleGLMStream,
  handleGenericStream,
  createThrottledCallback,
  createAccumulatingCallbacks,
  StreamProcessor,
};

export default streamHandler;
