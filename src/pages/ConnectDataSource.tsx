import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchSheetData, extractSpreadsheetId } from '../lib/googleSheets';
import { useAuth } from '../contexts/AuthContext';
import { Link2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ConnectDataSource() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!user) return;

    try {
      // 1. Verify the URL is valid
      const spreadsheetId = extractSpreadsheetId(url);
      if (!spreadsheetId) {
        throw new Error('Could not find a valid Spreadsheet ID in that URL.');
      }

      // 2. Test fetching the data to ensure it's public and valid
      const data = await fetchSheetData(url);
      
      if (data.length === 0) {
        throw new Error('The spreadsheet appears to be empty.');
      }

      // Check if essential columns exist (at least one of the expected ones)
      const firstRow = data[0];
      const hasExpectedCols = ['date', 'revenue', 'leads', 'tickets', 'attendance'].some(col => col in firstRow);
      
      if (!hasExpectedCols) {
        throw new Error('The sheet does not contain expected columns like "date", "revenue", "leads", etc. Please check your sheet headers.');
      }

      // 3. Save to Supabase
      const { error: dbError } = await supabase
        .from('data_sources')
        .insert([
          { 
            user_id: user.id, 
            name: name || 'My Google Sheet', 
            sheet_url: url 
          }
        ]);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}. Make sure you created the data_sources table!`);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link2 size={24} color="var(--accent-color)" />
        Connect a Data Source
      </h2>
      
      <div className="card">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Paste a public Google Sheets link below. Your sheet must be set to <strong>"Anyone with the link can view"</strong>.
        </p>

        {error && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} />
            <p style={{ fontSize: '0.875rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={20} />
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Successfully connected! Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleConnect} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="name">Data Source Name (Optional)</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="e.g. Q3 Sales Data"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="url">Google Sheets Link</label>
            <input
              id="url"
              type="url"
              className="input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Connecting & Verifying...' : 'Connect Sheet'}
          </button>
        </form>
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-color-light)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Expected Format</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          For the dashboard to generate metrics and charts automatically, please ensure your sheet has a header row with some or all of the following exact column names (case-insensitive):
        </p>
        <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><code>date</code> (e.g. YYYY-MM-DD or MM/DD/YYYY)</li>
          <li><code>revenue</code> (numbers only)</li>
          <li><code>leads</code> (numbers only)</li>
          <li><code>tickets</code> (numbers only)</li>
          <li><code>attendance</code> (numbers only)</li>
        </ul>
      </div>
    </div>
  );
}
