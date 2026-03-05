/**
 * Quality Service - 质量检查系统（增强版）
 * Phase 1 Week 3: 实时一致性检查 + AI 深度分析
 */

import { ProjectState, Chapter, Character, WorldSetting, QualityIssue, QualityReport } from '../types';
import { executeAIRequest, AIRequestConfig, AIResponse } from './ai/aiRouter';

// AI分析结果类型
export interface AIAnalysisResult {
  issues: Array<{
    type: 'CONSISTENCY' | 'STYLE' | 'LOGIC' | 'GRAMMAR' | 'PACING';
    severity: 'INFO' | 'WARNING' | 'ERROR';
    message: string;
    suggestion: string;
    autoFixable: boolean;
  }>;
  strengths: string[];
  weaknesses: string[];
  aiProcessed: boolean;
}

export interface AIAnalysisOptions {
  timeout?: number;
  signal?: AbortSignal;
  skipCache?: boolean;
}

// ============================================
// 缓存管理
// ============================================

interface CacheEntry {
  result: AIAnalysisResult;
  timestamp: number;
}

const analysisCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

function getCacheKey(chapterId: string): string {
  return `quality_${chapterId}`;
}

function getCachedResult(chapterId: string): AIAnalysisResult | null {
  const key = getCacheKey(chapterId);
  const entry = analysisCache.get(key);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    analysisCache.delete(key);
    return null;
  }
  
  return entry.result;
}

function setCachedResult(chapterId: string, result: AIAnalysisResult): void {
  const key = getCacheKey(chapterId);
  analysisCache.set(key, {
    result,
    timestamp: Date.now()
  });
}

function invalidateCache(chapterId: string): void {
  const key = getCacheKey(chapterId);
  analysisCache.delete(key);
}

// ============================================
// 一致性检查规则
// ============================================

interface ConsistencyRule {
  id: string;
  name: string;
  check: (chapter: Chapter, project: ProjectState) => QualityIssue[];
}

// 角色一致性检查
const characterConsistencyCheck = (chapter: Chapter, project: ProjectState): QualityIssue[] => {
  const issues: QualityIssue[] = [];
  const content = chapter.content?.toLowerCase() || '';
  
  // 检查角色能力一致性（简化版）
  project.characters.forEach(char => {
    const charName = char.name.toLowerCase();
    if (!content.includes(charName)) return;
    
    // 检查是否有能力描述冲突
    if (char.description) {
      const desc = char.description.toLowerCase();
      
      // 示例：如果角色描述中说他不会游泳，但本章中他在游泳
      if (desc.includes('不会游泳') || desc.includes('怕水')) {
        // 简化检测：如果文中有角色名+水相关词汇
        const waterTerms = ['游泳', '潜水', '水中', '河里', '海里'];
        for (const term of waterTerms) {
          if (content.includes(term)) {
            issues.push({
              type: 'CONSISTENCY',
              severity: 'ERROR',
              message: `${char.name} 的设定中表明不会游泳，但本章似乎涉及水中活动`,
              suggestion: `检查 ${char.name} 的行为是否符合其能力设定，或修改设定`,
              autoFixable: false
            });
            break;
          }
        }
      }
    }
  });
  
  return issues;
};

// 世界观一致性检查
const worldConsistencyCheck = (chapter: Chapter, project: ProjectState): QualityIssue[] => {
  const issues: QualityIssue[] = [];
  const content = chapter.content?.toLowerCase() || '';
  
  // 检查魔法/科技系统的一致性
  project.worldSettings.forEach(setting => {
    if (setting.category !== 'Magic/Tech') return;
    
    const settingTitle = setting.title.toLowerCase();
    const settingContent = setting.content.toLowerCase();
    
    // 简化检测：如果设定中提到某个限制，检查本章是否违反
    if (settingContent.includes('限制') || settingContent.includes('代价')) {
      // 这里可以添加更复杂的规则
    }
  });
  
  return issues;
};

// 时间线一致性检查
const timelineConsistencyCheck = (chapter: Chapter, project: ProjectState): QualityIssue[] => {
  const issues: QualityIssue[] = [];
  
  // 检查章节顺序是否合理
  if (chapter.order > 0) {
    const prevChapter = project.chapters.find(ch => ch.order === chapter.order - 1);
    if (prevChapter && !prevChapter.content && chapter.content) {
      issues.push({
        type: 'LOGIC',
        severity: 'WARNING',
        message: '前一章还没有内容，建议按顺序写作',
        suggestion: '可以先完成前一章的内容，或调整章节顺序',
        autoFixable: false
      });
    }
  }
  
  return issues;
};

// 写作风格检查
const styleCheck = (chapter: Chapter): QualityIssue[] => {
  const issues: QualityIssue[] = [];
  const content = chapter.content || '';
  
  // 检查句子长度（过长可能难以阅读）
  const sentences = content.split(/[。！？.!?]/);
  let longSentences = 0;
  sentences.forEach(sentence => {
    if (sentence.length > 100) longSentences++;
  });
  
  if (longSentences > 5) {
    issues.push({
      type: 'STYLE',
      severity: 'INFO',
      message: `检测到 ${longSentences} 个超长句子（超过100字）`,
      suggestion: '考虑将长句拆分为短句，提高可读性',
      autoFixable: false
    });
  }
  
  // 检查对话比例
  const dialogueMatches = content.match(/["""''](.*?)["""'']/g);
  const dialogueLength = dialogueMatches ? dialogueMatches.join('').length : 0;
  const dialogueRatio = content.length > 0 ? dialogueLength / content.length : 0;
  
  if (dialogueRatio > 0.6) {
    issues.push({
      type: 'STYLE',
      severity: 'INFO',
      message: '对话占比过高（超过60%）',
      suggestion: '适当增加叙述和描写，平衡对话与叙述',
      autoFixable: false
    });
  }
  
  // 检查重复用词（简化版）
  const words = content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  const repeated = Object.entries(wordCount).filter(([word, count]) => count > 10 && word.length >= 2);
  if (repeated.length > 3) {
    issues.push({
      type: 'STYLE',
      severity: 'INFO',
      message: `检测到一些高频重复词汇`,
      suggestion: '尝试使用同义词替换，增加词汇多样性',
      autoFixable: false
    });
  }
  
  return issues;
};

// 所有检查规则
const consistencyRules: ConsistencyRule[] = [
  { id: 'character', name: '角色一致性', check: characterConsistencyCheck },
  { id: 'world', name: '世界观一致性', check: worldConsistencyCheck },
  { id: 'timeline', name: '时间线一致性', check: timelineConsistencyCheck },
  { id: 'style', name: '写作风格', check: styleCheck },
];

// ============================================
// 基础质量检查服务
// ============================================

/**
 * 运行基础规则检查
 */
export function runBasicChecks(chapter: Chapter, project: ProjectState): QualityIssue[] {
  const allIssues: QualityIssue[] = [];
  
  consistencyRules.forEach(rule => {
    try {
      const issues = rule.check(chapter, project);
      allIssues.push(...issues);
    } catch (e) {
      console.error(`Rule ${rule.name} failed:`, e);
    }
  });
  
  return allIssues;
}

/**
 * 计算质量分数
 */
function calculateScore(issues: QualityIssue[]): number {
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const infoCount = issues.filter(i => i.severity === 'INFO').length;
  
  let score = 100;
  score -= errorCount * 15;
  score -= warningCount * 5;
  score -= infoCount * 2;
  score = Math.max(0, score);
  
  return score;
}

// ============================================
// 质量检查服务
// ============================================

export interface QualityCheckOptions {
  useAI?: boolean;
  skipCache?: boolean;
  timeout?: number;
  signal?: AbortSignal;
}

export interface EnhancedQualityReport extends QualityReport {
  aiAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    aiProcessed: boolean;
  };
  basicIssues: QualityIssue[];
  aiIssues: QualityIssue[];
}

export const qualityService = {
  // 检查单个章节（异步，支持 AI）
  async checkChapter(
    chapter: Chapter, 
    project: ProjectState,
    options: QualityCheckOptions = {}
  ): Promise<QualityIssue[]> {
    const { useAI = true, skipCache = false, timeout, signal } = options;
    
    // 1. 基础规则检查
    const basicIssues = runBasicChecks(chapter, project);
    
    // 2. AI 深度分析
    if (useAI) {
      try {
        const aiResult = await this.runAIAnalysis(chapter, project, {
          skipCache,
          timeout,
          signal
        });
        return [...basicIssues, ...aiResult.issues];
      } catch (error) {
        console.warn('AI analysis failed, using basic checks only:', error);
        return basicIssues;
      }
    }
    
    return basicIssues;
  },
  
  // 运行 AI 深度分析
  async runAIAnalysis(
    chapter: Chapter,
    project: ProjectState,
    options: { skipCache?: boolean; timeout?: number; signal?: AbortSignal } = {}
  ): Promise<AIAnalysisResult> {
    const { skipCache = false, timeout, signal } = options;
    
    // 检查缓存
    if (!skipCache) {
      const cached = getCachedResult(chapter.id);
      if (cached) {
        return cached;
      }
    }
    
    // 运行 AI 分析
    const result = await runAIAnalysisInternal(chapter, project, { timeout, signal });
    
    // 缓存结果
    setCachedResult(chapter.id, result);
    
    return result;
  },
  
  // 生成质量报告（异步，支持 AI）
  async generateReport(
    chapter: Chapter, 
    project: ProjectState,
    options: QualityCheckOptions = {}
  ): Promise<EnhancedQualityReport> {
    const { useAI = true, skipCache = false, timeout, signal } = options;
    
    // 1. 基础规则检查（保留）
    const basicIssues = runBasicChecks(chapter, project);
    
    // 2. AI 深度分析（新增）
    let aiIssues: QualityIssue[] = [];
    let aiAnalysis: EnhancedQualityReport['aiAnalysis'] = {
      strengths: [],
      weaknesses: [],
      aiProcessed: false
    };
    
    if (useAI !== false) {
      try {
        const aiResult = await this.runAIAnalysis(chapter, project, {
          skipCache,
          timeout,
          signal
        });
        aiIssues = aiResult.issues;
        aiAnalysis = {
          strengths: aiResult.strengths,
          weaknesses: aiResult.weaknesses,
          aiProcessed: aiResult.aiProcessed
        };
      } catch (error) {
        console.warn('AI analysis failed, falling back to basic checks:', error);
        aiAnalysis.weaknesses.push('AI 分析失败，仅显示基础检查结果');
      }
    }
    
    const allIssues = [...basicIssues, ...aiIssues];
    const score = calculateScore(allIssues);
    
    return {
      timestamp: Date.now(),
      chapterId: chapter.id,
      score,
      issues: allIssues,
      suggestions: allIssues.map(i => i.suggestion),
      aiAnalysis,
      basicIssues,
      aiIssues
    };
  },
  
  // 实时检查（用于编辑器中）
  quickCheck(text: string, chapter: Chapter, project: ProjectState): QualityIssue[] {
    const tempChapter = { ...chapter, content: text };
    return runBasicChecks(tempChapter, project);
  },
  
  // 检查整个项目的一致性
  checkProjectConsistency(project: ProjectState): {
    globalIssues: QualityIssue[];
    chapterReports: QualityReport[];
  } {
    const globalIssues: QualityIssue[] = [];
    const chapterReports: QualityReport[] = [];
    
    // 检查角色是否在所有章节中保持一致
    project.characters.forEach(char => {
      // 检查是否有角色在设定中但从未出现
      let appearsInChapters = 0;
      project.chapters.forEach(ch => {
        if (ch.content?.includes(char.name)) {
          appearsInChapters++;
        }
      });
      
      if (appearsInChapters === 0 && project.chapters.length > 0) {
        globalIssues.push({
          type: 'CONSISTENCY',
          severity: 'INFO',
          message: `角色 "${char.name}" 尚未在任何章节中出现`,
          suggestion: '考虑安排该角色出场，或暂时移除',
          autoFixable: false
        });
      }
    });
    
    // 生成所有章节的质量报告（仅基础检查）
    project.chapters.forEach(chapter => {
      const issues = runBasicChecks(chapter, project);
      const score = calculateScore(issues);
      chapterReports.push({
        timestamp: Date.now(),
        chapterId: chapter.id,
        score,
        issues,
        suggestions: issues.map(i => i.suggestion)
      });
    });
    
    return { globalIssues, chapterReports };
  },
  
  // 清除缓存
  invalidateCache(chapterId: string): void {
    invalidateCache(chapterId);
  },
  
  // 清除所有缓存
  clearCache(): void {
    analysisCache.clear();
  }
};

// ============================================
// 内部 AI 分析函数
// ============================================

async function runAIAnalysisInternal(
  chapter: Chapter,
  project: ProjectState,
  options: { timeout?: number; signal?: AbortSignal } = {}
): Promise<AIAnalysisResult> {
  const { timeout = 30000 } = options;
  
  // 构建分析提示词
  const systemPrompt = `你是一位专业的文学编辑，擅长分析小说章节的质量。
请从以下维度进行分析：
1. 一致性 - 角色设定、世界观、情节发展是否连贯
2. 文风 - 语言表达是否流畅，是否有重复用词
3. 逻辑 - 情节发展是否合理，有无逻辑漏洞
4. 节奏 - 叙事节奏是否恰当
5. 吸引力 - 内容是否引人入胜

请以JSON格式返回分析结果：
{
  "issues": [
    {
      "type": "CONSISTENCY|STYLE|LOGIC|PACING",
      "severity": "ERROR|WARNING|INFO",
      "message": "问题描述",
      "suggestion": "改进建议",
      "autoFixable": false
    }
  ],
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"]
}`;

  const prompt = `【作品信息】
作品名称：${project.title}
类型：${project.genre}
风格：${project.creativeSettings?.style || '未设定'}

【章节信息】
章节标题：${chapter.title}
章节大纲：${chapter.summary || '无'}
视角人物：${chapter.expectedPOV || '无'}

【章节内容】
${chapter.content?.slice(0, 3000) || '无内容'}

请分析以上章节的质量。`;

  try {
    const response = await executeAIRequest({
      taskType: 'analysis',
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // 尝试解析JSON响应
    let result: AIAnalysisResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          issues: parsed.issues || [],
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          aiProcessed: true,
        };
      } else {
        throw new Error('无法解析AI响应');
      }
    } catch (e) {
      // 如果解析失败，返回一个基础结果
      result = {
        issues: [{
          type: 'STYLE',
          severity: 'INFO',
          message: 'AI分析响应格式异常，请检查内容',
          suggestion: '请重试或使用基础检查功能',
          autoFixable: false,
        }],
        strengths: [],
        weaknesses: ['AI分析响应格式异常'],
        aiProcessed: false,
      };
    }

    return result;
  } catch (error) {
    console.error('AI analysis request failed:', error);
    return {
      issues: [{
        type: 'CONSISTENCY',
        severity: 'INFO',
        message: 'AI分析服务暂时不可用',
        suggestion: '请检查网络连接或稍后重试',
        autoFixable: false,
      }],
      strengths: [],
      weaknesses: ['AI分析服务不可用'],
      aiProcessed: false,
    };
  }
}
