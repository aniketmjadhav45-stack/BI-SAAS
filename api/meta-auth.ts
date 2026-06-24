import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirect_uri } = req.body;
  const appId = process.env.VITE_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing code or redirect_uri' });
  }

  if (!appId || !appSecret) {
    return res.status(500).json({ error: 'Server misconfiguration: Missing Meta App ID or Secret' });
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Meta OAuth Error:', tokenData.error);
      return res.status(400).json({ error: tokenData.error.message || 'Failed to exchange token' });
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for long-lived token
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error) {
      console.error('Meta Long-Lived Token Error:', longLivedData.error);
      return res.status(400).json({ error: longLivedData.error.message || 'Failed to get long-lived token' });
    }

    const longLivedToken = longLivedData.access_token;

    // We return the token securely to the frontend.
    // The frontend must immediately store this in Supabase via RLS.
    return res.status(200).json({ access_token: longLivedToken });
  } catch (error: any) {
    console.error('Internal Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
