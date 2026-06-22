import type { ReportConfig, ReportComponentConfig } from '../lib/gemini';
import { processChartData, processKpiData } from '../lib/reportEngine';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DynamicReportProps {
  config: ReportConfig;
  rawData: any[];
}

export default function DynamicReport({ config, rawData }: DynamicReportProps) {
  
  const renderComponent = (comp: ReportComponentConfig, index: number) => {
    if (comp.type === 'kpi') {
      const val = processKpiData(rawData, comp);
      return (
        <div key={index} className="card" style={{ flex: '1 1 200px' }}>
          <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{comp.title}</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }

    if (comp.type === 'line' || comp.type === 'bar') {
      const chartData = processChartData(rawData, comp);
      
      return (
        <div key={index} className="card" style={{ width: '100%', minHeight: '350px', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>{comp.title}</h4>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {comp.type === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey={comp.xAxisColumn!} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }} />
                  <Line type="monotone" dataKey={comp.yAxisColumn!} stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-color)' }} />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey={comp.xAxisColumn!} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey={comp.yAxisColumn!} fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (comp.type === 'table') {
      // Just render a simple table of raw data for the specified columns
      const cols = comp.xAxisColumn && comp.yAxisColumn 
        ? [comp.xAxisColumn, comp.yAxisColumn] 
        : Object.keys(rawData[0] || {}).slice(0, 5);

      return (
        <div key={index} className="card" style={{ width: '100%', overflowX: 'auto', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>{comp.title}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                {cols.map(c => <th key={c} style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rawData.slice(0, 20).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {cols.map(c => <td key={c} style={{ padding: '0.75rem' }}>{String(row[c] || '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {rawData.length > 20 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>Showing top 20 rows...</p>}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--text-dark)' }}>{config.title}</h3>
      
      {/* Group KPIs at the top */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {config.components.filter(c => c.type === 'kpi').map((c, i) => renderComponent(c, i))}
      </div>

      {/* Render Charts and Tables */}
      <div>
        {config.components.filter(c => c.type !== 'kpi').map((c, i) => renderComponent(c, i))}
      </div>
    </div>
  );
}
