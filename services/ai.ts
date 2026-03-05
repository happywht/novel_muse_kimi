/**
 * AI Service - 真正的AI调用实现
 * 基于参考代码的 geminiService.ts
 */

import { Character, WorldSetting, CreativeSettings } from '../types';

// 从环境变量或 localStorage 获取 API Key
const getApiKey = async (): Promise<string> => {
  // 先尝试 localStorage
  const savedKey = localStorage.getItem('muse_gemini_api_key');
  if (savedKey) return savedKey;
  
  // 再尝试环境变量
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

// 获取模型名称
const getModelName = (): string => {
  return import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash-latest';
};

// 格式化上下文
const formatContext = (
  characters: Character[], 
  worldSettings: WorldSetting[],
  creativeSettings?: CreativeSettings
): string => {
  let context = "";
  
  if (creativeSettings) {
    context += `【创作风格】基调: ${creativeSettings.tone}, 风格: ${creativeSettings.style}\n\n`;
  }
  
  if (characters.length > 0) {
    context += "【角色档案】\n";
    characters.forEach(c => {
      context += `- ${c.name} (${c.role}): ${c.description.slice(0, 100)}...\n`;
      if (c.relationships) {
        context += `  关系: ${c.relationships}\n`;
      }
    });
    context += "\n";
  }
  
  if (worldSettings.length > 0) {
    context += "【世界观设定】\n";
    worldSettings.slice(0, 5).forEach(w => {
      context += `- [${w.category}] ${w.title}: ${w.content.slice(0, 80)}...\n`;
    });
    context += "\n";
  }
  
  return context;
};

// 续写选项
export interface ContinueOptions {
  style?: string;
  tone?: string;
  creativity?: number;
  chapterSummary?: string;
  expectedPOV?: string;
}

// 润色选项
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
 * 解析 Gemini 流式响应
 */
async function* parseGeminiStream(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') return;

        try {
          const data = JSON.parse(jsonStr);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 调用 Gemini API 续写 (支持流式)
 */
async function* continueWriting(
  context: string,
  characters: Character[],
  worldSettings: WorldSetting[],
  options?: ContinueOptions
): AsyncGenerator<StreamResponse> {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    yield {
      content: '',
      done: true,
      error: '未配置 API Key，请在设置中配置 Gemini API Key'
    };
    return;
  }
  
  const modelName = getModelName();
  
  const systemPrompt = `你是一位专业的小说写作助手。请根据提供的前文、角色设定和世界观，创作自然流畅的续写内容。

要求：
1. 保持原文的风格和语气
2. 符合角色设定和世界观规则
3. 续写内容要有情节推进
4. 语言流畅，描写生动
5. 直接输出续写内容，不要解释`;

  const fullContext = formatContext(characters, worldSettings);
  
  const userPrompt = `${fullContext}【前文】\n${context}\n\n请续写下文（直接输出续写内容，不要重复前文）：`;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: options?.creativity || 0.7,
            maxOutputTokens: 2000,
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API错误: ${error}`);
    }
    
    let fullText = '';
    for await (const chunk of parseGeminiStream(response)) {
      fullText += chunk;
      yield {
        content: fullText,
        done: false
      };
    }
    
    yield {
      content: fullText,
      done: true
    };
  } catch (error) {
    yield {
      content: '',
      done: true,
      error: error instanceof Error ? error.message : '生成失败'
    };
  }
}

/**
 * 调用 Gemini API 润色 (支持流式)
 */
async function* polish(
  text: string,
  instruction: string,
  characters: Character[],
  worldSettings: WorldSetting[],
  options?: PolishOptions
): AsyncGenerator<StreamResponse> {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    yield {
      content: '',
      done: true,
      error: '未配置 API Key，请在设置中配置 Gemini API Key'
    };
    return;
  }
  
  const modelName = getModelName();
  
  const instructionMap: Record<string, string> = {
    '增加感官细节': '增加视觉、听觉、嗅觉、触觉等感官描写，让读者更有代入感',
    '加快叙事节奏': '精简冗余描述，加快情节推进速度，增加紧张感',
    '深化心理描写': '增加角色内心活动、情感变化和心理冲突的描写',
    '优化对话': '让对话更自然、有个性，符合角色身份和性格'
  };
  
  const systemPrompt = `你是一位专业的小说编辑。请根据以下要求润色文本：

${instructionMap[instruction] || instruction}

要求：
1. 保持原文的核心意思和情节
2. 只修改需要改进的部分
3. 语言流畅自然
4. 直接输出润色后的内容`;

  const fullContext = formatContext(characters, worldSettings);
  
  const userPrompt = `${fullContext}【原文】\n${text}\n\n请润色（直接输出润色后的内容）：`;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: options?.creativity || 0.7,
            maxOutputTokens: 2000,
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API错误: ${error}`);
    }
    
    let fullText = '';
    for await (const chunk of parseGeminiStream(response)) {
      fullText += chunk;
      yield {
        content: fullText,
        done: false
      };
    }
    
    yield {
      content: fullText,
      done: true
    };
  } catch (error) {
    yield {
      content: '',
      done: true,
      error: error instanceof Error ? error.message : '润色失败'
    };
  }
}

// AI 路由对象
export const aiRouter = {
  continueWriting,
  polish,
};

export default aiRouter;
