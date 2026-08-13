import { createContext, useContext } from 'react';
import type { ToastTone } from '@/shared/components/Toast';

export type AdminNotify = (message: string, tone?: ToastTone) => void;

/** Editors also render in isolation (tests). No-op until a host provides a toast. */
export const AdminNotifyContext = createContext<AdminNotify>(() => {});

export function useAdminNotify(): AdminNotify {
  return useContext(AdminNotifyContext);
}
