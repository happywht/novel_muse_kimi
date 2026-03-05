/**
 * Version Control Panel - 版本控制面板
 * Phase 1 Week 4: Git-like 分支管理
 */

import React, { useState } from 'react';
import { ProjectState, VersionBranch, VersionCommit } from '../types';
import { versionControlService } from '../services/versionControlService';
import { 
  GitBranch, 
  GitCommit, 
  Plus, 
  ArrowLeftRight,
  Save,
  Clock,
  X,
  Trash2,
  History,
  AlertCircle
} from 'lucide-react';

interface VersionControlPanelProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  project,
  updateProject,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'commits' | 'branches'>('commits');
  const [showNewBranchForm, setShowNewBranchForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [isExperiment, setIsExperiment] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitForm, setShowCommitForm] = useState(false);

  // 确保版本控制已初始化
  const ensureVC = () => {
    if (!project.versionControl) {
      const initialized = versionControlService.initialize(project);
      updateProject({ versionControl: initialized.versionControl });
      return initialized;
    }
    return project;
  };

  // 获取当前分支
  const currentBranch = project.versionControl?.branches.find(
    b => b.name === project.versionControl?.currentBranch
  );

  // 获取提交历史
  const commitHistory = project.versionControl 
    ? versionControlService.getCommitHistory(project)
    : [];

  // 创建分支
  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    
    const updated = versionControlService.createBranch(
      ensureVC(),
      newBranchName,
      newBranchDesc,
      isExperiment
    );
    
    updateProject({ versionControl: updated.versionControl });
    setNewBranchName('');
    setNewBranchDesc('');
    setIsExperiment(false);
    setShowNewBranchForm(false);
  };

  // 切换分支
  const handleSwitchBranch = (branchName: string) => {
    const updated = versionControlService.switchBranch(ensureVC(), branchName);
    updateProject({ versionControl: updated.versionControl });
  };

  // 创建提交
  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    
    const { project: updated } = versionControlService.commit(
      ensureVC(),
      commitMessage
    );
    
    updateProject({ versionControl: updated.versionControl });
    setCommitMessage('');
    setShowCommitForm(false);
  };

  // 自动保存
  const handleAutoSave = () => {
    const updated = versionControlService.autoSave(ensureVC());
    updateProject({ versionControl: updated.versionControl });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 animate-slide-in-right flex flex-col">
      {/* 头部 */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-violet-400" />
          <h3 className="font-bold text-white">版本控制</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 当前分支信息 */}
      <div className="px-4 py-3 bg-violet-900/20 border-b border-violet-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-violet-400" />
            <span className="text-sm font-medium text-violet-300">
              {currentBranch?.name || 'main'}
            </span>
            {currentBranch?.isExperiment && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                实验
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {commitHistory.length} 个提交
          </span>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('commits')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'commits'
              ? 'text-violet-400 border-b-2 border-violet-400 bg-violet-400/5'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          提交历史
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'branches'
              ? 'text-violet-400 border-b-2 border-violet-400 bg-violet-400/5'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          分支
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {activeTab === 'commits' ? (
          <div className="space-y-4">
            {/* 提交按钮 */}
            {!showCommitForm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCommitForm(true)}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <GitCommit size={16} />
                  手动提交
                </button>
                <button
                  onClick={handleAutoSave}
                  className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  title="自动保存"
                >
                  <Save size={16} />
                </button>
              </div>
            ) : (
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-2">
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="提交信息..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCommitForm(false)}
                    className="flex-1 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={!commitMessage.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    提交
                  </button>
                </div>
              </div>
            )}

            {/* 提交历史列表 */}
            <div className="space-y-2">
              {commitHistory.map((commit, idx) => (
                <div
                  key={commit.id}
                  className="relative pl-6 pb-4 last:pb-0"
                >
                  {/* 时间线 */}
                  {idx < commitHistory.length - 1 && (
                    <div className="absolute left-[9px] top-4 bottom-0 w-[2px] bg-slate-800" />
                  )}
                  
                  {/* 节点 */}
                  <div className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    idx === 0 
                      ? 'bg-violet-500 border-violet-400' 
                      : 'bg-slate-800 border-slate-600'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      idx === 0 ? 'bg-white' : 'bg-slate-500'
                    }`} />
                  </div>
                  
                  {/* 内容 */}
                  <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-sm text-slate-200 font-medium">
                      {commit.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{commit.author}</span>
                      <span>·</span>
                      <span>{new Date(commit.timestamp).toLocaleDateString()}</span>
                      {commit.wordCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{commit.wordCount.toLocaleString()} 字</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {commitHistory.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  <History size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无提交记录</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 新建分支按钮 */}
            {!showNewBranchForm ? (
              <button
                onClick={() => setShowNewBranchForm(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} />
                新建分支
              </button>
            ) : (
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-3">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="分支名称"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  autoFocus
                />
                <input
                  type="text"
                  value={newBranchDesc}
                  onChange={(e) => setNewBranchDesc(e.target.value)}
                  placeholder="描述（可选）"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={isExperiment}
                    onChange={(e) => setIsExperiment(e.target.checked)}
                    className="rounded bg-slate-700 border-slate-600"
                  />
                  标记为实验分支
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewBranchForm(false)}
                    className="flex-1 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateBranch}
                    disabled={!newBranchName.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}

            {/* 分支列表 */}
            <div className="space-y-2">
              {project.versionControl?.branches.map(branch => (
                <div
                  key={branch.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    branch.name === project.versionControl?.currentBranch
                      ? 'bg-violet-900/20 border-violet-500/30'
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch size={14} className={
                        branch.name === project.versionControl?.currentBranch
                          ? 'text-violet-400'
                          : 'text-slate-500'
                      } />
                      <span className={`text-sm font-medium ${
                        branch.name === project.versionControl?.currentBranch
                          ? 'text-violet-300'
                          : 'text-slate-300'
                      }`}>
                        {branch.name}
                      </span>
                      {branch.isExperiment && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                          实验
                        </span>
                      )}
                    </div>
                    
                    {branch.name !== project.versionControl?.currentBranch && (
                      <button
                        onClick={() => handleSwitchBranch(branch.name)}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="切换到该分支"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                    )}
                  </div>
                  
                  {branch.description && (
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      {branch.description}
                    </p>
                  )}
                  
                  <p className="text-[10px] text-slate-600 mt-1 ml-6">
                    创建于 {new Date(branch.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              
              {!project.versionControl?.branches.length && (
                <div className="text-center py-8 text-slate-600">
                  <GitBranch size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无分支</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
