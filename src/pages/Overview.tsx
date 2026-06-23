import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchSheetData, type SheetDataRow } from '../lib/googleSheets';
import { PlusCircle, Database, AlertCircle, ChevronDown } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Overview() {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [sheetData, setSheetData] = useState<SheetDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

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

        let rawData: any[] = [];
        if (source.parsed_data) {
          rawData = source.parsed_data;
        } else if (source.sheet_url) {
          rawData = await fetchSheetData(source.sheet_url);
        }
        
        // Sort data by date ascending
        const sortedData = [...rawData].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
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

  const getMetric = (row: any, primary: string, secondary: string) => Number(row?.[primary]) || Number(row?.[secondary]) || 0;

  // Group data by week for accurate Week-over-Week calculations
  const weeklyData: Record<string, { revenue: number, leads: number, tickets: number, attendance: number, dateStr: string, timestamp: number }> = {};
  
  let totalRevenue = 0;
  let totalLeads = 0;
  let totalTickets = 0;
  let totalAttendance = 0;

  sheetData.forEach(row => {
    if (!row.date) return;
    const dateObj = new Date(row.date);
    if (isNaN(dateObj.getTime())) return;
    
    const rev = getMetric(row, 'revenue', 'sales');
    const leads = getMetric(row, 'leads', 'units_sold');
    const tix = getMetric(row, 'tickets', 'profit');
    const att = getMetric(row, 'attendance', 'attendance');

    totalRevenue += rev;
    totalLeads += leads;
    totalTickets += tix;
    totalAttendance += att;

    // Get the start of the week (Monday)
    const day = dateObj.getDay() || 7; // Convert Sunday (0) to 7
    dateObj.setHours(-24 * (day - 1));
    const weekKey = dateObj.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { revenue: 0, leads: 0, tickets: 0, attendance: 0, dateStr: weekKey, timestamp: dateObj.getTime() };
    }
    
    weeklyData[weekKey].revenue += rev;
    weeklyData[weekKey].leads += leads;
    weeklyData[weekKey].tickets += tix;
    weeklyData[weekKey].attendance += att;
  });

  // Sort weeks
  const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.timestamp - b.timestamp);
  
  const currentPeriod = sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1] : null;
  const previousPeriod = sortedWeeks.length > 1 ? sortedWeeks[sortedWeeks.length - 2] : null;

  const currentRevenue = currentPeriod?.revenue || 0;
  const prevRevenue = previousPeriod?.revenue || 0;
  
  const currentLeads = currentPeriod?.leads || 0;
  const prevLeads = previousPeriod?.leads || 0;
  
  const currentTickets = currentPeriod?.tickets || 0;
  const prevTickets = previousPeriod?.tickets || 0;
  
  const currentAttendance = currentPeriod?.attendance || 0;
  const prevAttendance = previousPeriod?.attendance || 0;

  // Chart data formatting
  const chartData = sheetData.map(row => ({
    name: row.date || 'Unknown',
    Revenue: getMetric(row, 'revenue', 'sales'),
    Tickets: getMetric(row, 'tickets', 'profit'),
    Leads: getMetric(row, 'leads', 'units_sold'),
  }));

  return (
    <div style={{ opacity: loadingData ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Dashboard Overview</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Data Source Selector */}
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
        <MetricCard 
          title="Total Revenue" 
          value={totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} 
          prefix="$"
          currentValue={currentRevenue}
          previousValue={prevRevenue}
        />
        <MetricCard 
          title="Total Leads" 
          value={totalLeads.toLocaleString()} 
          currentValue={currentLeads}
          previousValue={prevLeads}
        />
        <MetricCard 
          title="Total Tickets" 
          value={totalTickets.toLocaleString()} 
          currentValue={currentTickets}
          previousValue={prevTickets}
          invertColors={true}
        />
        <MetricCard 
          title="Total Attendance" 
          value={totalAttendance.toLocaleString()} 
          currentValue={currentAttendance}
          previousValue={prevAttendance}
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Revenue Line Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>Revenue Trend</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="Revenue" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#fff', stroke: 'var(--accent-color)', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', fontWeight: 600 }}>Tickets per Period</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="Tickets" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
