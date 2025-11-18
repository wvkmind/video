/**
 * Simple in-memory cache manager for query results
 * For production, consider using Redis or similar
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all cached data matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or set cached data with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Clean expired entries every 10 minutes
setInterval(() => {
  cacheManager.cleanExpired();
}, 10 * 60 * 1000);

// Cache key generators for common queries
export const CacheKeys = {
  project: (id: string) => `project:${id}`,
  projectList: (filters?: any) => `project:list:${JSON.stringify(filters || {})}`,
  projectWithRelations: (id: string) => `project:relations:${id}`,
  
  shot: (id: string) => `shot:${id}`,
  shotList: (projectId: string) => `shot:list:${projectId}`,
  shotsByScene: (sceneId: string) => `shot:scene:${sceneId}`,
  
  scene: (id: string) => `scene:${id}`,
  sceneList: (projectId: string) => `scene:list:${projectId}`,
  
  keyframe: (id: string) => `keyframe:${id}`,
  keyframeList: (shotId: string) => `keyframe:list:${shotId}`,
  keyframeSelected: (shotId: string) => `keyframe:selected:${shotId}`,
  
  clip: (id: string) => `clip:${id}`,
  clipList: (shotId: string) => `clip:list:${shotId}`,
  clipSelected: (shotId: string) => `clip:selected:${shotId}`,
  
  timeline: (projectId: string) => `timeline:${projectId}`,
  timelineVersions: (projectId: string) => `timeline:versions:${projectId}`,
  
  workflow: (name: string) => `workflow:${name}`,
  workflowList: (type?: string) => `workflow:list:${type || 'all'}`,
  
  characterPreset: (id: string) => `character:${id}`,
  characterPresetList: (projectId: string) => `character:list:${projectId}`,
  
  stylePreset: (id: string) => `style:${id}`,
  stylePresetList: (projectId?: string) => `style:list:${projectId || 'global'}`,
};

// Cache invalidation helpers
export const CacheInvalidation = {
  project: (id: string) => {
    cacheManager.delete(CacheKeys.project(id));
    cacheManager.delete(CacheKeys.projectWithRelations(id));
    cacheManager.deletePattern(`^project:list:`);
  },
  
  shot: (shotId: string, projectId: string, sceneId?: string) => {
    cacheManager.delete(CacheKeys.shot(shotId));
    cacheManager.delete(CacheKeys.shotList(projectId));
    if (sceneId) {
      cacheManager.delete(CacheKeys.shotsByScene(sceneId));
    }
  },
  
  scene: (sceneId: string, projectId: string) => {
    cacheManager.delete(CacheKeys.scene(sceneId));
    cacheManager.delete(CacheKeys.sceneList(projectId));
  },
  
  keyframe: (keyframeId: string, shotId: string) => {
    cacheManager.delete(CacheKeys.keyframe(keyframeId));
    cacheManager.delete(CacheKeys.keyframeList(shotId));
    cacheManager.delete(CacheKeys.keyframeSelected(shotId));
  },
  
  clip: (clipId: string, shotId: string) => {
    cacheManager.delete(CacheKeys.clip(clipId));
    cacheManager.delete(CacheKeys.clipList(shotId));
    cacheManager.delete(CacheKeys.clipSelected(shotId));
  },
  
  timeline: (projectId: string) => {
    cacheManager.delete(CacheKeys.timeline(projectId));
    cacheManager.delete(CacheKeys.timelineVersions(projectId));
  },
};
