import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/Toast';

let toastId = 0;

/**
 * Toast 管理 Hook
 */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, message: string, duration?: number) => {
      const id = `toast-${++toastId}`;
      const newMessage: ToastMessage = {
        id,
        type,
        title,
        message,
        duration,
      };

      setMessages((prev) => [...prev, newMessage]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('success', title, message, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('error', title, message, duration || 7000); // 错误消息显示更久
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('warning', title, message, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('info', title, message, duration);
    },
    [addToast]
  );

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    success,
    error,
    warning,
    info,
    removeToast,
    clear,
  };
}
