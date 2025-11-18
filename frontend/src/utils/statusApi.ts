import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export interface StatusUpdateResponse {
  success: boolean;
  message: string;
}

/**
 * Update story status
 */
export async function updateStoryStatus(
  storyId: string,
  status: string
): Promise<StatusUpdateResponse> {
  const response = await axios.put(`${API_BASE_URL}/status/stories/${storyId}/status`, {
    status,
  });
  return response.data;
}

/**
 * Update scene status
 */
export async function updateSceneStatus(
  sceneId: string,
  status: string
): Promise<StatusUpdateResponse> {
  const response = await axios.put(`${API_BASE_URL}/status/scenes/${sceneId}/status`, {
    status,
  });
  return response.data;
}

/**
 * Update shot status
 */
export async function updateShotStatus(
  shotId: string,
  status: string
): Promise<StatusUpdateResponse> {
  const response = await axios.put(`${API_BASE_URL}/status/shots/${shotId}/status`, {
    status,
  });
  return response.data;
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<StatusUpdateResponse> {
  const response = await axios.put(`${API_BASE_URL}/status/projects/${projectId}/status`, {
    status,
  });
  return response.data;
}

/**
 * Batch update shot status
 */
export async function batchUpdateShotStatus(
  shotIds: string[],
  status: string
): Promise<StatusUpdateResponse> {
  const response = await axios.put(`${API_BASE_URL}/status/batch-status`, {
    shotIds,
    status,
  });
  return response.data;
}

/**
 * Get valid status transitions
 */
export async function getValidStatusTransitions(
  entityType: 'story' | 'scene' | 'shot' | 'project',
  currentStatus: string
): Promise<string[]> {
  const response = await axios.get(
    `${API_BASE_URL}/status/transitions/${entityType}/${currentStatus}`
  );
  return response.data.validTransitions;
}
