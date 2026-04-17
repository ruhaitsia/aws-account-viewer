import { create } from 'zustand';
import type { ServiceSummary } from '../../shared/types';
import { useAppStore } from './appStore';

interface DashboardState {
  serviceSummaries: ServiceSummary[];
  isLoading: boolean;
  error: string | null;

  loadDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  serviceSummaries: [],
  isLoading: false,
  error: null,

  loadDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const summaries = await window.electronAPI.service.fetchDashboard();
      set({ serviceSummaries: summaries, isLoading: false });
      // Sync to appStore so ServiceNavigator can show counts
      useAppStore.getState().setServiceSummaries(summaries);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载 Dashboard 数据失败';
      set({ error: message, isLoading: false });
    }
  },
}));
