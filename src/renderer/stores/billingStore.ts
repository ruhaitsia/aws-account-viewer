import { create } from 'zustand';
import type { DailyCostData, ServiceGrowth } from '../../shared/types';
import {
  buildServiceCostMap,
  getTopGrowthServices,
  calculateForecast,
} from '../utils/billingUtils';

interface BillingStoreState {
  // 数据
  totalCost: number;
  currency: string;
  previousMonthTotal: number;
  changePercentage: number;
  dailyCosts: DailyCostData[];
  serviceCostMap: Record<string, number>;
  topGrowthServices: ServiceGrowth[];
  forecast: number | null;

  // 状态
  isLoading: boolean;
  error: string | null;
  costExplorerDisabled: boolean;

  // 操作
  loadBillingForDashboard: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  totalCost: 0,
  currency: 'USD',
  previousMonthTotal: 0,
  changePercentage: 0,
  dailyCosts: [] as DailyCostData[],
  serviceCostMap: {} as Record<string, number>,
  topGrowthServices: [] as ServiceGrowth[],
  forecast: null as number | null,
  isLoading: false,
  error: null as string | null,
  costExplorerDisabled: false,
};

export const useBillingStore = create<BillingStoreState>((set) => ({
  ...initialState,

  loadBillingForDashboard: async () => {
    set({ isLoading: true, error: null, costExplorerDisabled: false });
    try {
      const result = await window.electronAPI.billing.fetchDashboard();

      if (result.error) {
        const isCostExplorerDisabled = result.error.code === 'CostExplorerNotEnabled';
        set({
          isLoading: false,
          error: result.error.message,
          costExplorerDisabled: isCostExplorerDisabled,
        });
        return;
      }

      const { data } = result;

      // Compute derived data using billingUtils
      const serviceCostMap = buildServiceCostMap(data.currentMonthServiceCosts);
      const topGrowthServices = getTopGrowthServices(
        data.currentMonthServiceCosts,
        data.previousMonthServiceCosts,
      );

      // Calculate forecast: get total days in current month
      const now = new Date();
      const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const forecast = calculateForecast(data.dailyCosts, totalDaysInMonth);

      set({
        totalCost: data.totalCost,
        currency: data.currency,
        previousMonthTotal: data.previousMonthTotal,
        changePercentage: data.changePercentage,
        dailyCosts: data.dailyCosts,
        serviceCostMap,
        topGrowthServices,
        forecast,
        isLoading: false,
        error: null,
        costExplorerDisabled: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载费用数据失败';
      set({ error: message, isLoading: false });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
