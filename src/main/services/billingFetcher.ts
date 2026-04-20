import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type ResultByTime,
} from '@aws-sdk/client-cost-explorer';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface FetchResult<T> {
  data: T;
  timestamp: number;
  region: string;
  error?: { code: string; message: string };
}

interface ClientConfig {
  credentials: { accessKeyId: string; secretAccessKey: string };
  region: string;
}

interface ServiceCost {
  serviceName: string;
  cost: number;
}

interface DailyCostData {
  date: string;    // YYYY-MM-DD
  amount: number;
}

interface BillingDashboardData {
  currentMonthServiceCosts: ServiceCost[];
  totalCost: number;
  currency: string;
  previousMonthTotal: number;
  changePercentage: number;
  dailyCosts: DailyCostData[];
  previousMonthServiceCosts: ServiceCost[];
}

interface BillingSummary {
  totalCost: number;
  currency: string;
  period: string;
  serviceCosts: ServiceCost[];
  previousMonthComparison: {
    previousTotal: number;
    changePercentage: number;
  };
}

/**
 * Calculate the percentage change between current and previous values.
 * Returns null when previous is 0 to avoid division by zero.
 * Exported for testability.
 */
export function calculateChangePercentage(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

/** Helper to get YYYY-MM-DD string from a Date. */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The cost metric used for all Cost Explorer queries.
 * UnblendedCost matches the AWS Console Billing & Cost Management dashboard,
 * which shows the actual usage cost before any RI/SP amortization.
 */
const COST_METRIC = 'UnblendedCost';

/**
 * Fetch billing data from AWS Cost Explorer.
 * Retrieves current month costs grouped by service and previous month total for comparison.
 * Uses AmortizedCost to match the AWS Console Billing page.
 */
export async function fetchBillingData(
  clientConfig: ClientConfig,
): Promise<FetchResult<BillingSummary>> {
  try {
    const ce = new CostExplorerClient({
      credentials: clientConfig.credentials,
      region: 'us-east-1', // Cost Explorer is only available in us-east-1
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch current month costs grouped by service
    const currentResponse = await ce.send(
      new GetCostAndUsageCommand({
        TimePeriod: {
          Start: formatDate(currentMonthStart),
          End: formatDate(currentMonthEnd),
        },
        Granularity: 'MONTHLY',
        Metrics: [COST_METRIC],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      }),
    );

    // Fetch previous month total
    const previousResponse = await ce.send(
      new GetCostAndUsageCommand({
        TimePeriod: {
          Start: formatDate(previousMonthStart),
          End: formatDate(previousMonthEnd),
        },
        Granularity: 'MONTHLY',
        Metrics: [COST_METRIC],
      }),
    );

    // Parse current month service costs
    const serviceCosts: ServiceCost[] = [];
    let totalCost = 0;
    let currency = 'USD';

    const groups = currentResponse.ResultsByTime?.[0]?.Groups ?? [];
    for (const group of groups) {
      const name = group.Keys?.[0] ?? 'Unknown';
      const amount = parseFloat(group.Metrics?.[COST_METRIC]?.Amount ?? '0');
      currency = group.Metrics?.[COST_METRIC]?.Unit ?? 'USD';
      serviceCosts.push({ serviceName: name, cost: amount });
      totalCost += amount;
    }

    // Sort by cost descending
    serviceCosts.sort((a, b) => b.cost - a.cost);

    // Parse previous month total
    const previousTotal = parseFloat(
      previousResponse.ResultsByTime?.[0]?.Total?.[COST_METRIC]?.Amount ?? '0',
    );

    const changePercentage = calculateChangePercentage(totalCost, previousTotal);

    const period = `${formatDate(currentMonthStart)} ~ ${formatDate(now)}`;

    return {
      data: {
        totalCost,
        currency,
        period,
        serviceCosts,
        previousMonthComparison: {
          previousTotal,
          changePercentage: changePercentage ?? 0,
        },
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    const code = err.name ?? 'UnknownError';

    // Handle Cost Explorer not enabled
    if (code === 'DataUnavailableException' || err.message?.includes('Cost Explorer')) {
      return {
        data: {
          totalCost: 0,
          currency: 'USD',
          period: '',
          serviceCosts: [],
          previousMonthComparison: { previousTotal: 0, changePercentage: 0 },
        },
        timestamp: Date.now(),
        region: clientConfig.region,
        error: {
          code: 'CostExplorerNotEnabled',
          message: '当前 AWS 账户未启用 Cost Explorer，请在 AWS 控制台中启用后重试',
        },
      };
    }

    return {
      data: {
        totalCost: 0,
        currency: 'USD',
        period: '',
        serviceCosts: [],
        previousMonthComparison: { previousTotal: 0, changePercentage: 0 },
      },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code,
        message: err.message ?? '获取账单数据失败',
      },
    };
  }
}


/**
 * Parse Cost Explorer DAILY response into DailyCostData array.
 * Output is sorted by date ascending.
 * Exported for unit testing.
 */
export function parseDailyResponse(
  resultsByTime: ResultByTime[],
): DailyCostData[] {
  const dailyCosts: DailyCostData[] = resultsByTime.map((entry) => ({
    date: entry.TimePeriod?.Start ?? '',
    amount: parseFloat(entry.Total?.UnblendedCost?.Amount ?? '0'),
  }));

  // Sort by date ascending
  dailyCosts.sort((a, b) => a.date.localeCompare(b.date));

  return dailyCosts;
}

/**
 * Fetch all billing data needed for the Dashboard enhancement.
 * Issues 4 parallel Cost Explorer API calls using AmortizedCost
 * to match the AWS Console Billing page.
 */
export async function fetchBillingDashboardData(
  clientConfig: ClientConfig,
): Promise<FetchResult<BillingDashboardData>> {
  try {
    const ce = new CostExplorerClient({
      credentials: clientConfig.credentials,
      region: 'us-east-1',
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthStartStr = formatDate(currentMonthStart);
    const currentMonthEndStr = formatDate(currentMonthEnd);
    const previousMonthStartStr = formatDate(previousMonthStart);
    const previousMonthEndStr = formatDate(previousMonthEnd);

    // Issue 4 parallel API calls
    const [
      currentByServiceRes,
      previousTotalRes,
      currentDailyRes,
      previousByServiceRes,
    ] = await Promise.all([
      // 1. Current month by service
      ce.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: currentMonthStartStr, End: currentMonthEndStr },
          Granularity: 'MONTHLY',
          Metrics: [COST_METRIC],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
        }),
      ),
      // 2. Previous month total
      ce.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: previousMonthStartStr, End: previousMonthEndStr },
          Granularity: 'MONTHLY',
          Metrics: [COST_METRIC],
        }),
      ),
      // 3. Current month daily
      ce.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: currentMonthStartStr, End: currentMonthEndStr },
          Granularity: 'DAILY',
          Metrics: [COST_METRIC],
        }),
      ),
      // 4. Previous month by service
      ce.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: previousMonthStartStr, End: previousMonthEndStr },
          Granularity: 'MONTHLY',
          Metrics: [COST_METRIC],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
        }),
      ),
    ]);

    // Parse current month service costs
    const currentMonthServiceCosts: ServiceCost[] = [];
    let totalCost = 0;
    let currency = 'USD';

    const currentGroups = currentByServiceRes.ResultsByTime?.[0]?.Groups ?? [];
    for (const group of currentGroups) {
      const name = group.Keys?.[0] ?? 'Unknown';
      const amount = parseFloat(group.Metrics?.[COST_METRIC]?.Amount ?? '0');
      currency = group.Metrics?.[COST_METRIC]?.Unit ?? 'USD';
      currentMonthServiceCosts.push({ serviceName: name, cost: amount });
      totalCost += amount;
    }
    currentMonthServiceCosts.sort((a, b) => b.cost - a.cost);

    // Parse previous month total
    const previousMonthTotal = parseFloat(
      previousTotalRes.ResultsByTime?.[0]?.Total?.[COST_METRIC]?.Amount ?? '0',
    );

    // Calculate change percentage
    const changePercentage = calculateChangePercentage(totalCost, previousMonthTotal) ?? 0;

    // Parse daily costs
    const dailyCosts = parseDailyResponse(currentDailyRes.ResultsByTime ?? []);

    // Parse previous month service costs
    const previousMonthServiceCosts: ServiceCost[] = [];
    const previousGroups = previousByServiceRes.ResultsByTime?.[0]?.Groups ?? [];
    for (const group of previousGroups) {
      const name = group.Keys?.[0] ?? 'Unknown';
      const amount = parseFloat(group.Metrics?.[COST_METRIC]?.Amount ?? '0');
      previousMonthServiceCosts.push({ serviceName: name, cost: amount });
    }
    previousMonthServiceCosts.sort((a, b) => b.cost - a.cost);

    return {
      data: {
        currentMonthServiceCosts,
        totalCost,
        currency,
        previousMonthTotal,
        changePercentage,
        dailyCosts,
        previousMonthServiceCosts,
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    const code = err.name ?? 'UnknownError';

    const emptyData: BillingDashboardData = {
      currentMonthServiceCosts: [],
      totalCost: 0,
      currency: 'USD',
      previousMonthTotal: 0,
      changePercentage: 0,
      dailyCosts: [],
      previousMonthServiceCosts: [],
    };

    // Handle Cost Explorer not enabled
    if (code === 'DataUnavailableException' || err.message?.includes('Cost Explorer')) {
      return {
        data: emptyData,
        timestamp: Date.now(),
        region: clientConfig.region,
        error: {
          code: 'CostExplorerNotEnabled',
          message: '当前 AWS 账户未启用 Cost Explorer，请在 AWS 控制台中启用后重试',
        },
      };
    }

    return {
      data: emptyData,
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code,
        message: err.message ?? '获取账单数据失败',
      },
    };
  }
}
