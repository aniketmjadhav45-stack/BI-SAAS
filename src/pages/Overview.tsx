import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchSheetData, type SheetDataRow } from '../lib/googleSheets';
import { PlusCircle, Database, AlertCircle, ChevronDown, Table as TableIcon, LayoutDashboard, Calendar } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import ErrorBoundary from '../components/ErrorBoundary';

const COLORS = ['#FF6B35', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

type DateFilter = '7days' | '30days' | 'all';

function OverviewContent() {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [sheetData, setSheetData] = useState<SheetDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  
  // Layout persistence state
  const [viewAsTable, setViewAsTable] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    async function loadSources() {
      try {
        const { data, error: dbError } = await supabase
          .from('data_sources')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (dbError) throw dbError;
        
        if (data && data.length > 0) {
          setDataSources(data);
          setSelectedSourceId(data[0].id);
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

        if (source.layout_config && typeof source.layout_config.viewAsTable === 'boolean') {
          setViewAsTable(source.layout_config.viewAsTable);
        } else {
          setViewAsTable(false);
        }

        let rawData: any[] = [];
        if (source.parsed_data) {
          rawData = typeof source.parsed_data === 'string' ? JSON.parse(source.parsed_data) : source.parsed_data;
        } else if (source.sheet_url) {
          rawData = await fetchSheetData(source.sheet_url);
        }
        
        const firstRow = rawData.length > 0 ? rawData[0] : null;
        let dateCol = 'date';
        if (firstRow) {
           const possibleDateCol = Object.keys(firstRow).find(k => k.toLowerCase().includes('date') || k.toLowerCase() === 'time');
           if (possibleDateCol) dateCol = possibleDateCol;
        }

        const sortedData = [...rawData]
          .map(row => {
            // Ensure valid date objects
            let parsedDate = null;
            if (row[dateCol]) {
              if (typeof row[dateCol] === 'number') {
                parsedDate = new Date(Math.round((row[dateCol] - 25569) * 86400 * 1000));
              } else {
                parsedDate = new Date(row[dateCol]);
              }
            }
            return { ...row, _parsedDate: parsedDate };
          })
          .sort((a, b) => {
             const timeA = a._parsedDate ? a._parsedDate.getTime() : 0;
             const timeB = b._parsedDate ? b._parsedDate.getTime() : 0;
             return timeA - timeB;
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
      const { error: updateError } = await supabase
        .from('data_sources')
        .update({ layout_config: { viewAsTable: isTable } })
        .eq('id', selectedSourceId);

      if (!updateError) {
        setDataSources(prev => prev.map(ds => 
          ds.id === selectedSourceId ? { ...ds, layout_config: { ...ds.layout_config, viewAsTable: isTable } } : ds
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter data based on date filter
  const filteredData = useMemo(() => {
    if (dateFilter === 'all') return sheetData;
    if (sheetData.length === 0) return sheetData;

    const lastDateObj = sheetData[sheetData.length - 1]._parsedDate;
    if (!lastDateObj || isNaN(lastDateObj.getTime())) return sheetData; // Cannot filter if no valid dates

    const cutoffDate = new Date(lastDateObj);
    if (dateFilter === '7days') cutoffDate.setDate(cutoffDate.getDate() - 7);
    if (dateFilter === '30days') cutoffDate.setDate(cutoffDate.getDate() - 30);

    return sheetData.filter(row => {
      if (!row._parsedDate || isNaN(row._parsedDate.getTime())) return false;
      return row._parsedDate.getTime() >= cutoffDate.getTime();
    });
  }, [sheetData, dateFilter]);

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

  // Analyze columns
  const sampleRow = sheetData.length > 0 ? sheetData[0] : null;
  const numericColumns: string[] = [];
  let categoricalColumn: string | null = null;
  
  if (sampleRow) {
    const dateColumnName = Object.keys(sampleRow).find(k => k !== '_parsedDate' && (k.toLowerCase().includes('date') || k.toLowerCase() === 'time')) || 'date';

    Object.keys(sampleRow).forEach(key => {
      if (key === '_parsedDate' || key.toLowerCase() === 'id' || key === dateColumnName) return;
      
      const isNumeric = sheetData.slice(0, 10).some(row => {
         const val = row[key];
         return typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)));
      });
      
      if (isNumeric) {
        numericColumns.push(key);
      } else {
        const uniqueVals = new Set(sheetData.map(r => String(r[key])).filter(v => v !== 'undefined' && v !== 'null'));
        if (uniqueVals.size > 0 && uniqueVals.size <= 20) {
          categoricalColumn = key; 
        }
      }
    });
  }

  // Calculate Metrics from filteredData
  const totalMetrics: Record<string, number> = {};
  numericColumns.forEach(col => totalMetrics[col] = 0);
  
  // Calculate unique days for averages
  const uniqueDays = new Set(filteredData.map(row => row._parsedDate?.toISOString().split('T')[0]).filter(Boolean));
  const daysCount = Math.max(1, uniqueDays.size);

  filteredData.forEach(row => {
    numericColumns.forEach(col => {
       const val = Number(row[col]) || 0;
       totalMetrics[col] += val;
    });
  });

  // Chart Formatting
  const chartData = filteredData.map(row => {
    let dateLabel = 'Unknown';
    if (row._parsedDate && !isNaN(row._parsedDate.getTime())) {
       dateLabel = row._parsedDate.toISOString().split('T')[0];
    }
  
    const dataPoint: any = { name: dateLabel };
    numericColumns.forEach(col => {
       dataPoint[col] = Number(row[col]) || 0;
    });
    return dataPoint;
  });

  const primaryChartKey = numericColumns.length > 0 ? numericColumns[0] : null;
  const secondaryChartKey = numericColumns.length > 1 ? numericColumns[1] : primaryChartKey;

  let pieChartData: any[] = [];
  if (categoricalColumn && primaryChartKey) {
     const agg: Record<string, number> = {};
     filteredData.forEach(row => {
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
      {/* Top Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', margin: 0 }}>Dashboard Overview</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Global Date Filter */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
               <Calendar size={16} color="var(--text-secondary)" />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="input"
              style={{
                appearance: 'none',
                paddingLeft: '2.5rem',
                paddingRight: '2.5rem',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}
            >
              <option value="7days" style={{ backgroundColor: 'var(--bg-color)', color: 'white' }}>Last 7 Days</option>
              <option value="30days" style={{ backgroundColor: 'var(--bg-color)', color: 'white' }}>Last 30 Days</option>
              <option value="all" style={{ backgroundColor: 'var(--bg-color)', color: 'white' }}>All Time</option>
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>

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
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}>
              <LayoutDashboard size={16} />
              Full View
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
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}>
              <TableIcon size={16} />
              Table Only
            </button>
          </div>

          {/* Source Selector */}
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
                fontWeight: 500,
                maxWidth: '200px',
                textOverflow: 'ellipsis'
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
      {!viewAsTable && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {numericColumns.length === 0 && !loadingData && filteredData.length > 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No numeric data found to display metrics.</p>
          ) : (
            numericColumns.map(col => {
              const isMonetary = ['revenue', 'sales', 'price', 'cost', 'spend', 'amount', 'profit', 'gst', 'tax'].some(k => col.toLowerCase().includes(k));
              const prefix = isMonetary ? '$' : '';
              const title = getTitle(col);
              
              const totalVal = totalMetrics[col] || 0;
              const avgVal = totalVal / daysCount;
              
              const invertColors = ['ticket', 'error', 'bug', 'absence', 'churn', 'bounce', 'leave'].some(k => col.toLowerCase().includes(k));

              return (
                <MetricCard 
                  key={col}
                  title={`Total ${title}`} 
                  value={totalVal.toLocaleString(undefined, { minimumFractionDigits: isMonetary ? 2 : 0, maximumFractionDigits: isMonetary ? 2 : 0 })} 
                  prefix={prefix}
                  averageValue={avgVal.toLocaleString(undefined, { minimumFractionDigits: isMonetary ? 2 : 0, maximumFractionDigits: isMonetary ? 2 : 0 })}
                  invertColors={invertColors}
                />
              );
            })
          )}
        </div>
      )}

      {/* Main Content Area */}
      {viewAsTable ? (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <tr>
                {Object.keys(sheetData[0] || {}).filter(k => k !== '_parsedDate').map(key => (
                  <th key={key} style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                    {getTitle(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 100).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
                  {Object.entries(row).filter(([k]) => k !== '_parsedDate').map(([j, val]) => (
                    <td key={j} style={{ padding: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {typeof val === 'number' && val > 1000 ? val.toLocaleString() : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length > 100 && (
             <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
               Showing 100 of {filteredData.length} rows...
             </div>
          )}
          {filteredData.length === 0 && (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
               No data available for this date range.
             </div>
          )}
        </div>
      ) : (
        numericColumns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Top Chart Row: Dense Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: pieChartData.length > 0 ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
              
              {/* Primary Area Chart */}
              {primaryChartKey && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>{getTitle(primaryChartKey)} Timeline</h3>
                  <div style={{ flex: 1, minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <defs>
                          <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey={primaryChartKey} stroke="var(--accent-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" activeDot={{ r: 6, fill: '#fff', stroke: 'var(--accent-color)', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Categorical Donut Chart */}
              {pieChartData.length > 0 && primaryChartKey && categoricalColumn && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>{getTitle(primaryChartKey)} by {getTitle(categoricalColumn)}</h3>
                  <div style={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={2}
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                    {pieChartData.slice(0, 8).map((entry, index) => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Charts Row */}
            {secondaryChartKey && secondaryChartKey !== primaryChartKey && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>{getTitle(secondaryChartKey)} per Period</h3>
                  <div style={{ flex: 1, minHeight: '300px' }}>
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
              </div>
            )}

            {/* Embedded Table Row */}
            <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                 <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Detailed Records</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <tr>
                    {Object.keys(sheetData[0] || {}).filter(k => k !== '_parsedDate').map(key => (
                      <th key={key} style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                        {getTitle(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {Object.entries(row).filter(([k]) => k !== '_parsedDate').map(([j, val]) => (
                        <td key={j} style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {typeof val === 'number' && val > 1000 ? val.toLocaleString() : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '1rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {filteredData.length > 5 ? `Showing latest 5 of ${filteredData.length} records.` : `Showing all ${filteredData.length} records.`} To see more, switch to Table Only view.
              </div>
            </div>

          </div>
        )
      )}
    </div>
  );
}

export default function Overview() {
  return (
    <ErrorBoundary>
      <OverviewContent />
    </ErrorBoundary>
  );
}