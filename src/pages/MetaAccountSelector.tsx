import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, AlertCircle, BarChart3, Loader2 } from 'lucide-react';

interface AdAccount {
  id: string;
  account_id: string;
  name: string;
}

export default function MetaAccountSelector() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        // Fetch the user's Meta connection
        const { data, error: dbError } = await supabase
          .from('meta_connections')
          .select('access_token')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (dbError || !data?.access_token) {
          throw new Error('No Meta connection found. Please connect your account first.');
        }

        setAccessToken(data.access_token);

        // Fetch Ad Accounts
        const res = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&access_token=${data.access_token}`);
        const accountsData = await res.json();

        if (accountsData.error) {
          throw new Error(accountsData.error.message || 'Failed to fetch ad accounts');
        }

        setAccounts(accountsData.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  const handleSelectAccount = async (account: AdAccount) => {
    if (!accessToken || !user) return;
    setSyncing(account.id);
    setError(null);

    try {
      // Fetch Campaign Data for the last 30 days
      const fields = 'campaign_name,spend,impressions,clicks,cpc,ctr,actions';
      const url = `https://graph.facebook.com/v19.0/${account.id}/insights?level=campaign&date_preset=last_30d&fields=${fields}&access_token=${accessToken}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch campaign insights');
      }

      const insights = data.data || [];
      
      // Transform into our generic dashboard format
      const parsedData = insights.map((row: any) => {
        // Convert 'actions' array to a single conversions number
        const conversions = row.actions?.find((a: any) => a.action_type === 'offsite_conversion' || a.action_type === 'lead' || a.action_type === 'purchase')?.value || 0;
        
        return {
          date: row.date_start || new Date().toISOString().split('T')[0],
          campaign: row.campaign_name,
          spend: parseFloat(row.spend) || 0,
          impressions: parseInt(row.impressions) || 0,
          clicks: parseInt(row.clicks) || 0,
          cpc: parseFloat(row.cpc) || 0,
          ctr: parseFloat(row.ctr) || 0,
          conversions: parseInt(conversions) || 0
        };
      });

      if (parsedData.length === 0) {
        throw new Error('No campaign data found in the last 30 days for this account.');
      }

      // Save as a new Data Source
      const { error: dbError } = await supabase
        .from('data_sources')
        .insert([
          { 
            user_id: user.id, 
            name: `Meta Ads: ${account.name}`, 
            parsed_data: parsedData 
          }
        ]);

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setSyncing(null);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BarChart3 size={24} color="#1877F2" />
        Select Ad Account
      </h2>

      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: '0.875rem', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading your ad accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No ad accounts found for this Meta user.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Choose which Ad Account you want to sync with Datapulse. We'll pull the last 30 days of campaign performance.
            </p>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => handleSelectAccount(acc)}
                disabled={syncing !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: syncing !== null ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.2s',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  if (syncing === null) e.currentTarget.style.borderColor = '#1877F2';
                }}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{acc.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>ID: {acc.account_id}</div>
                </div>
                {syncing === acc.id ? (
                  <Loader2 size={20} color="#1877F2" className="animate-spin" />
                ) : (
                  <CheckCircle2 size={20} color={syncing === null ? 'var(--text-secondary)' : 'transparent'} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
