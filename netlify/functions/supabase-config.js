function safeJson(data) { try { return JSON.stringify(data); } catch (_) { return '{"error":"Erreur JSON"}'; } }

exports.handler = async () => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  if (!url || !anonKey) {
    return { statusCode: 500, headers, body: safeJson({ error: 'SUPABASE_URL ou SUPABASE_ANON_KEY manque dans Netlify.' }) };
  }

  return { statusCode: 200, headers, body: safeJson({ url, anonKey }) };
};
