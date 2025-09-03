import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Show a toast notification
 */
export const showToast = (
  message: string, 
  type: ToastType = 'info',
  duration: number = 5000
) => {
  const toastOptions = {
    duration,
    position: 'top-center' as const,
  };

  switch (type) {
    case 'success':
      toast.success(message, toastOptions);
      break;
    case 'error':
      toast.error(message, toastOptions);
      break;
    case 'warning':
      toast.warning(message, toastOptions);
      break;
    case 'info':
    default:
      toast.info(message, toastOptions);
      break;
  }
};
