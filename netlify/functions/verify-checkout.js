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

exports.handler = async (event) => {
  const headers = baseHeaders();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: safeJson({ error: 'Méthode non autorisée.' }) };

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY manque dans Netlify.');

    const token = tokenFromEvent(event);
    const user = await getUserFromToken(token);
    const body = JSON.parse(event.body || '{}');
    const sessionId = body.session_id;
    if (!sessionId) throw new Error('session_id manquant.');

    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` }
    });
    const session = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(session.error?.message || 'Session Stripe introuvable.');

    const metaUser = session.metadata && session.metadata.user_id;
    if (metaUser && metaUser !== user.id) throw new Error('Cette session Stripe ne correspond pas à ton compte.');

    const ok = session.payment_status === 'paid' || session.status === 'complete';
    if (!ok) throw new Error('Paiement non confirmé.');

    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'paid' })
    });

    return { statusCode: 200, headers, body: safeJson({ ok: true, status: 'paid' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: safeJson({ error: err.message || 'Erreur vérification paiement.' }) };
  }
};
