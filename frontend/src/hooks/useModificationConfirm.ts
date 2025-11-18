import { useState, useCallback } from 'react';

interface UseModificationConfirmOptions {
  entityType: 'story' | 'scene' | 'shot' | 'keyframe';
  entityId: string;
  entityName: string;
  onConfirm: (refreshDownstream: boolean) => void | Promise<void>;
}

export function useModificationConfirm({
  entityType,
  entityId,
  entityName,
  onConfirm
}: UseModificationConfirmOptions) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const showConfirmDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(async (refreshDownstream: boolean) => {
    setIsDialogOpen(false);
    await onConfirm(refreshDownstream);
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return {
    isDialogOpen,
    showConfirmDialog,
    handleConfirm,
    handleCancel,
    dialogProps: {
      isOpen: isDialogOpen,
      entityType,
      entityId,
      entityName,
      onConfirm: handleConfirm,
      onCancel: handleCancel
    }
  };
}
