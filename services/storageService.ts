/**
 * Storage Service - IndexedDB / localStorage 封装
 * Phase 1: 核心写作体验
 */

export const STORAGE_KEYS = {
  PROJECTS: 'muse_projects',
  SETTINGS: 'muse_settings',
  GEMINI_API_KEY: 'gemini_api_key',
  GLM_API_KEY: 'glm_api_key',
  WRITING_HISTORY: 'muse_writing_history',
} as const;

// 检查 IndexedDB 可用性
const isIndexedDBAvailable = () => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

// IndexedDB 初始化
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NovelMuseDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chapters')) {
        db.createObjectStore('chapters', { keyPath: 'id' });
      }
    };
  });
};

export const storageService = {
  // 获取数据
  async getItem<T>(key: string): Promise<T | null> {
    // 优先尝试 IndexedDB
    if (isIndexedDBAvailable()) {
      try {
        const db = await initDB();
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.get(key);
        
        return new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result?.data || null);
          request.onerror = () => resolve(null);
        });
      } catch (e) {
        console.warn('IndexedDB failed, falling back to localStorage');
      }
    }
    
    // 降级到 localStorage
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },

  // 设置数据
  async setItem<T>(key: string, data: T): Promise<void> {
    // 优先尝试 IndexedDB
    if (isIndexedDBAvailable()) {
      try {
        const db = await initDB();
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        store.put({ id: key, data, timestamp: Date.now() });
        return;
      } catch (e) {
        console.warn('IndexedDB failed, falling back to localStorage');
      }
    }
    
    // 降级到 localStorage
    localStorage.setItem(key, JSON.stringify(data));
  },

  // 删除数据
  async removeItem(key: string): Promise<void> {
    if (isIndexedDBAvailable()) {
      try {
        const db = await initDB();
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        store.delete(key);
        return;
      } catch (e) {
        console.warn('IndexedDB delete failed');
      }
    }
    localStorage.removeItem(key);
  },

  // 从 localStorage 迁移 (用于旧数据迁移)
  async migrateFromLocalStorage(key: string): Promise<boolean> {
    if (!isIndexedDBAvailable()) return false;
    
    try {
      const localData = localStorage.getItem(key);
      if (!localData) return false;
      
      const parsed = JSON.parse(localData);
      await storageService.setItem(key, parsed);
      console.log('✅ Migrated data from localStorage to IndexedDB');
      return true;
    } catch (e) {
      return false;
    }
  },

  // 清理旧版 localStorage (迁移后调用)
  removeLegacyItem(key: string): void {
    // 保留 localStorage 作为备份，不清除
    // localStorage.removeItem(key);
  }
};

// 导出便捷方法
export const getStorageItem = storageService.getItem;
export const setStorageItem = storageService.setItem;
