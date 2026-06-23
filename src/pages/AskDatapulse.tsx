import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchSheetData } from '../lib/googleSheets';
import { generateReportConfig, type AIResponse } from '../lib/gemini';
import DynamicReport from '../components/DynamicReport';
import { Send, Sparkles, Save, CheckCircle2, AlertCircle, Database, ChevronDown } from 'lucide-react';

export default function AskDatapulse() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string, report?: AIResponse }[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch all data sources
  useEffect(() => {
    async function loadSources() {
      if (!user) return;
      const { data } = await supabase
        .from('data_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (data && data.length > 0) {
        setDataSources(data);
        setSelectedSourceId(data[0].id); // Auto-select newest
      }
    }
    loadSources();
  }, [user]);

  // 2. Fetch data for the currently selected source
  useEffect(() => {
    async function loadData() {
      if (!selectedSourceId || dataSources.length === 0) return;
      
      const source = dataSources.find(s => s.id === selectedSourceId);
      if (!source) return;

      try {
        let raw: any[] = [];
        if (source.parsed_data) {
          raw = source.parsed_data;
        } else if (source.sheet_url) {
          raw = await fetchSheetData(source.sheet_url);
        }
        setSheetData(raw);
        if (raw.length > 0) {
          setColumns(Object.keys(raw[0]));
        }
      } catch (e) {
        console.error("Error fetching sheet data for AI", e);
      }
    }
    loadData();
  }, [selectedSourceId, dataSources]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedSourceId) return;

    const userText = prompt.trim();
    setPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    setSaveSuccess(false);

    try {
      const response = await generateReportConfig(userText, columns, sheetData);
      
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        text: response.message,
        report: response 
      }]);

    } catch (err: any) {
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        text: `Error: ${err.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async (report: AIResponse, originalPrompt: string) => {
    if (!user || !selectedSourceId || !report.reportConfig) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('saved_reports').insert([
        {
          user_id: user.id,
          data_source_id: selectedSourceId,
          title: report.reportConfig.title,
          prompt: originalPrompt,
          config: report.reportConfig
        }
      ]);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save report: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (dataSources.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: 'var(--shadow-glow)' }}>
          <Database size={48} color="var(--accent-color)" />
        </div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>No Data Source Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You must connect a Google Sheet or Excel file before using Ask Datapulse.</p>
      </div>
    );
  }

  const selectedSource = dataSources.find(s => s.id === selectedSourceId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 6rem)', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={28} color="var(--accent-color)" />
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Ask Datapulse</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              AI-powered reports. Ask a question, get a chart.
            </p>
          </div>
        </div>

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
              fontWeight: 500,
              minWidth: '200px'
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
      </div>

      {saveSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle2 size={20} />
          <p style={{ margin: 0 }}>Report saved successfully! View it in "My Reports".</p>
        </div>
      )}

      <div className="card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.5)' }}>
        {chatHistory.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Try asking about <strong>{selectedSource?.name || 'your data'}</strong>:</p>
            <ul style={{ paddingLeft: '0', marginTop: '1rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', textAlign: 'center' }}>
              <li style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>"Show me a sales report for the last 3 months"</li>
              <li style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>"I want to see revenue broken down by product"</li>
              <li style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>"How many tickets did we get?"</li>
            </ul>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              
              <div style={{ 
                background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent-color), #D44E1C)' : 'rgba(255,255,255,0.05)', 
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                borderBottomRightRadius: msg.role === 'user' ? 0 : '1rem',
                borderBottomLeftRadius: msg.role === 'ai' ? 0 : '1rem',
                maxWidth: '80%',
                marginBottom: msg.report?.responseType === 'report' ? '1rem' : 0,
                border: msg.role === 'ai' ? '1px solid var(--border-color)' : 'none',
                boxShadow: msg.role === 'user' ? '0 4px 12px var(--accent-glow)' : 'none'
              }}>
                {msg.role === 'ai' && msg.report?.responseType === 'error' && <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--danger-color)' }} />}
                {msg.text}
              </div>

              {/* Render dynamic report if AI successfully configured one */}
              {msg.role === 'ai' && msg.report?.responseType === 'report' && msg.report.reportConfig && (
                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                  <DynamicReport config={msg.report.reportConfig} rawData={sheetData} />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                      onClick={() => handleSaveReport(msg.report!, chatHistory[i-1]?.text || 'Saved Report')} 
                      className="btn btn-secondary"
                      disabled={saving}
                    >
                      <Save size={16} style={{ marginRight: '0.5rem' }} />
                      {saving ? 'Saving...' : 'Save Report'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        
        {loading && (
          <div style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '1rem', borderBottomLeftRadius: 0, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} className="animate-pulse" color="var(--accent-color)" />
              Datapulse AI is thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: '2rem', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          placeholder="Ask Datapulse to analyze your data..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ borderRadius: '50%', width: '3.5rem', height: '3.5rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          disabled={loading || !prompt.trim()}
        >
          <Send size={20} style={{ marginLeft: '4px' }} />
        </button>
      </form>
    </div>
  );
}
