import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Project API
export interface Project {
  id: string;
  name: string;
  type: string;
  targetDuration: number;
  targetStyle?: string;
  targetAudience?: string;
  notes?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  type: string;
  targetDuration: number;
  targetStyle?: string;
  targetAudience?: string;
  notes?: string;
}

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
}

export interface ListProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const projectApi = {
  list: (params?: ListProjectsParams) => 
    api.get<ListProjectsResponse>('/projects', { params }),
  
  get: (id: string, includeRelations = false) => 
    api.get<Project>(`/projects/${id}`, { params: { includeRelations } }),
  
  create: (data: CreateProjectData) => 
    api.post<Project>('/projects', data),
  
  update: (id: string, data: Partial<CreateProjectData>) => 
    api.put<Project>(`/projects/${id}`, data),
  
  duplicate: (id: string) => 
    api.post<Project>(`/projects/${id}/duplicate`),
  
  delete: (id: string) => 
    api.delete(`/projects/${id}`),
  
  archive: (id: string) => 
    api.post<Project>(`/projects/${id}/archive`),
};

// Story API
export interface Story {
  id: string;
  projectId: string;
  hook?: string;
  middleStructure?: string;
  ending?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStoryData {
  hook?: string;
  middleStructure?: string;
  ending?: string;
}

export const storyApi = {
  get: (projectId: string) => 
    api.get<Story>(`/projects/${projectId}/story`),
  
  update: (projectId: string, data: UpdateStoryData) => 
    api.put<Story>(`/projects/${projectId}/story`, data),
  
  getVersions: (projectId: string) => 
    api.get<Story[]>(`/projects/${projectId}/story/versions`),
};

// Scene API
export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  title: string;
  description?: string;
  estimatedDuration?: number;
  voiceoverText?: string;
  dialogueText?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSceneData {
  title: string;
  description?: string;
  estimatedDuration?: number;
  voiceoverText?: string;
  dialogueText?: string;
  notes?: string;
}

export const sceneApi = {
  list: (projectId: string) => 
    api.get<Scene[]>(`/projects/${projectId}/scenes`),
  
  get: (id: string, includeShots = false) => 
    api.get<Scene>(`/scenes/${id}`, { params: { includeShots } }),
  
  create: (projectId: string, data: CreateSceneData) => 
    api.post<Scene>(`/projects/${projectId}/scenes`, data),
  
  update: (id: string, data: Partial<CreateSceneData>) => 
    api.put<Scene>(`/scenes/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/scenes/${id}`),
  
  getVersions: (id: string) => 
    api.get<Scene[]>(`/scenes/${id}/versions`),
};

// Shot API
export interface Shot {
  id: string;
  projectId: string;
  sceneId: string;
  shotId: string;
  sequenceNumber: number;
  duration: number;
  shotType: 'wide' | 'medium' | 'closeup' | 'transition';
  description?: string;
  environment?: string;
  subject?: string;
  action?: string;
  cameraMovement?: string;
  lighting?: string;
  style?: string;
  previousShotId?: string | null;
  nextShotId?: string | null;
  transitionType?: 'cut' | 'dissolve' | 'motion';
  useLastFrameAsFirst?: boolean;
  relatedVoiceover?: string;
  importance?: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

export interface CreateShotData {
  sceneId: string;
  shotId: string;
  duration: number;
  shotType: 'wide' | 'medium' | 'closeup' | 'transition';
  description?: string;
  environment?: string;
  subject?: string;
  action?: string;
  cameraMovement?: string;
  lighting?: string;
  style?: string;
  previousShotId?: string | null;
  nextShotId?: string | null;
  transitionType?: 'cut' | 'dissolve' | 'motion';
  useLastFrameAsFirst?: boolean;
  relatedVoiceover?: string;
  importance?: 'high' | 'medium' | 'low';
}

export interface BatchStyleData {
  style?: string;
  lighting?: string;
  cameraMovement?: string;
}

export interface TransitionData {
  previousShotId?: string | null;
  nextShotId?: string | null;
  transitionType: 'cut' | 'dissolve' | 'motion';
  useLastFrameAsFirst: boolean;
}

export const shotApi = {
  list: (projectId: string) => 
    api.get<Shot[]>(`/projects/${projectId}/shots`),
  
  get: (id: string, includeRelations = false) => 
    api.get<Shot>(`/shots/${id}`, { params: { includeRelations } }),
  
  create: (projectId: string, data: CreateShotData) => 
    api.post<Shot>(`/projects/${projectId}/shots`, data),
  
  update: (id: string, data: Partial<CreateShotData>) => 
    api.put<Shot>(`/shots/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/shots/${id}`),
  
  reorder: (shotIds: string[]) => 
    api.put<Shot[]>('/shots/reorder', { shotIds }),
  
  batchUpdateStyle: (shotIds: string[], styleData: BatchStyleData) => 
    api.put<Shot[]>('/shots/batch-style', { shotIds, ...styleData }),
  
  setTransition: (id: string, transitionData: TransitionData) => 
    api.put<Shot>(`/shots/${id}/transition`, transitionData),
  
  exportStoryboard: (projectId: string, format: 'json' | 'csv' = 'json') => 
    api.get(`/projects/${projectId}/shots/export`, { 
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json'
    }),
};

// Keyframe API
export interface Keyframe {
  id: string;
  shotId: string;
  version: number;
  prompt: string;
  negativePrompt?: string;
  workflowName: string;
  steps: number;
  cfg: number;
  sampler: string;
  width: number;
  height: number;
  seed: number;
  imagePath: string;
  isSelected: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  comfyuiTaskId?: string;
  createdAt: string;
}

export interface GenerateKeyframeParams {
  workflowName: string;
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface KeyframeStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

export const keyframeApi = {
  list: (shotId: string) => 
    api.get<Keyframe[]>(`/shots/${shotId}/keyframes`),
  
  get: (id: string) => 
    api.get<Keyframe>(`/keyframes/${id}`),
  
  getPrompt: (shotId: string) => 
    api.get<{ prompt: string }>(`/shots/${shotId}/prompt`),
  
  generate: (shotId: string, params: GenerateKeyframeParams) => 
    api.post<Keyframe[]>(`/shots/${shotId}/generate-keyframes`, params),
  
  select: (id: string) => 
    api.put<Keyframe>(`/keyframes/${id}/select`),
  
  getStatus: (id: string) => 
    api.get<KeyframeStatus>(`/keyframes/${id}/status`),
};

// Workflow API
export interface WorkflowParameter {
  name: string;
  displayName: string;
  type: 'number' | 'string' | 'select';
  defaultValue: any;
  options?: any[];
  min?: number;
  max?: number;
  step?: number;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  displayName: string;
  type: 'text_to_image' | 'image_to_video' | 'text_to_video';
  parameters: WorkflowParameter[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const workflowApi = {
  list: (type?: string) => 
    api.get<{ success: boolean; data: WorkflowConfig[]; count: number }>('/workflows', { 
      params: { type } 
    }),
  
  get: (name: string) => 
    api.get<{ success: boolean; data: WorkflowConfig }>(`/workflows/${name}`),
  
  reload: () => 
    api.post<{ success: boolean; data: any; message: string }>('/workflows/reload'),
};

// Clip API
export interface Clip {
  id: string;
  shotId: string;
  version: number;
  inputMode: 'image_to_video' | 'text_to_video';
  keyframeId?: string;
  prompt: string;
  workflowName: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  cfg: number;
  seed: number;
  useLastFrameReference: boolean;
  referenceClipId?: string;
  referenceFrameNumber?: number;
  mode: 'demo' | 'production';
  videoPath?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  comfyuiTaskId?: string;
  isSelected: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface GenerateClipParams {
  inputMode: 'image_to_video' | 'text_to_video';
  keyframeId?: string;
  prompt?: string;
  workflowName: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  cfg?: number;
  seed?: number;
  useLastFrameReference?: boolean;
  referenceClipId?: string;
  referenceFrameNumber?: number;
  mode?: 'demo' | 'production';
}

export interface ClipStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoPath?: string;
}

export interface FrameMismatchResult {
  hasMismatch: boolean;
  similarity: number;
  message: string;
}

export const clipApi = {
  list: (shotId: string) => 
    api.get<Clip[]>(`/shots/${shotId}/clips`),
  
  get: (id: string) => 
    api.get<Clip>(`/clips/${id}`),
  
  generate: (shotId: string, params: GenerateClipParams) => 
    api.post<Clip>(`/shots/${shotId}/generate-clip`, params),
  
  select: (id: string) => 
    api.put<Clip>(`/clips/${id}/select`),
  
  getStatus: (id: string) => 
    api.get<ClipStatus>(`/clips/${id}/status`),
  
  extractFrame: (id: string, frameNumber: number) => 
    api.post<{ framePath: string }>(`/clips/${id}/extract-frame`, { frameNumber }),
  
  detectMismatch: (clip1Id: string, clip2Id: string) => 
    api.post<FrameMismatchResult>('/clips/detect-mismatch', { clip1Id, clip2Id }),
};

export { api };
export default api;
