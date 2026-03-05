/**
 * Loader - 加载动画组件
 */

import React from 'react';

interface LoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loader: React.FC<LoaderProps> = ({ 
  text = '加载中...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 border-2 border-slate-700 rounded-full" />
        <div className="absolute inset-0 border-2 border-violet-500 rounded-full border-t-transparent animate-spin" />
      </div>
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  );
};
