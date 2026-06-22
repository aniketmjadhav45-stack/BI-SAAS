import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Database, Trash2, LogOut, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadDataSources() {
      const { data } = await supabase.from('data_sources').select('*');
      if (data) setDataSources(data);
      setLoading(false);
    }
    loadDataSources();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (error) throw error;
      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!window.confirm('Are you sure you want to disconnect this data source? Your dashboard will lose access to its data.')) return;
    
    try {
      const { error } = await supabase.from('data_sources').delete().eq('id', id);
      if (error) throw error;
      setDataSources(dataSources.filter(ds => ds.id !== id));
    } catch (err: any) {
      alert(`Error deleting source: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Settings & Account</h2>
      
      {/* Profile Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} color="var(--accent-color)" />
          Profile Information
        </h3>

        {successMsg && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={20} />
            <p style={{ margin: 0 }}>{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} />
            <p style={{ margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Email Address (Cannot be changed)</label>
            <input type="email" className="input" value={user?.email || ''} disabled style={{ opacity: 0.7, backgroundColor: 'var(--bg-color-light)' }} />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingProfile} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
            <Save size={16} style={{ marginRight: '0.5rem' }} />
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Data Sources Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} color="var(--accent-color)" />
          Connected Data Sources
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading data sources...</p>
        ) : dataSources.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No data sources connected yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dataSources.map(ds => (
              <div key={ds.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-color-light)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{ds.name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                    {ds.sheet_url}
                  </p>
                </div>
                <button onClick={() => handleDeleteSource(ds.id)} className="btn btn-secondary" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ border: '1px solid var(--danger-color)' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--danger-color)' }}>Danger Zone</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Sign out of your account on this device.
        </p>
        <button onClick={handleLogout} className="btn" style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}>
          <LogOut size={16} style={{ marginRight: '0.5rem' }} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
