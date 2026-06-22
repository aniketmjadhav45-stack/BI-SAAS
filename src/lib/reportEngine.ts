import type { ReportComponentConfig } from './gemini';

export function processChartData(rawData: any[], config: ReportComponentConfig): any[] {
  if (!config.xAxisColumn || !config.yAxisColumn) return rawData;

  const grouped: Record<string, { sum: number, count: number, val: string }> = {};

  rawData.forEach(row => {
    let xVal = row[config.xAxisColumn!];
    if (xVal === undefined || xVal === null) xVal = 'Unknown';

    // Handle date grouping if xAxis is a date
    if (config.groupBy && config.groupBy !== 'none' && xVal) {
      const date = new Date(xVal);
      if (!isNaN(date.getTime())) {
        if (config.groupBy === 'day') {
          xVal = date.toISOString().split('T')[0];
        } else if (config.groupBy === 'week') {
          const day = date.getDay() || 7;
          date.setHours(-24 * (day - 1));
          xVal = date.toISOString().split('T')[0] + ' (Week)';
        } else if (config.groupBy === 'month') {
          xVal = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
      }
    }

    const key = String(xVal);
    const yVal = Number(row[config.yAxisColumn!]) || 0;

    if (!grouped[key]) {
      grouped[key] = { sum: 0, count: 0, val: key };
    }

    grouped[key].sum += yVal;
    grouped[key].count += 1;
  });

  // Convert to array
  const result = Object.values(grouped).map(g => {
    let finalY = g.sum;
    if (config.aggregation === 'avg') finalY = g.sum / g.count;
    if (config.aggregation === 'count') finalY = g.count;

    return {
      [config.xAxisColumn!]: g.val,
      [config.yAxisColumn!]: finalY
    };
  });

  // Sort chronologically or alphabetically
  return result.sort((a, b) => {
    const valA = a[config.xAxisColumn!];
    const valB = b[config.xAxisColumn!];
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });
}

export function processKpiData(rawData: any[], config: ReportComponentConfig): number {
  if (!config.yAxisColumn) return 0;
  
  let sum = 0;
  let count = 0;
  
  rawData.forEach(row => {
    const val = Number(row[config.yAxisColumn!]);
    if (!isNaN(val)) {
      sum += val;
      count++;
    }
  });

  if (config.aggregation === 'avg' && count > 0) return sum / count;
  if (config.aggregation === 'count') return count;
  return sum;
}
