/**
 * AI Store - AI相关状态管理
 * 管理AI生成状态、流式输出、建议缓存等
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// AI生成任务类型
// ============================================
export type AIGenerationTask = 
  | 'OUTLINE'
  | 'CONTINUE'
  | 'POLISH'
  | 'EXPAND'
  | 'SUMMARIZE'
  | 'BRAINSTORM'
  | 'CHARACTER'
  | 'WORLD'
  | 'PLOT'
  | null;

// ============================================
// AI消息类型
// ============================================
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  task?: AIGenerationTask;
  metadata?: {
    chapterId?: string;
    characterId?: string;
    wordCount?: number;
    duration?: number;
  };
}

// ============================================
// AI建议类型
// ============================================
export interface AISuggestion {
  id: string;
  type: 'CONTINUE' | 'POLISH' | 'EXPAND' | 'FIX' | 'IDEA';
  content: string;
  context: string;
  timestamp: number;
  accepted: boolean | null;
  chapterId?: string;
}

// ============================================
// AI Store 状态接口
// ============================================
export interface AIState {
  // --- 生成状态 ---
  isGenerating: boolean;
  currentTask: AIGenerationTask;
  currentStream: string;
  generationProgress: number; // 0-100
  
  // --- 消息历史 ---
  messages: AIMessage[];
  currentConversationId: string | null;
  
  // --- 建议缓存 ---
  suggestions: Map<string, AISuggestion>;
  pendingSuggestions: string[]; // suggestion IDs
  
  // --- 设置 ---
  settings: {
    autoSuggest: boolean;
    triggerDelay: number; // 秒
    maxContextLength: number;
    preferredModel: string;
  };
  
  // --- 统计 ---
  stats: {
    totalGenerations: number;
    totalTokensUsed: number;
    averageResponseTime: number;
  };
}

// ============================================
// AI Store Actions 接口
// ============================================
export interface AIActions {
  // --- 生成控制 ---
  startGeneration: (task: AIGenerationTask) => void;
  appendStream: (chunk: string) => void;
  endGeneration: () => void;
  cancelGeneration: () => void;
  setGenerationProgress: (progress: number) => void;
  
  // --- 消息管理 ---
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setCurrentConversation: (id: string | null) => void;
  
  // --- 建议管理 ---
  addSuggestion: (suggestion: Omit<AISuggestion, 'id' | 'timestamp'>) => string;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  clearSuggestions: (chapterId?: string) => void;
  getSuggestionById: (id: string) => AISuggestion | undefined;
  getSuggestionsByChapter: (chapterId: string) => AISuggestion[];
  
  // --- 设置 ---
  updateSettings: (settings: Partial<AIState['settings']>) => void;
  
  // --- 统计 ---
  recordGeneration: (tokensUsed: number, responseTime: number) => void;
  
  // --- 重置 ---
  resetAIState: () => void;
}

// ============================================
// 初始状态
// ============================================
const INITIAL_AI_STATE: AIState = {
  isGenerating: false,
  currentTask: null,
  currentStream: '',
  generationProgress: 0,
  messages: [],
  currentConversationId: null,
  suggestions: new Map(),
  pendingSuggestions: [],
  settings: {
    autoSuggest: true,
    triggerDelay: 3,
    maxContextLength: 4000,
    preferredModel: 'gemini-2.0-flash-exp',
  },
  stats: {
    totalGenerations: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
  },
};

// ============================================
// 序列化辅助函数（处理Map）
// ============================================
const serializeSuggestions = (suggestions: Map<string, AISuggestion>): [string, AISuggestion][] => {
  return Array.from(suggestions.entries());
};

const deserializeSuggestions = (entries: [string, AISuggestion][]): Map<string, AISuggestion> => {
  return new Map(entries);
};

// ============================================
// Store 实现（带持久化）
// ============================================
export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_AI_STATE,

      // --- 生成控制 ---
      startGeneration: (task) => set({
        isGenerating: true,
        currentTask: task,
        currentStream: '',
        generationProgress: 0,
      }),

      appendStream: (chunk) => set((state) => ({
        currentStream: state.currentStream + chunk,
      })),

      endGeneration: () => set({
        isGenerating: false,
        currentTask: null,
        generationProgress: 100,
      }),

      cancelGeneration: () => set({
        isGenerating: false,
        currentTask: null,
        currentStream: '',
        generationProgress: 0,
      }),

      setGenerationProgress: (progress) => set({ generationProgress: progress }),

      // --- 消息管理 ---
      addMessage: (message) => set((state) => ({
        messages: [
          ...state.messages,
          {
            ...message,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          },
        ],
      })),

      clearMessages: () => set({ messages: [], currentConversationId: null }),

      setCurrentConversation: (id) => set({ currentConversationId: id }),

      // --- 建议管理 ---
      addSuggestion: (suggestion) => {
        const id = crypto.randomUUID();
        const newSuggestion: AISuggestion = {
          ...suggestion,
          id,
          timestamp: Date.now(),
        };
        set((state) => ({
          suggestions: new Map(state.suggestions).set(id, newSuggestion),
          pendingSuggestions: [...state.pendingSuggestions, id],
        }));
        return id;
      },

      acceptSuggestion: (id) => set((state) => {
        const suggestions = new Map(state.suggestions);
        const suggestion = suggestions.get(id);
        if (suggestion) {
          suggestions.set(id, { ...suggestion, accepted: true });
        }
        return {
          suggestions,
          pendingSuggestions: state.pendingSuggestions.filter((sid) => sid !== id),
        };
      }),

      rejectSuggestion: (id) => set((state) => {
        const suggestions = new Map(state.suggestions);
        const suggestion = suggestions.get(id);
        if (suggestion) {
          suggestions.set(id, { ...suggestion, accepted: false });
        }
        return {
          suggestions,
          pendingSuggestions: state.pendingSuggestions.filter((sid) => sid !== id),
        };
      }),

      clearSuggestions: (chapterId) => set((state) => {
        if (!chapterId) {
          return { suggestions: new Map(), pendingSuggestions: [] };
        }
        const suggestions = new Map(state.suggestions);
        const pendingSuggestions = state.pendingSuggestions.filter((id) => {
          const suggestion = suggestions.get(id);
          if (suggestion?.chapterId === chapterId) {
            suggestions.delete(id);
            return false;
          }
          return true;
        });
        return { suggestions, pendingSuggestions };
      }),

      getSuggestionById: (id) => get().suggestions.get(id),

      getSuggestionsByChapter: (chapterId) => {
        const { suggestions } = get();
        return Array.from(suggestions.values()).filter(
          (s) => s.chapterId === chapterId
        );
      },

      // --- 设置 ---
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings },
      })),

      // --- 统计 ---
      recordGeneration: (tokensUsed, responseTime) => set((state) => {
        const totalGenerations = state.stats.totalGenerations + 1;
        const totalTokensUsed = state.stats.totalTokensUsed + tokensUsed;
        const averageResponseTime =
          (state.stats.averageResponseTime * state.stats.totalGenerations + responseTime) /
          totalGenerations;
        return {
          stats: {
            totalGenerations,
            totalTokensUsed,
            averageResponseTime,
          },
        };
      }),

      // --- 重置 ---
      resetAIState: () => set(INITIAL_AI_STATE),
    }),
    {
      name: 'muse-ai-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化设置和统计，不持久化临时状态
        settings: state.settings,
        stats: state.stats,
        suggestions: serializeSuggestions(state.suggestions),
      }),
      onRehydrateStorage: () => (state) => {
        // 恢复时重新构建Map
        if (state && state.suggestions) {
          state.suggestions = deserializeSuggestions(state.suggestions as unknown as [string, AISuggestion][]);
        }
      },
    }
  )
);

// ============================================
// 选择器 Hooks（用于性能优化）
// ============================================

/** 获取生成状态 */
export const useIsGenerating = () => useAIStore((state) => state.isGenerating);

/** 获取当前流式输出 */
export const useCurrentStream = () => useAIStore((state) => state.currentStream);

/** 获取当前生成任务 */
export const useCurrentTask = () => useAIStore((state) => state.currentTask);

/** 获取生成进度 */
export const useGenerationProgress = () => useAIStore((state) => state.generationProgress);

/** 获取AI设置 */
export const useAISettings = () => useAIStore((state) => state.settings);

/** 获取待处理建议数量 */
export const usePendingSuggestionsCount = () => 
  useAIStore((state) => state.pendingSuggestions.length);
