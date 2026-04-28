async function getUserFromToken(token) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Utilisateur non connecté.');
  return await res.json();
}

async function rest(path, opts = {}) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manque dans Netlify.');
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!res.ok) {
    const msg = data?.message || data?.error || `Erreur Supabase ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function tokenFromEvent(event) {
  const h = event.headers.authorization || event.headers.Authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('Token manquant.');
  return m[1];
}

function safeJson(data) { try { return JSON.stringify(data); } catch (_) { return '{"error":"Erreur JSON"}'; } }

function baseHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

async function requireAdmin(event) {
  const token = tokenFromEvent(event);
  const user = await getUserFromToken(token);
  const profiles = await rest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,email,is_admin,status`);
  const profile = profiles && profiles[0];
  if (!profile || !profile.is_admin) throw new Error('Accès admin refusé.');
  return { user, profile };
}

exports.handler = async (event) => {
  const headers = baseHeaders();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: safeJson({ error: 'Méthode non autorisée.' }) };

  try {
    const token = tokenFromEvent(event);
    const user = await getUserFromToken(token);
    let rows = await rest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=*`);
    let profile = rows && rows[0];

    if (!profile) {
      const created = await rest('profiles', {
        method: 'POST',
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          nom: (user.user_metadata && user.user_metadata.nom) || String(user.email || '').split('@')[0],
          status: 'trial',
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          last_login: new Date().toISOString()
        })
      });
      profile = created && created[0];
      await rest('user_data', { method: 'POST', body: JSON.stringify({ user_id: user.id, data: {} }) }).catch(()=>{});
    }

    const now = Date.now();
    const trialEnd = profile.trial_end ? new Date(profile.trial_end).getTime() : 0;
    let status = profile.status || 'trial';

    if (status === 'trial' && trialEnd && now > trialEnd) {
      status = 'expired';
      const updated = await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, last_login: new Date().toISOString() })
      });
      profile = updated && updated[0] ? updated[0] : { ...profile, status };
    } else {
      await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ last_login: new Date().toISOString() })
      }).catch(()=>{});
    }

    const allowed = status === 'trial' || status === 'paid';
    return { statusCode: 200, headers, body: safeJson({ allowed, profile }) };
  } catch (err) {
    return { statusCode: 500, headers, body: safeJson({ error: err.message || 'Erreur accès.' }) };
  }
};
