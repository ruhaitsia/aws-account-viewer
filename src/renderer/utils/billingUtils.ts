import type { DailyCostData, ServiceGrowth } from '../../shared/types';

/** Service cost entry used as input for several utility functions. */
interface ServiceCost {
  serviceName: string;
  cost: number;
}

/**
 * Mapping from AWS Cost Explorer service names to internal short service names.
 * AWS returns full names like "Amazon Elastic Compute Cloud - Compute",
 * while the dashboard uses short names like "ec2".
 *
 * This uses keyword-based fuzzy matching to handle the many name variants
 * that AWS Cost Explorer can return.
 */

/** Keyword rules for matching AWS service names to internal short names. */
const SERVICE_MATCH_RULES: Array<{ key: string; patterns: RegExp }> = [
  { key: 'ec2',        patterns: /\b(ec2|elastic compute cloud)\b/i },
  { key: 's3',         patterns: /\b(s3|simple storage service)\b/i },
  { key: 'rds',        patterns: /\b(rds|relational database service)\b/i },
  { key: 'lambda',     patterns: /\blambda\b/i },
  { key: 'elb',        patterns: /\b(elastic load|elb|load balancing)\b/i },
  { key: 'vpc',        patterns: /\b(vpc|virtual private cloud)\b/i },
  { key: 'iam',        patterns: /\b(iam|identity and access)\b/i },
  { key: 'ecs',        patterns: /\b(ecs|elastic container service)\b/i },
  { key: 'eks',        patterns: /\b(eks|elastic kubernetes)\b/i },
  { key: 'dynamodb',   patterns: /\bdynamo\s*db\b/i },
  { key: 'cloudfront', patterns: /\bcloudfront\b/i },
  { key: 'sns',        patterns: /\b(sns|simple notification)\b/i },
  { key: 'sqs',        patterns: /\b(sqs|simple queue)\b/i },
  { key: 'route53',    patterns: /\broute\s*53\b/i },
  { key: 'metrics',    patterns: /\bcloudwatch\b/i },
];

/**
 * Normalize an AWS Cost Explorer service name to the internal short name
 * using regex-based fuzzy matching.
 * Returns the original name if no rule matches.
 */
function normalizeServiceName(awsName: string): string {
  for (const rule of SERVICE_MATCH_RULES) {
    if (rule.patterns.test(awsName)) {
      return rule.key;
    }
  }
  return awsName;
}

/**
 * Format a number as a currency string with thousand separators.
 * Example: 1234.5 → "$1,234.50"
 */
export function formatCurrency(amount: number, currency: string = '$'): string {
  const formatted = amount
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency}${formatted}`;
}

/**
 * Extract the most recent N days of data from dailyCosts.
 * Returns a subset sorted by date ascending.
 */
export function getRecentDays(
  dailyCosts: DailyCostData[],
  days: number,
): DailyCostData[] {
  if (days <= 0 || dailyCosts.length === 0) {
    return [];
  }

  // Sort a copy by date descending to pick the N largest dates
  const sorted = [...dailyCosts].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, days);

  // Return in ascending order
  recent.sort((a, b) => a.date.localeCompare(b.date));
  return recent;
}

/**
 * Calculate the daily average cost.
 * Returns sum(amounts) / length, or 0 for an empty array.
 */
export function calculateDailyAverage(dailyCosts: DailyCostData[]): number {
  if (dailyCosts.length === 0) {
    return 0;
  }
  const total = dailyCosts.reduce((sum, d) => sum + d.amount, 0);
  return total / dailyCosts.length;
}

/**
 * Calculate the forecasted total cost for the month using linear extrapolation.
 * forecast = (totalAmount / days) * totalDaysInMonth
 * Returns null when fewer than 3 days of data are available.
 */
export function calculateForecast(
  dailyCosts: DailyCostData[],
  totalDaysInMonth: number,
): number | null {
  if (dailyCosts.length < 3) {
    return null;
  }
  const dailyAverage = calculateDailyAverage(dailyCosts);
  return dailyAverage * totalDaysInMonth;
}

/**
 * Generate forecast line data points from the last actual date to the end of the month.
 * Each day's forecast value equals the daily average.
 * Returns an empty array when fewer than 3 days of data are available.
 */
export function generateForecastLine(
  dailyCosts: DailyCostData[],
  totalDaysInMonth: number,
): DailyCostData[] {
  if (dailyCosts.length < 3) {
    return [];
  }

  const dailyAverage = calculateDailyAverage(dailyCosts);

  // Find the last actual date
  const sorted = [...dailyCosts].sort((a, b) => a.date.localeCompare(b.date));
  const lastDate = sorted[sorted.length - 1].date;

  // Parse the last date to determine year and month
  const [yearStr, monthStr, dayStr] = lastDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based
  const lastDay = parseInt(dayStr, 10);

  const forecastPoints: DailyCostData[] = [];

  // Generate points from the day after the last actual date to the end of the month
  for (let day = lastDay + 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    forecastPoints.push({ date: dateStr, amount: dailyAverage });
  }

  return forecastPoints;
}

/**
 * Convert a service costs array into a serviceName → cost mapping.
 * AWS Cost Explorer returns full service names (e.g. "Amazon Elastic Compute Cloud - Compute"),
 * which are normalized to internal short names (e.g. "ec2").
 * Multiple AWS entries that map to the same short name are summed.
 */
export function buildServiceCostMap(
  serviceCosts: ServiceCost[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const sc of serviceCosts) {
    const key = normalizeServiceName(sc.serviceName);
    map[key] = (map[key] ?? 0) + sc.cost;
  }
  return map;
}

/**
 * Match service costs to service summaries.
 * Returns a serviceName → cost mapping where unmatched services get 0.
 */
export function matchServiceCosts(
  serviceCosts: ServiceCost[],
  serviceSummaries: { serviceName: string }[],
): Record<string, number> {
  const costMap = buildServiceCostMap(serviceCosts);
  const result: Record<string, number> = {};

  for (const summary of serviceSummaries) {
    result[summary.serviceName] = costMap[summary.serviceName] ?? 0;
  }

  return result;
}

/**
 * Calculate the top N services by cost growth rate.
 * - Excludes services with current cost = 0
 * - Marks services as "new" when previous cost = 0 and current > 0
 * - Sorts by growth rate descending (new services first)
 * - Limits output to topN (default 5)
 */
export function getTopGrowthServices(
  currentServiceCosts: ServiceCost[],
  previousServiceCosts: ServiceCost[],
  topN: number = 5,
): ServiceGrowth[] {
  const previousMap = buildServiceCostMap(previousServiceCosts);

  const growthList: ServiceGrowth[] = [];

  for (const current of currentServiceCosts) {
    // Exclude services with zero current cost
    if (current.cost === 0) {
      continue;
    }

    const previousCost = previousMap[current.serviceName] ?? 0;

    if (previousCost === 0) {
      // New service: previous was 0, current > 0
      growthList.push({
        serviceName: current.serviceName,
        currentCost: current.cost,
        previousCost: 0,
        growthPercentage: null,
        growthLabel: 'new',
      });
    } else {
      const growthPercentage = ((current.cost - previousCost) / previousCost) * 100;
      growthList.push({
        serviceName: current.serviceName,
        currentCost: current.cost,
        previousCost,
        growthPercentage,
        growthLabel: 'percentage',
      });
    }
  }

  // Sort: new services first (null growthPercentage), then by growth rate descending
  growthList.sort((a, b) => {
    // New services (growthPercentage === null) come first
    if (a.growthPercentage === null && b.growthPercentage === null) {
      return 0;
    }
    if (a.growthPercentage === null) {
      return -1;
    }
    if (b.growthPercentage === null) {
      return 1;
    }
    return b.growthPercentage - a.growthPercentage;
  });

  return growthList.slice(0, topN);
}
