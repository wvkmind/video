export interface DependentEntity {
  entityType: 'story' | 'scene' | 'shot' | 'keyframe' | 'clip';
  entityId: string;
  entityName: string;
  status: string;
}

export interface ImpactAnalysis {
  directDependents: DependentEntity[];
  indirectDependents: DependentEntity[];
  totalAffected: number;
}

/**
 * Check the downstream impact of modifying an entity
 */
export async function checkDownstreamImpact(
  entityType: 'story' | 'scene' | 'shot' | 'keyframe',
  entityId: string
): Promise<ImpactAnalysis> {
  const response = await fetch(`/api/dependencies/${entityType}/${entityId}/impact`);
  
  if (!response.ok) {
    throw new Error('Failed to check downstream impact');
  }
  
  return response.json();
}

/**
 * Get direct dependents of an entity
 */
export async function getDependentEntities(
  entityType: 'story' | 'scene' | 'shot' | 'keyframe',
  entityId: string
): Promise<DependentEntity[]> {
  const response = await fetch(`/api/dependencies/${entityType}/${entityId}/dependents`);
  
  if (!response.ok) {
    throw new Error('Failed to get dependent entities');
  }
  
  const data = await response.json();
  return data.dependents;
}

/**
 * Hook to show modification confirmation dialog before making changes
 */
export function useModificationConfirm() {
  return {
    checkImpact: checkDownstreamImpact,
    getDependents: getDependentEntities
  };
}
