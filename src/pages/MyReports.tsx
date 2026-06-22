import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchSheetData } from '../lib/googleSheets';
import DynamicReport from '../components/DynamicReport';
import type { ReportConfig } from '../lib/gemini';
import { LayoutDashboard, Database, Trash2 } from 'lucide-react';

interface SavedReport {
  id: string;
  title: string;
  prompt: string;
  config: ReportConfig;
  created_at: string;
  data_sources: {
    name: string;
    sheet_url: string;
  };
}

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetDataCache, setSheetDataCache] = useState<Record<string, any[]>>({});

  useEffect(() => {
    async function loadReports() {
      if (!user) return;
      const { data } = await supabase
        .from('saved_reports')
        .select('*, data_sources(name, sheet_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (data) {
        setReports(data as any);
        
        // Fetch sheet data for these reports
        const uniqueUrls = [...new Set(data.map(r => (r as any).data_sources.sheet_url))];
        const cache: Record<string, any[]> = {};
        
        await Promise.all(uniqueUrls.map(async (url: any) => {
          try {
            const raw = await fetchSheetData(url);
            cache[url] = raw;
          } catch (e) {
            console.error("Failed to load sheet data for reports", e);
          }
        }));
        setSheetDataCache(cache);
      }
      setLoading(false);
    }
    loadReports();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    await supabase.from('saved_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading your saved reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <LayoutDashboard size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Saved Reports</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Go to Ask Datapulse to generate and save custom reports.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <LayoutDashboard color="var(--accent-color)" /> My Saved Reports
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {reports.map(report => {
          const rawData = sheetDataCache[report.data_sources.sheet_url] || [];
          return (
            <div key={report.id} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <Database size={14} /> {report.data_sources.name}
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <span style={{ fontStyle: 'italic' }}>" {report.prompt} "</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(report.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.5rem' }}
                  title="Delete Report"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {rawData.length > 0 ? (
                <DynamicReport config={report.config} rawData={rawData} />
              ) : (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading data source...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
