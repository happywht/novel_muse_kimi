/**
 * Prompt Manager - 提示词管理系统
 * 管理提示词模板、版本控制、上下文组装
 */

import { Character, WorldSetting, PlotNode, Echo } from '../../types';

// ============================================
// 类型定义
// ============================================

/** 提示词模板类型 */
export type PromptTemplateType = 
  | 'continuation'      // 续写
  | 'polish-style'      // 风格润色
  | 'polish-grammar'    // 语法润色
  | 'analysis-character' // 角色分析
  | 'analysis-plot'     // 情节分析
  | 'echo-extract'      // Echo提取
  | 'brainstorm-plot'   // 情节头脑风暴
  | 'brainstorm-character' // 角色头脑风暴
  | 'summary-chapter'   // 章节总结
  | 'summary-story'     // 故事总结
  | 'translation-cn'    // 中译英
  | 'translation-en';   // 英译中

/** 提示词模板接口 */
interface PromptTemplate {
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  description: string;
}

/** 提示词变量上下文 */
export interface PromptContext {
  // 基础上下文
  projectTitle?: string;
  genre?: string;
  style?: string;
  
  // 章节上下文
  chapterTitle?: string;
  chapterOutline?: string;
  previousContent?: string;
  currentContent?: string;
  
  // 角色信息
  characters?: Character[];
  targetCharacter?: Character;
  
  // 世界观
  worldSettings?: WorldSetting[];
  
  // 情节
  plotPoints?: PlotNode[];
  
  // Echo
  echoes?: Echo[];
  
  // 用户指令
  userInstruction?: string;
  
  // 自定义变量
  [key: string]: any;
}

/** 组装后的提示词 */
export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  templateType: PromptTemplateType;
  version: string;
  estimatedTokens: number;
}

// ============================================
// 提示词模板库
// ============================================

const PROMPT_TEMPLATES: Record<PromptTemplateType, PromptTemplate> = {
  // 续写提示词
  'continuation': {
    version: '1.0.0',
    description: '根据上下文智能续写小说内容',
    systemPrompt: `你是一位专业的小说写作助手，擅长根据已有内容进行风格一致的续写。
请遵循以下原则：
1. 保持与原文一致的语言风格和叙事节奏
2. 注意人物性格的连贯性
3. 情节发展要自然合理
4. 适当增加细节描写，增强画面感
5. 避免与已有内容重复
6. 每次续写300-800字为宜`,
    userPromptTemplate: `【作品信息】
作品名称：{{projectTitle}}
类型：{{genre}}
风格：{{style}}

【当前章节】
章节标题：{{chapterTitle}}
大纲：{{chapterOutline}}

{{#if characters}}
【角色设定】
{{#each characters}}
- {{name}}：{{description}} (性格：{{traits}})
{{/each}}
{{/if}}

{{#if worldSettings}}
【世界观设定】
{{#each worldSettings}}
- {{name}}：{{description}}
{{/each}}
{{/if}}

【前文内容】
{{previousContent}}

【用户指令】
{{userInstruction}}

请根据以上内容进行续写：`,
    variables: ['projectTitle', 'genre', 'style', 'chapterTitle', 'chapterOutline', 
                'characters', 'worldSettings', 'previousContent', 'userInstruction'],
  },

  // 风格润色
  'polish-style': {
    version: '1.0.0',
    description: '提升文本的文学性和表现力',
    systemPrompt: `你是一位资深的文学编辑，专注于提升文本的文学品质。
润色时请：
1. 优化句式结构，增强节奏感
2. 丰富词汇表达，避免重复
3. 增强画面感和代入感
4. 保持原有情节和人物设定不变
5. 尊重作者的原意和风格`,
    userPromptTemplate: `【需要润色的文本】
{{currentContent}}

{{#if userInstruction}}
【特殊要求】
{{userInstruction}}
{{/if}}

请对上述文本进行风格润色，提升文学性：`,
    variables: ['currentContent', 'userInstruction'],
  },

  // 语法润色
  'polish-grammar': {
    version: '1.0.0',
    description: '修正语法错误和改进表达',
    systemPrompt: `你是一位严谨的文字校对专家。
请：
1. 修正错别字和标点错误
2. 修正语法问题
3. 优化不通顺的表达
4. 保持原文意思不变
5. 只输出修改后的文本，不解释修改原因`,
    userPromptTemplate: `【需要校对的文本】
{{currentContent}}

请修正上述文本中的语法和文字错误：`,
    variables: ['currentContent'],
  },

  // 角色分析
  'analysis-character': {
    version: '1.0.0',
    description: '深度分析角色特点和塑造建议',
    systemPrompt: `你是一位角色塑造专家，擅长分析文学角色的深度和立体性。
分析时请从以下维度进行：
1. 性格特点分析
2. 成长弧线评估
3. 行为动机解读
4. 与其他角色的关系
5. 塑造建议`,
    userPromptTemplate: `【作品信息】
作品名称：{{projectTitle}}
类型：{{genre}}

【目标角色】
{{#if targetCharacter}}
姓名：{{targetCharacter.name}}
当前设定：{{targetCharacter.description}}
性格标签：{{targetCharacter.traits}}
{{/if}}

{{#if plotPoints}}
【相关情节】
{{#each plotPoints}}
- {{title}}：{{description}}
{{/each}}
{{/if}}

请对该角色进行全面分析：`,
    variables: ['projectTitle', 'genre', 'targetCharacter', 'plotPoints'],
  },

  // 情节分析
  'analysis-plot': {
    version: '1.0.0',
    description: '分析情节结构和节奏',
    systemPrompt: `你是一位故事结构分析专家。
请分析情节的：
1. 结构完整性（起承转合）
2. 节奏把控
3. 冲突设置
4. 悬念安排
5. 改进建议`,
    userPromptTemplate: `【作品信息】
作品名称：{{projectTitle}}
类型：{{genre}}

【情节概要】
{{#if plotPoints}}
{{#each plotPoints}}
{{inc @index}}. {{title}}
   {{description}}
{{/each}}
{{/if}}

【当前内容】
{{currentContent}}

请分析以上情节结构：`,
    variables: ['projectTitle', 'genre', 'plotPoints', 'currentContent'],
  },

  // Echo提取
  'echo-extract': {
    version: '1.0.0',
    description: '从文本中提取Echo（灵感片段）',
    systemPrompt: `你是一位灵感捕手，擅长从文本中提取有价值的创意元素（Echo）。
Echo包括但不限于：
- 独特的设定或概念
- 精彩的对话片段
- 有潜力的情节线索
- 生动的场景描写
- 人物关系的微妙变化
请以JSON格式输出提取结果。`,
    userPromptTemplate: `【待分析文本】
{{currentContent}}

{{#if existingEchoes}}
【已有的Echo】
{{#each existingEchoes}}
- {{content}} (类型：{{type}})
{{/each}}
{{/if}}

请从上述文本中提取Echo，按以下JSON格式输出：
[
  {
    "content": "Echo内容",
    "type": "设定/对话/情节/场景/关系",
    "significance": "重要性说明",
    "confidence": 0.9
  }
]`,
    variables: ['currentContent', 'existingEchoes'],
  },

  // 情节头脑风暴
  'brainstorm-plot': {
    version: '1.0.0',
    description: '生成情节发展建议',
    systemPrompt: `你是一位创意策划师，擅长构思精彩的故事情节。
请提供：
1. 多个不同方向的发展可能
2. 每个方向的亮点和潜在问题
3. 与现有情节的衔接建议
4. 出人意料但合理的创意`,
    userPromptTemplate: `【作品信息】
作品名称：{{projectTitle}}
类型：{{genre}}
风格：{{style}}

【当前情节背景】
{{currentContent}}

{{#if characters}}
【主要角色】
{{#each characters}}
- {{name}}：{{description}}
{{/each}}
{{/if}}

{{#if userInstruction}}
【创作要求】
{{userInstruction}}
{{/if}}

请为接下来的情节发展提供5-8个创意方向：`,
    variables: ['projectTitle', 'genre', 'style', 'currentContent', 'characters', 'userInstruction'],
  },

  // 角色头脑风暴
  'brainstorm-character': {
    version: '1.0.0',
    description: '生成角色设定建议',
    systemPrompt: `你是一位角色设计师，擅长创造令人难忘的角色。
请提供：
1. 独特的性格特征组合
2. 有深度的背景故事
3. 鲜明的外貌特征
4. 独特的说话方式
5. 内在矛盾和成长空间`,
    userPromptTemplate: `【作品信息】
作品名称：{{projectTitle}}
类型：{{genre}}

【角色定位】
{{userInstruction}}

{{#if worldSettings}}
【世界观背景】
{{#each worldSettings}}
- {{name}}：{{description}}
{{/each}}
{{/if}}

请设计3-5个不同风格的角色方案：`,
    variables: ['projectTitle', 'genre', 'userInstruction', 'worldSettings'],
  },

  // 章节总结
  'summary-chapter': {
    version: '1.0.0',
    description: '生成章节摘要',
    systemPrompt: `你是一位专业的内容摘要专家。
请：
1. 提炼章节核心事件
2. 总结人物表现
3. 标记关键情节点
4. 控制摘要长度在200-300字`,
    userPromptTemplate: `【章节内容】
{{currentContent}}

请生成章节摘要，包含：
- 核心事件
- 人物动态
- 关键转折
- 悬念设置`,
    variables: ['currentContent'],
  },

  // 故事总结
  'summary-story': {
    version: '1.0.0',
    description: '生成故事整体概要',
    systemPrompt: `你是一位故事分析师。
请：
1. 概括主线剧情
2. 梳理人物关系
3. 总结主题思想
4. 评估故事结构完整性`,
    userPromptTemplate: `【作品信息】
作品名称：{{projectTitle}}
类型：{{genre}}

【情节概要】
{{#if plotPoints}}
{{#each plotPoints}}
- {{title}}：{{description}}
{{/each}}
{{/if}}

【主要角色】
{{#if characters}}
{{#each characters}}
- {{name}}：{{description}}
{{/each}}
{{/if}}

请生成完整的故事概要：`,
    variables: ['projectTitle', 'genre', 'plotPoints', 'characters'],
  },

  // 中译英
  'translation-cn': {
    version: '1.0.0',
    description: '中文翻译成英文',
    systemPrompt: `你是一位专业翻译，擅长将中文文学作品翻译成地道的英文。
要求：
1. 保持原文的意境和风格
2. 使用地道的英文表达
3. 注意文化差异的妥善处理
4. 保持叙事节奏一致`,
    userPromptTemplate: `【待翻译文本】
{{currentContent}}

请将以上中文翻译成英文：`,
    variables: ['currentContent'],
  },

  // 英译中
  'translation-en': {
    version: '1.0.0',
    description: '英文翻译成中文',
    systemPrompt: `你是一位专业翻译，擅长将英文文学作品翻译成优美的中文。
要求：
1. 准确理解原文含义
2. 使用流畅优雅的中文表达
3. 保持文学性和可读性
4. 适当处理文化专有名词`,
    userPromptTemplate: `【待翻译文本】
{{currentContent}}

请将以上英文翻译成中文：`,
    variables: ['currentContent'],
  },
};

// ============================================
// 模板处理函数
// ============================================

/**
 * 简单的模板引擎 - 替换变量
 * @param template - 模板字符串
 * @param context - 变量上下文
 * @returns 替换后的字符串
 */
function renderTemplate(template: string, context: PromptContext): string {
  // 处理条件块 {{#if var}}...{{/if}}
  let result = template.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    const value = context[key];
    return value && (Array.isArray(value) ? value.length > 0 : true) ? content : '';
  });
  
  // 处理对象属性 {{obj.property}}
  result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, objKey, propKey) => {
    const obj = context[objKey];
    return obj && typeof obj === 'object' ? String(obj[propKey] || '') : '';
  });
  
  // 处理循环 {{#each arr}}...{{/each}}
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrKey, itemTemplate) => {
    const arr = context[arrKey];
    if (!Array.isArray(arr)) return '';
    
    return arr.map((item, index) => {
      let itemResult = itemTemplate;
      // 替换 {{this}} 为当前项
      itemResult = itemResult.replace(/\{\{this\}\}/g, String(item));
      // 替换 {{this.property}}
      if (typeof item === 'object') {
        Object.keys(item).forEach(key => {
          itemResult = itemResult.replace(
            new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'),
            String(item[key] || '')
          );
        });
      }
      // 替换索引 {{@index}} 和 {{inc @index}}
      itemResult = itemResult.replace(/\{\{inc\s+@index\}\}/g, String(index + 1));
      itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index));
      return itemResult;
    }).join('');
  });
  
  // 处理简单变量 {{var}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : '';
  });
  
  return result;
}

/**
 * 估算token数量（简单估算：中文1字≈1.5token，英文1词≈1.3token）
 * @param text - 文本内容
 * @returns 估算的token数
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const otherChars = text.length - chineseChars - englishWords;
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5);
}

// ============================================
// 公开API
// ============================================

/**
 * 组装提示词
 * @param templateType - 模板类型
 * @param context - 变量上下文
 * @returns 组装后的提示词
 */
export function assemblePrompt(
  templateType: PromptTemplateType,
  context: PromptContext
): AssembledPrompt {
  const template = PROMPT_TEMPLATES[templateType];
  
  if (!template) {
    throw new Error(`未知的提示词模板类型: ${templateType}`);
  }
  
  const userPrompt = renderTemplate(template.userPromptTemplate, context);
  
  // 清理空行
  const cleanSystemPrompt = template.systemPrompt.replace(/\n{3,}/g, '\n\n').trim();
  const cleanUserPrompt = userPrompt.replace(/\n{3,}/g, '\n\n').trim();
  
  const estimatedTokens = estimateTokens(cleanSystemPrompt + cleanUserPrompt);
  
  return {
    systemPrompt: cleanSystemPrompt,
    userPrompt: cleanUserPrompt,
    templateType,
    version: template.version,
    estimatedTokens,
  };
}

/**
 * 获取提示词模板列表
 * @returns 模板类型和描述列表
 */
export function getAvailableTemplates(): Array<{ type: PromptTemplateType; description: string; version: string }> {
  return Object.entries(PROMPT_TEMPLATES).map(([type, template]) => ({
    type: type as PromptTemplateType,
    description: template.description,
    version: template.version,
  }));
}

/**
 * 获取特定模板的详细信息
 * @param templateType - 模板类型
 * @returns 模板详细信息
 */
export function getTemplateInfo(templateType: PromptTemplateType): Omit<PromptTemplate, 'userPromptTemplate'> | null {
  const template = PROMPT_TEMPLATES[templateType];
  if (!template) return null;
  
  const { userPromptTemplate, ...info } = template;
  return info;
}

/**
 * 自定义提示词组装（不使用模板）
 * @param systemPrompt - 系统提示词
 * @param userPrompt - 用户提示词
 * @returns 组装后的提示词
 */
export function assembleCustomPrompt(
  systemPrompt: string,
  userPrompt: string
): AssembledPrompt {
  return {
    systemPrompt: systemPrompt.trim(),
    userPrompt: userPrompt.trim(),
    templateType: 'continuation', // 默认类型
    version: 'custom',
    estimatedTokens: estimateTokens(systemPrompt + userPrompt),
  };
}

/**
 * 验证提示词上下文是否完整
 * @param templateType - 模板类型
 * @param context - 变量上下文
 * @returns 缺失的必需变量列表
 */
export function validateContext(
  templateType: PromptTemplateType,
  context: PromptContext
): string[] {
  const template = PROMPT_TEMPLATES[templateType];
  if (!template) return ['未知的模板类型'];
  
  return template.variables.filter(variable => {
    const value = context[variable];
    return value === undefined || value === null || value === '';
  });
}

/**
 * 快捷方法：生成续写提示词
 */
export function createContinuationPrompt(context: PromptContext): AssembledPrompt {
  return assemblePrompt('continuation', context);
}

/**
 * 快捷方法：生成润色提示词
 */
export function createPolishPrompt(
  content: string,
  polishType: 'style' | 'grammar' = 'style',
  instruction?: string
): AssembledPrompt {
  return assemblePrompt(
    polishType === 'style' ? 'polish-style' : 'polish-grammar',
    { currentContent: content, userInstruction: instruction }
  );
}

/**
 * 快捷方法：生成Echo提取提示词
 */
export function createEchoExtractionPrompt(
  content: string,
  existingEchoes?: Echo[]
): AssembledPrompt {
  return assemblePrompt('echo-extract', {
    currentContent: content,
    existingEchoes,
  });
}

/**
 * 快捷方法：生成角色分析提示词
 */
export function createCharacterAnalysisPrompt(
  character: Character,
  context: Partial<PromptContext> = {}
): AssembledPrompt {
  return assemblePrompt('analysis-character', {
    ...context,
    targetCharacter: character,
  });
}

// ============================================
// 提示词版本管理
// ============================================

/**
 * 获取模板版本历史
 * @param templateType - 模板类型
 * @returns 版本历史
 */
export function getTemplateVersion(templateType: PromptTemplateType): string {
  const template = PROMPT_TEMPLATES[templateType];
  return template?.version || 'unknown';
}

/**
 * 检查模板是否有更新（用于未来扩展）
 * @param templateType - 模板类型
 * @param currentVersion - 当前版本
 * @returns 是否有新版本
 */
export function checkTemplateUpdate(
  templateType: PromptTemplateType,
  currentVersion: string
): boolean {
  const latestVersion = getTemplateVersion(templateType);
  return latestVersion !== currentVersion;
}
