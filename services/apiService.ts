/**
 * API Service - 后端服务通信
 * Phase 1: 核心写作体验
 */

import { ProjectState, Chapter } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 通用请求封装
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// 项目 API
// ============================================
export const fetchProjectList = async (): Promise<Array<{ id: string; title: string; genre: string; lastModified: number }>> => {
  return fetchApi('/projects');
};

export const fetchProject = async (id: string): Promise<ProjectState> => {
  return fetchApi(`/projects/${id}`);
};

export const syncProject = async (project: ProjectState): Promise<void> => {
  return fetchApi(`/projects/${project.id}`, {
    method: 'PUT',
    body: JSON.stringify(project),
  });
};

export const patchProject = async (id: string, patch: Partial<ProjectState>): Promise<void> => {
  return fetchApi(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
};

export const deleteProjectApi = async (id: string): Promise<void> => {
  return fetchApi(`/projects/${id}`, {
    method: 'DELETE',
  });
};

// ============================================
// 章节 API
// ============================================
export const fetchChapter = async (projectId: string, chapterId: string): Promise<Chapter> => {
  return fetchApi(`/projects/${projectId}/chapters/${chapterId}`);
};

export const updateChapterApi = async (
  projectId: string, 
  chapterId: string, 
  data: Partial<Chapter>
): Promise<Chapter> => {
  return fetchApi(`/projects/${projectId}/chapters/${chapterId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// ============================================
// 知识图谱 API
// ============================================
export interface GraphNode {
  id: string;
  label: string;
  type: 'Character' | 'WorldSetting' | 'Event' | 'Echo';
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export const fetchGraph = async (projectId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
  return fetchApi(`/projects/${projectId}/graph`);
};

export const createEdgeApi = async (
  projectId: string,
  sourceId: string,
  targetId: string,
  relType: string
): Promise<void> => {
  return fetchApi(`/projects/${projectId}/graph/edges`, {
    method: 'POST',
    body: JSON.stringify({ sourceId, targetId, relType }),
  });
};

// ============================================
// 健康检查
// ============================================
export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};
