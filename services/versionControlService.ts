/**
 * Version Control Service - Git-like 版本控制系统
 * Phase 1 Week 4
 */

import { ProjectState, VersionBranch, VersionCommit, Chapter } from '../types';

// ============================================
// 差异计算
// ============================================

interface DiffResult {
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'chapter' | 'character' | 'world' | 'plot';
  entityId: string;
  diff?: any;
}

// 计算两个对象之间的差异
function calculateDiff(before: any, after: any): { hasChanged: boolean; changes: string[] } {
  const changes: string[] = [];
  
  if (typeof before !== typeof after) {
    return { hasChanged: true, changes: ['类型变化'] };
  }
  
  if (typeof before === 'string') {
    if (before !== after) {
      const wordDiff = (after?.length || 0) - (before?.length || 0);
      changes.push(`字数变化: ${wordDiff > 0 ? '+' : ''}${wordDiff} 字`);
      return { hasChanged: true, changes };
    }
    return { hasChanged: false, changes: [] };
  }
  
  if (typeof before === 'object') {
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    for (const key of allKeys) {
      if (before?.[key] !== after?.[key]) {
        changes.push(`${key}: 已修改`);
      }
    }
    
    return { hasChanged: changes.length > 0, changes };
  }
  
  return { hasChanged: before !== after, changes };
}

// ============================================
// 版本控制服务
// ============================================

export const versionControlService = {
  // 初始化版本控制
  initialize(project: ProjectState): ProjectState {
    if (project.versionControl) return project;
    
    const initialCommit: VersionCommit = {
      id: 'initial',
      parent: '',
      message: '项目初始化',
      author: '作者',
      timestamp: Date.now(),
      changes: [],
      wordCount: 0
    };
    
    return {
      ...project,
      versionControl: {
        branches: [{
          name: 'main',
          head: 'initial',
          base: '',
          description: '主分支',
          createdAt: Date.now(),
          isExperiment: false
        }],
        currentBranch: 'main',
        commits: [initialCommit]
      }
    };
  },
  
  // 创建提交
  commit(
    project: ProjectState,
    message: string,
    author: string = '作者'
  ): { project: ProjectState; commitId: string } {
    const vc = project.versionControl || {
      branches: [],
      currentBranch: 'main',
      commits: []
    };
    
    const currentBranch = vc.branches.find(b => b.name === vc.currentBranch);
    const parentCommit = currentBranch?.head || '';
    
    // 计算变更
    const changes: DiffResult[] = [];
    const wordCount = project.chapters?.reduce((sum, ch) => sum + (ch.content?.length || 0), 0) || 0;
    
    // 生成 commit id
    const commitId = `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newCommit: VersionCommit = {
      id: commitId,
      parent: parentCommit,
      message,
      author,
      timestamp: Date.now(),
      changes,
      wordCount
    };
    
    // 更新分支 head
    const updatedBranches = vc.branches.map(b => 
      b.name === vc.currentBranch ? { ...b, head: commitId } : b
    );
    
    const updatedProject: ProjectState = {
      ...project,
      versionControl: {
        ...vc,
        branches: updatedBranches,
        commits: [...vc.commits, newCommit]
      }
    };
    
    return { project: updatedProject, commitId };
  },
  
  // 创建分支
  createBranch(
    project: ProjectState,
    branchName: string,
    description: string = '',
    isExperiment: boolean = false
  ): ProjectState {
    const vc = project.versionControl!;
    const currentBranch = vc.branches.find(b => b.name === vc.currentBranch);
    
    const newBranch: VersionBranch = {
      name: branchName,
      head: currentBranch?.head || '',
      base: currentBranch?.head || '',
      description,
      createdAt: Date.now(),
      isExperiment
    };
    
    return {
      ...project,
      versionControl: {
        ...vc,
        branches: [...vc.branches, newBranch],
        currentBranch: branchName
      }
    };
  },
  
  // 切换分支
  switchBranch(project: ProjectState, branchName: string): ProjectState {
    const vc = project.versionControl!;
    const branch = vc.branches.find(b => b.name === branchName);
    
    if (!branch) {
      throw new Error(`分支 ${branchName} 不存在`);
    }
    
    return {
      ...project,
      versionControl: {
        ...vc,
        currentBranch: branchName
      }
    };
  },
  
  // 获取提交历史
  getCommitHistory(project: ProjectState, branchName?: string): VersionCommit[] {
    const vc = project.versionControl!;
    const branch = vc.branches.find(b => b.name === (branchName || vc.currentBranch));
    
    if (!branch) return [];
    
    const history: VersionCommit[] = [];
    let currentId = branch.head;
    
    while (currentId) {
      const commit = vc.commits.find(c => c.id === currentId);
      if (!commit) break;
      
      history.push(commit);
      currentId = commit.parent;
    }
    
    return history;
  },
  
  // 比较两个提交之间的差异
  compareCommits(
    project: ProjectState,
    fromCommitId: string,
    toCommitId: string
  ): DiffResult[] {
    // 简化实现：返回空差异
    return [];
  },
  
  // 自动保存（创建自动提交）
  autoSave(project: ProjectState): ProjectState {
    const vc = project.versionControl;
    if (!vc) {
      return this.initialize(project);
    }
    
    const wordCount = project.chapters?.reduce((sum, ch) => sum + (ch.content?.length || 0), 0) || 0;
    const lastCommit = vc.commits[vc.commits.length - 1];
    
    // 如果字数变化小于100，不创建新提交
    if (lastCommit && Math.abs(lastCommit.wordCount - wordCount) < 100) {
      return project;
    }
    
    const { project: updatedProject } = this.commit(
      project,
      `自动保存 - ${wordCount} 字`,
      '系统'
    );
    
    return updatedProject;
  },
  
  // 清理旧提交（保留最近50个）
  cleanupCommits(project: ProjectState): ProjectState {
    const vc = project.versionControl!;
    
    if (vc.commits.length <= 50) return project;
    
    const recentCommits = vc.commits.slice(-50);
    const keptIds = new Set(recentCommits.map(c => c.id));
    
    // 更新分支 head
    const updatedBranches = vc.branches.map(b => {
      if (!keptIds.has(b.head)) {
        // 如果 head 被清理，指向最新的提交
        return { ...b, head: recentCommits[recentCommits.length - 1].id };
      }
      return b;
    });
    
    return {
      ...project,
      versionControl: {
        ...vc,
        commits: recentCommits,
        branches: updatedBranches
      }
    };
  }
};
