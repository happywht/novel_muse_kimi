/**
 * World Builder - 世界观构建器 (简化版)
 */

import React, { useState } from 'react';
import { ProjectState, WorldSetting } from '../types';
import { Globe, Plus, Trash2, Map, Sparkles, Users, Scroll } from 'lucide-react';

interface WorldBuilderProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

const CATEGORIES = [
  { id: 'Geography', label: '地理地貌', icon: Map },
  { id: 'Magic/Tech', label: '魔法/科技', icon: Sparkles },
  { id: 'Society', label: '社会人文', icon: Users },
  { id: 'History', label: '历史传说', icon: Scroll },
  { id: 'Other', label: '其他设定', icon: Globe },
] as const;

export const WorldBuilder: React.FC<WorldBuilderProps> = ({ project, updateProject }) => {
  const [selectedCategory, setSelectedCategory] = useState<WorldSetting['category']>('Geography');
  const [newItemTitle, setNewItemTitle] = useState('');

  const addSetting = () => {
    if (!newItemTitle.trim()) return;
    
    const newSetting: WorldSetting = {
      id: crypto.randomUUID(),
      category: selectedCategory,
      title: newItemTitle,
      content: '',
    };
    
    updateProject({
      worldSettings: [...project.worldSettings, newSetting]
    });
    setNewItemTitle('');
  };

  const updateSetting = (id: string, updates: Partial<WorldSetting>) => {
    updateProject({
      worldSettings: project.worldSettings.map(s => 
        s.id === id ? { ...s, ...updates } : s
      )
    });
  };

  const deleteSetting = (id: string) => {
    updateProject({
      worldSettings: project.worldSettings.filter(s => s.id !== id)
    });
  };

  const filteredSettings = project.worldSettings.filter(s => s.category === selectedCategory);

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      {/* 左侧分类 */}
      <div className="w-64 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Globe size={18} className="text-emerald-400" />
            世界观分类
          </h3>
        </div>
        
        <div className="flex-1 p-2 space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <cat.icon size={16} />
              <span className="text-sm">{cat.label}</span>
              <span className="ml-auto text-xs opacity-60">
                {project.worldSettings.filter(s => s.category === cat.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white">
            {CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="新设定名称..."
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white w-48"
              onKeyPress={(e) => e.key === 'Enter' && addSetting()}
            />
            <button
              onClick={addSetting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredSettings.map(setting => (
            <div key={setting.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={setting.title}
                  onChange={(e) => updateSetting(setting.id, { title: e.target.value })}
                  className="bg-transparent text-lg font-bold text-white border-none focus:ring-0 p-0 flex-1"
                />
                <button
                  onClick={() => deleteSetting(setting.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                value={setting.content}
                onChange={(e) => updateSetting(setting.id, { content: e.target.value })}
                placeholder="设定详细描述..."
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 h-32 resize-none focus:border-emerald-500/50 outline-none"
              />
            </div>
          ))}

          {filteredSettings.length === 0 && (
            <div className="text-center py-12 text-slate-600">
              <Globe size={48} className="mx-auto mb-4 opacity-30" />
              <p>暂无{categories.find(c => c.id === selectedCategory)?.label}设定</p>
              <p className="text-sm mt-1">点击右上角添加</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const categories = CATEGORIES;
