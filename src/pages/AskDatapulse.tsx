import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchSheetData } from '../lib/googleSheets';
import { generateReportConfig, type AIResponse } from '../lib/gemini';
import DynamicReport from '../components/DynamicReport';
import { Send, Sparkles, Save, CheckCircle2, AlertCircle, Database } from 'lucide-react';

export default function AskDatapulse() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<any>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string, report?: AIResponse }[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const { data } = await supabase.from('data_sources').select('*').eq('user_id', user.id).limit(1);
      if (data && data.length > 0) {
        setDataSource(data[0]);
        try {
          let raw: any[] = [];
          if (data[0].parsed_data) {
            raw = data[0].parsed_data;
          } else if (data[0].sheet_url) {
            raw = await fetchSheetData(data[0].sheet_url);
          }
          setSheetData(raw);
          if (raw.length > 0) {
            setColumns(Object.keys(raw[0]));
          }
        } catch (e) {
          console.error("Error fetching sheet data for AI", e);
        }
      }
    }
    loadData();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !dataSource) return;

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
    if (!user || !dataSource || !report.reportConfig) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('saved_reports').insert([
        {
          user_id: user.id,
          data_source_id: dataSource.id,
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

  if (!dataSource) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <Database size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Data Source Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You must connect a Google Sheet in the Overview or Settings page before using Ask Datapulse.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 6rem)', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Sparkles size={28} color="var(--accent-color)" />
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Ask Datapulse</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Describe the report you want to see using your data from "{dataSource.name}".
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <CheckCircle2 size={20} />
          <p style={{ margin: 0 }}>Report saved successfully! View it in "My Reports".</p>
        </div>
      )}

      <div className="card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem' }}>
        {chatHistory.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Try asking:</p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', opacity: 0.8 }}>
              <li>"Show me a sales report for the last 3 months"</li>
              <li>"I want to see revenue broken down by product"</li>
              <li>"How many tickets did we get?"</li>
            </ul>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              
              <div style={{ 
                backgroundColor: msg.role === 'user' ? 'var(--accent-color)' : 'var(--bg-color-light)', 
                color: msg.role === 'user' ? 'white' : 'var(--text-dark)',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                borderBottomRightRadius: msg.role === 'user' ? 0 : '1rem',
                borderBottomLeftRadius: msg.role === 'ai' ? 0 : '1rem',
                maxWidth: '80%',
                marginBottom: msg.report?.responseType === 'report' ? '1rem' : 0
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
          <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--bg-color-light)', padding: '1rem', borderRadius: '1rem', borderBottomLeftRadius: 0, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} className="animate-pulse" />
              Datapulse AI is thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, padding: '1rem 1.25rem', borderRadius: '2rem' }}
          placeholder="Ask for a report..."
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
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
