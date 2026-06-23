
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue: number;
  currentValue: number;
  invertColors?: boolean; // For metrics where up is bad (e.g., tickets)
  prefix?: string;
}

export default function MetricCard({ title, value, previousValue, currentValue, invertColors = false, prefix = '' }: MetricCardProps) {
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
      <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {prefix}{value}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: colorClass, fontWeight: 500 }}>
        {isPositive && <ArrowUpRight size={16} />}
        {isNegative && <ArrowDownRight size={16} />}
        {isNeutral && <Minus size={16} />}
        
        <span>{Math.abs(percentChange).toFixed(1)}%</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.25rem' }}>vs last week</span>
      </div>
    </div>
  );
}
