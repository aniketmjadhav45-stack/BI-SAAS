import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchSheetData, extractSpreadsheetId } from '../lib/googleSheets';
import { useAuth } from '../contexts/AuthContext';
import { Link2, AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ConnectDataSource() {
  const [connectionType, setConnectionType] = useState<'sheets' | 'excel'>('sheets');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!user) return;

    try {
      if (connectionType === 'sheets') {
        const spreadsheetId = extractSpreadsheetId(url);
        if (!spreadsheetId) {
          throw new Error('Could not find a valid Spreadsheet ID in that URL.');
        }

        const data = await fetchSheetData(url);
        if (data.length === 0) throw new Error('The spreadsheet appears to be empty.');

        const firstRow = data[0];
        const hasExpectedCols = ['date', 'revenue', 'leads', 'tickets', 'attendance'].some(col => col in firstRow);
        
        if (!hasExpectedCols) {
          throw new Error('The sheet does not contain expected columns like "date", "revenue", "leads", etc. Please check your sheet headers.');
        }

        const { error: dbError } = await supabase
          .from('data_sources')
          .insert([
            { 
              user_id: user.id, 
              name: name || 'My Google Sheet', 
              sheet_url: url 
            }
          ]);

        if (dbError) throw new Error(`Database error: ${dbError.message}`);

        completeConnection();
      } else {
        // Excel Upload
        const file = fileInputRef.current?.files?.[0];
        if (!file) throw new Error('Please select an Excel file to upload.');

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
           throw new Error('The Excel file has no sheets.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        if (json.length === 0) throw new Error('The Excel file appears to be empty.');

        const normalizedData = json.map((row: any) => {
          const newRow: any = {};
          for (const key in row) {
             if (row[key] !== null) {
               newRow[key.toLowerCase().trim()] = row[key];
             }
          }
          return newRow;
        });

        const firstRow = normalizedData[0];
        const hasExpectedCols = ['date', 'revenue', 'leads', 'tickets', 'attendance'].some(col => col in firstRow);
        
        if (!hasExpectedCols) {
          throw new Error('The Excel file does not contain expected columns like "date", "revenue", "leads", etc. Please check your headers.');
        }

        const { error: dbError } = await supabase
          .from('data_sources')
          .insert([
            { 
              user_id: user.id, 
              name: name || file.name, 
              parsed_data: normalizedData 
            }
          ]);

        if (dbError) throw new Error(`Database error: ${dbError.message}`);

        completeConnection();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const completeConnection = () => {
    setSuccess(true);
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link2 size={24} color="var(--accent-color)" />
        Connect a Data Source
      </h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          type="button"
          onClick={() => setConnectionType('sheets')}
          style={{ 
            flex: 1, 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            border: `2px solid ${connectionType === 'sheets' ? 'var(--accent-color)' : 'var(--border-color)'}`,
            backgroundColor: connectionType === 'sheets' ? 'rgba(255, 107, 53, 0.1)' : 'var(--card-bg)',
            color: 'var(--text-dark)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <Link2 size={20} /> Google Sheets
        </button>
        <button 
          type="button"
          onClick={() => setConnectionType('excel')}
          style={{ 
            flex: 1, 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            border: `2px solid ${connectionType === 'excel' ? 'var(--accent-color)' : 'var(--border-color)'}`,
            backgroundColor: connectionType === 'excel' ? 'rgba(255, 107, 53, 0.1)' : 'var(--card-bg)',
            color: 'var(--text-dark)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <FileSpreadsheet size={20} /> Excel Upload
        </button>
      </div>

      <div className="card">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {connectionType === 'sheets' 
            ? 'Paste a public Google Sheets link below. Your sheet must be set to "Anyone with the link can view".'
            : 'Upload a local Excel file (.xlsx) directly to Datapulse. The data will be securely stored in your account.'}
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
              placeholder={connectionType === 'sheets' ? "e.g. Q3 Sales Data" : "Leave blank to use filename"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {connectionType === 'sheets' ? (
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
          ) : (
            <div>
              <label className="label" htmlFor="fileUpload">Excel File (.xlsx)</label>
              <input
                id="fileUpload"
                type="file"
                accept=".xlsx, .xls"
                className="input"
                ref={fileInputRef}
                onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || null)}
                required
                style={{ padding: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', width: '100%' }}
              />
              {selectedFileName && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <FileSpreadsheet size={16} /> Selected: {selectedFileName}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading ? 'Processing...' : (connectionType === 'sheets' ? <><Link2 size={18} /> Connect Sheet</> : <><Upload size={18} /> Upload Excel</>)}
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
