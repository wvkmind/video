import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { ErrorNotifier, ApiError } from '../utils/errorHandler';

interface ErrorContextValue {
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * 全局错误处理 Provider
 */
export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const toast = useToast();

  useEffect(() => {
    // 订阅 API 错误通知
    const unsubscribe = ErrorNotifier.subscribe((error: ApiError) => {
      // 自动显示错误 toast
      toast.error(
        `错误 (${error.code})`,
        error.getUserMessage()
      );
    });

    return unsubscribe;
  }, [toast]);

  const value: ErrorContextValue = {
    showError: (title: string, message: string) => {
      toast.error(title, message);
    },
    showSuccess: (title: string, message: string) => {
      toast.success(title, message);
    },
    showWarning: (title: string, message: string) => {
      toast.warning(title, message);
    },
    showInfo: (title: string, message: string) => {
      toast.info(title, message);
    },
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ToastContainer messages={toast.messages} onClose={toast.removeToast} />
    </ErrorContext.Provider>
  );
};

/**
 * 使用错误处理的 Hook
 */
export function useError(): ErrorContextValue {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
