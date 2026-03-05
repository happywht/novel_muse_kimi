/**
 * Character Creator - 人物创建器 (简化版)
 */

import React, { useState } from 'react';
import { ProjectState, Character } from '../types';
import { Users, Plus, Trash2, User, MessageCircle } from 'lucide-react';

interface CharacterCreatorProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ project, updateProject }) => {
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('主角');

  const activeChar = project.characters.find(c => c.id === activeCharId);

  const addCharacter = () => {
    if (!newCharName.trim()) return;
    
    const newChar: Character = {
      id: crypto.randomUUID(),
      name: newCharName,
      role: newCharRole,
      archetype: '',
      description: '',
      relationships: ''
    };
    
    updateProject({ characters: [...project.characters, newChar] });
    setNewCharName('');
    setActiveCharId(newChar.id);
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    updateProject({
      characters: project.characters.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const deleteCharacter = (id: string) => {
    updateProject({
      characters: project.characters.filter(c => c.id !== id)
    });
    if (activeCharId === id) setActiveCharId(null);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      {/* 左侧角色列表 */}
      <div className="w-72 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-violet-400" />
            角色名录
          </h3>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="角色姓名"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              onKeyPress={(e) => e.key === 'Enter' && addCharacter()}
            />
          </div>
          <select
            value={newCharRole}
            onChange={(e) => setNewCharRole(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
          >
            <option value="主角">主角</option>
            <option value="反派">反派</option>
            <option value="导师">导师</option>
            <option value="配角">配角</option>
          </select>
          <button
            onClick={addCharacter}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            添加角色
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {project.characters.map(char => (
            <button
              key={char.id}
              onClick={() => setActiveCharId(char.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                activeCharId === char.id
                  ? 'bg-violet-600/20 border border-violet-500/50'
                  : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <User size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{char.name}</p>
                <p className="text-xs text-slate-500">{char.role}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}
                className="p-1.5 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden p-6">
        {activeChar ? (
          <div className="h-full flex flex-col">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-24 h-24 rounded-xl bg-slate-700 flex items-center justify-center">
                <User size={48} className="text-slate-600" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={activeChar.name}
                  onChange={(e) => updateCharacter(activeChar.id, { name: e.target.value })}
                  className="bg-transparent text-3xl font-bold text-white border-none focus:ring-0 p-0 w-full"
                />
                <select
                  value={activeChar.role}
                  onChange={(e) => updateCharacter(activeChar.id, { role: e.target.value })}
                  className="mt-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300"
                >
                  <option value="主角">主角</option>
                  <option value="反派">反派</option>
                  <option value="导师">导师</option>
                  <option value="配角">配角</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">角色档案</label>
                <textarea
                  value={activeChar.description}
                  onChange={(e) => updateCharacter(activeChar.id, { description: e.target.value })}
                  placeholder="外貌、性格、背景故事..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-300 h-48 resize-none focus:border-violet-500/50 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">人物关系</label>
                <textarea
                  value={activeChar.relationships || ''}
                  onChange={(e) => updateCharacter(activeChar.id, { relationships: e.target.value })}
                  placeholder="与其他角色的关系..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-300 h-24 resize-none focus:border-violet-500/50 outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <Users size={64} className="mb-4 opacity-30" />
            <p>选择或创建一个角色</p>
          </div>
        )}
      </div>
    </div>
  );
};
