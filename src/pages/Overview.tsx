import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchSheetData, type SheetDataRow } from '../lib/googleSheets';
import { PlusCircle, Database, AlertCircle, ChevronDown, Table as TableIcon, LayoutDashboard } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF6B35', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

export default function Overview() {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [sheetData, setSheetData] = useState<SheetDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  
  // Layout persistence state
  const [viewAsTable, setViewAsTable] = useState(false);

  useEffect(() => {
    async function loadSources() {
      try {
        const { data, error: dbError } = await supabase
          .from('data_sources')
          .select('*')
          .order('created_at', { ascending: false }); // Newest first
          
        if (dbError) throw dbError;
        
        if (data && data.length > 0) {
          setDataSources(data);
          setSelectedSourceId(data[0].id); // Auto-select newest
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data sources');
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!selectedSourceId || dataSources.length === 0) return;
      
      setLoadingData(true);
      setError(null);
      try {
        const source = dataSources.find(s => s.id === selectedSourceId);
        if (!source) return;

        // Restore saved layout config
        if (source.layout_config && typeof source.layout_config.viewAsTable === 'boolean') {
          setViewAsTable(source.layout_config.viewAsTable);
        } else {
          setViewAsTable(false); // Default
        }

        let rawData: any[] = [];
        if (source.parsed_data) {
          rawData = source.parsed_data;
        } else if (source.sheet_url) {
          rawData = await fetchSheetData(source.sheet_url);
        }
        
        // Find the date column dynamically
        const firstRow = rawData.length > 0 ? rawData[0] : null;
        let dateCol = 'date';
        if (firstRow) {
           const possibleDateCol = Object.keys(firstRow).find(k => k.toLowerCase().includes('date') || k.toLowerCase() === 'time');
           if (possibleDateCol) dateCol = possibleDateCol;
        }

        // Sort data by date ascending
        const sortedData = [...rawData].sort((a, b) => {
          const dateA = a[dateCol] ? new Date(a[dateCol]).getTime() : 0;
          const dateB = b[dateCol] ? new Date(b[dateCol]).getTime() : 0;
          return dateA - dateB;
        });
        
        setSheetData(sortedData);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [selectedSourceId, dataSources]);

  const toggleViewMode = async (isTable: boolean) => {
    setViewAsTable(isTable);
    if (!selectedSourceId) return;

    try {
      // Save config to Supabase
      const { error: updateError } = await supabase
        .from('data_sources')
        .update({ layout_config: { viewAsTable: isTable } })
        .eq('id', selectedSourceId);

      if (updateError) {
        console.error("Warning: Failed to save layout to DB", updateError);
      } else {
        // Update local state so it doesn't revert on next re-render
        setDataSources(prev => prev.map(ds => 
          ds.id === selectedSourceId ? { ...ds, layout_config: { ...ds.layout_config, viewAsTable: isTable } } : ds
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={24} /> Loading dashboard...
        </div>
      </div>
    );
  }

  if (dataSources.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: 'var(--shadow-glow)' }}>
          <Database size={48} color="var(--accent-color)" />
        </div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>No data sources connected</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '2rem', fontSize: '1.1rem' }}>
          Connect your first Google Sheet or Excel file to Datapulse to start seeing your metrics instantly.
        </p>
        <Link to="/connect" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
          <PlusCircle size={20} style={{ marginRight: '0.5rem' }} />
          Connect Data Source
        </Link>
      </div>
    );
  }

  // Analyze columns dynamically
  const sampleRow = sheetData.length > 0 ? sheetData[0] : null;
  const numericColumns: string[] = [];
  let categoricalColumn: string | null = null;
  
  const dateColumn = sampleRow ? Object.keys(sampleRow).find(k => k.toLowerCase().includes('date') || k.toLowerCase() === 'time') || 'date' : 'date';

  if (sampleRow) {
    Object.keys(sampleRow).forEach(key => {
      if (key.toLowerCase() === 'id' || key === dateColumn) return;
      
      const isNumeric = sheetData.slice(0, 10).some(row => {
         const val = row[key];
         return typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)));
      });
      
      if (isNumeric) {
        numericColumns.push(key);
      } else {
        // Potential categorical column?
        const uniqueVals = new Set(sheetData.map(r => String(r[key])).filter(v => v !== 'undefined' && v !== 'null'));
        if (uniqueVals.size > 0 && uniqueVals.size <= 20) {
          categoricalColumn = key; // Found a good category
        }
      }
    });
  }

  // Group data by week
  const weeklyData: Record<string, { dateStr: string, timestamp: number, metrics: Record<string, number> }> = {};
  const totalMetrics: Record<string, number> = {};
  
  numericColumns.forEach(col => totalMetrics[col] = 0);

  sheetData.forEach(row => {
    const rawDate = row[dateColumn];
    if (!rawDate) return;
    
    let dateObj: Date;
    if (typeof rawDate === 'number') {
      dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else {
      dateObj = new Date(rawDate);
    }
    
    if (isNaN(dateObj.getTime())) return;
    
    const day = dateObj.getDay() || 7;
    dateObj.setHours(-24 * (day - 1));
    const weekKey = dateObj.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { dateStr: weekKey, timestamp: dateObj.getTime(), metrics: {} };
      numericColumns.forEach(col => weeklyData[weekKey].metrics[col] = 0);
    }
    
    numericColumns.forEach(col => {
       const val = Number(row[col]) || 0;
       totalMetrics[col] += val;
       weeklyData[weekKey].metrics[col] += val;
    });
  });

  const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.timestamp - b.timestamp);
  const currentPeriod = sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1] : null;
  const previousPeriod = sortedWeeks.length > 1 ? sortedWeeks[sortedWeeks.length - 2] : null;

  // Format chart data
  const chartData = sheetData.map(row => {
    let dateLabel = 'Unknown';
    if (row[dateColumn]) {
       if (typeof row[dateColumn] === 'number') {
           const d = new Date(Math.round((row[dateColumn] - 25569) * 86400 * 1000));
           dateLabel = d.toISOString().split('T')[0];
       } else {
           dateLabel = String(row[dateColumn]);
       }
    }
  
    const dataPoint: any = { name: dateLabel };
    numericColumns.forEach(col => {
       dataPoint[col] = Number(row[col]) || 0;
    });
    return dataPoint;
  });

  const primaryChartKey = numericColumns.length > 0 ? numericColumns[0] : null;
  const secondaryChartKey = numericColumns.length > 1 ? numericColumns[1] : primaryChartKey;

  // Format Pie Chart data (if categorical exists)
  let pieChartData: any[] = [];
  if (categoricalColumn && primaryChartKey) {
     const agg: Record<string, number> = {};
     sheetData.forEach(row => {
        const cat = String(row[categoricalColumn!] || 'Unknown');
        const val = Number(row[primaryChartKey!]) || 0;
        agg[cat] = (agg[cat] || 0) + val;
     });
     pieChartData = Object.entries(agg)
       .map(([name, value]) => ({ name, value }))
       .sort((a, b) => b.value - a.value);
  }

  const getTitle = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div style={{ opacity: loadingData ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Dashboard Overview</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* View Mode Toggles */}
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => toggleViewMode(false)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: 'var(--radius-sm)', 
                border: 'none',
                background: !viewAsTable ? 'rgba(255, 107, 53, 0.2)' : 'transparent',
                color: !viewAsTable ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}>
              <LayoutDashboard size={16} />
              Charts
            </button>
            <button 
              onClick={() => toggleViewMode(true)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: 'var(--radius-sm)', 
                border: 'none',
                background: viewAsTable ? 'rgba(255, 107, 53, 0.2)' : 'transparent',
                color: viewAsTable ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}>
              <TableIcon size={16} />
              Table
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={selectedSourceId || ''}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="input"
              style={{
                appearance: 'none',
                paddingRight: '2.5rem',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {dataSources.map(ds => (
                <option key={ds.id} value={ds.id} style={{ backgroundColor: 'var(--bg-color)', color: 'white' }}>
                  {ds.name || 'Unnamed Source'} {ds.parsed_data ? '(Excel)' : '(Sheets)'}
                </option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>

          <Link to="/connect" className="btn btn-primary" style={{ boxShadow: 'none' }}>
            <PlusCircle size={16} style={{ marginRight: '0.5rem' }} />
            New Source
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={20} />
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
      
      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {numericColumns.length === 0 && !loadingData && sheetData.length > 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No numeric data found to display metrics.</p>
        ) : (
          numericColumns.map(col => {
            const isMonetary = ['revenue', 'sales', 'price', 'cost', 'spend', 'amount', 'profit', 'gst', 'tax'].some(k => col.toLowerCase().includes(k));
            const prefix = isMonetary ? '$' : '';
            const title = getTitle(col);
            
            const totalVal = totalMetrics[col] || 0;
            const currentVal = currentPeriod?.metrics[col] || 0;
            const prevVal = previousPeriod?.metrics[col] || 0;
            
            const invertColors = ['ticket', 'error', 'bug', 'absence', 'churn', 'bounce', 'leave'].some(k => col.toLowerCase().includes(k));

            return (
              <MetricCard 
                key={col}
                title={`Total ${title}`} 
                value={totalVal.toLocaleString(undefined, { minimumFractionDigits: isMonetary ? 2 : 0, maximumFractionDigits: isMonetary ? 2 : 0 })} 
                prefix={prefix}
                currentValue={currentVal}
                previousValue={prevVal}
                invertColors={invertColors}
              />
            );
          })
        )}
      </div>

      {/* Main Content Area: Charts or Table */}
      {viewAsTable ? (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <tr>
                {Object.keys(sheetData[0] || {}).map(key => (
                  <th key={key} style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                    {getTitle(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheetData.slice(0, 100).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s', ':hover': { backgroundColor: 'rgba(255,255,255,0.02)' } } as React.CSSProperties}>
                  {Object.values(row).map((val: any, j) => (
                    <td key={j} style={{ padding: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {typeof val === 'number' && val > 1000 ? val.toLocaleString() : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sheetData.length > 100 && (
             <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
               Showing first 100 rows...
             </div>
          )}
        </div>
      ) : (
        numericColumns.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: pieChartData.length > 0 ? 'repeat(auto-fit, minmax(400px, 1fr))' : 'repeat(auto-fit, minmax(600px, 1fr))', gap: '1.5rem' }}>
            
            {/* Primary Line Chart */}
            {primaryChartKey && (
              <div className="card" style={{ gridColumn: pieChartData.length > 0 ? 'span 2' : 'span 1' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>{getTitle(primaryChartKey)} Trend</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey={primaryChartKey} stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#fff', stroke: 'var(--accent-color)', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Secondary Bar Chart */}
            {secondaryChartKey && (
              <div className="card">
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>{getTitle(secondaryChartKey)} per Period</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey={secondaryChartKey} fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Smart Pie Chart */}
            {pieChartData.length > 0 && primaryChartKey && categoricalColumn && (
              <div className="card">
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>{getTitle(primaryChartKey)} by {getTitle(categoricalColumn)}</h3>
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => value.toLocaleString()}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                  {pieChartData.slice(0, 8).map((entry, index) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
