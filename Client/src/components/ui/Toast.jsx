import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useNotification();

  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#2FA84C] dark:text-[#3FCB63]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#C99A3E]" />,
    error: <XCircle className="w-5 h-5 text-[#B5533E]" />,
    info: <Info className="w-5 h-5 text-[#1F4D3A] dark:text-[#6CB095]" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start p-3 bg-[#EFEEE8] dark:bg-[#1B3A2C] border border-[#E1DFD7] dark:border-[#264A39] rounded-lg shadow-xl animate-in slide-in-from-bottom duration-200"
        >
          <div className="shrink-0 mt-0.5 mr-3">{icons[toast.type] || icons.info}</div>
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-[#14181A] dark:text-[#EDF3EC]">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-xs text-[#6B7168] dark:text-[#95A99B] mt-0.5">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-1 text-xs font-medium text-[#2FA84C] dark:text-[#3FCB63] hover:underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#6B7168] hover:text-[#14181A] dark:text-[#95A99B] dark:hover:text-[#EDF3EC] p-0.5 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
