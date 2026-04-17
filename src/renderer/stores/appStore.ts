import { create } from 'zustand';
import type { ViewName } from '../types';
import type { ServiceSummary } from '../../shared/types';

/** Services whose data is not affected by region switching */
export const GLOBAL_SERVICES = ['s3', 'iam', 'cloudfront', 'route53'];

interface ServiceError {
  serviceName: string;
  message: string;
}

interface AppStoreState {
  currentRegion: string;
  lastRefreshTime: number | null;
  isRefreshing: boolean;
  currentView: ViewName;
  serviceSummaries: ServiceSummary[];
  refreshErrors: ServiceError[];

  setCurrentRegion: (region: string) => void;
  setLastRefreshTime: (time: number | null) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setCurrentView: (view: ViewName) => void;
  setServiceSummaries: (summaries: ServiceSummary[]) => void;
  switchRegion: (region: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshService: (serviceName: string) => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentRegion: 'us-east-1',
  lastRefreshTime: null,
  isRefreshing: false,
  currentView: 'dashboard',
  serviceSummaries: [],
  refreshErrors: [],

  setCurrentRegion: (region: string) => set({ currentRegion: region }),
  setLastRefreshTime: (time: number | null) => set({ lastRefreshTime: time }),
  setIsRefreshing: (refreshing: boolean) => set({ isRefreshing: refreshing }),
  setCurrentView: (view: ViewName) => set({ currentView: view }),
  setServiceSummaries: (summaries: ServiceSummary[]) => set({ serviceSummaries: summaries }),

  switchRegion: async (region: string) => {
    const prev = get().serviceSummaries;
    set({ currentRegion: region });
    try {
      await window.electronAPI.region.switch(region);
      // After region switch, refresh dashboard data.
      // Global services keep their previous data; non-global services get refreshed.
      set({ isRefreshing: true });
      try {
        const result = await window.electronAPI.refresh.all();
        const merged = result.summaries.map((s) => {
          if (GLOBAL_SERVICES.includes(s.serviceName)) {
            const old = prev.find((p) => p.serviceName === s.serviceName);
            return old ?? s;
          }
          return s;
        });
        set({ serviceSummaries: merged, lastRefreshTime: result.timestamp });
      } finally {
        set({ isRefreshing: false });
      }
    } catch {
      // If region switch fails, keep previous state
    }
  },

  refreshAll: async () => {
    set({ isRefreshing: true, refreshErrors: [] });
    try {
      const result = await window.electronAPI.refresh.all();
      set({
        serviceSummaries: result.summaries,
        lastRefreshTime: result.timestamp,
        refreshErrors: [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新数据失败';
      set({ refreshErrors: [{ serviceName: 'all', message }] });
    } finally {
      set({ isRefreshing: false });
    }
  },

  refreshService: async (serviceName: string) => {
    try {
      const result = await window.electronAPI.refresh.service(serviceName);
      if (result.error) {
        set((state) => ({
          refreshErrors: [
            ...state.refreshErrors.filter((e) => e.serviceName !== serviceName),
            { serviceName, message: result.error!.message },
          ],
        }));
      } else {
        // Clear error for this service on success
        set((state) => ({
          refreshErrors: state.refreshErrors.filter((e) => e.serviceName !== serviceName),
          lastRefreshTime: Date.now(),
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `刷新 ${serviceName} 失败`;
      set((state) => ({
        refreshErrors: [
          ...state.refreshErrors.filter((e) => e.serviceName !== serviceName),
          { serviceName, message },
        ],
      }));
    }
  },
}));
