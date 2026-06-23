import { ArrowUpRight, ArrowDownRight, Minus, Activity } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  invertColors?: boolean; // For metrics where up is bad (e.g., tickets)
  prefix?: string;
  averageValue?: string | number;
}

export default function MetricCard({ title, value, previousValue = 0, currentValue = 0, invertColors = false, prefix = '', averageValue }: MetricCardProps) {
  let percentChange = 0;
  if (previousValue > 0) {
    percentChange = ((currentValue - previousValue) / previousValue) * 100;
  } else if (currentValue > 0) {
    percentChange = 100;
  }

  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;
  const isNeutral = percentChange === 0;

  // Determine if the change is "good" or "bad" based on invertColors
  const isGood = invertColors ? isNegative : isPositive;
  const isBad = invertColors ? isPositive : isNegative;

  let colorClass = 'var(--text-secondary)';
  if (isGood) colorClass = 'var(--success-color)';
  if (isBad) colorClass = 'var(--danger-color)';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)', opacity: 0.5, borderRadius: '50%' }} />
      <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</h3>
      <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        {prefix}{value}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        {(previousValue !== 0 || currentValue !== 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: colorClass, fontWeight: 500 }}>
            {isPositive && <ArrowUpRight size={16} />}
            {isNegative && <ArrowDownRight size={16} />}
            {isNeutral && <Minus size={16} />}
            
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.25rem' }}>trend</span>
          </div>
        ) : <div />}

        {averageValue !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
            <Activity size={14} />
            Avg: {prefix}{averageValue}
          </div>
        )}
      </div>
    </div>
  );
}
