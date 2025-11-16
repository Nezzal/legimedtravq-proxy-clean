// app/api/route/route.js
export const runtime = 'edge';

const DEFAULT_MODEL = 'mistralai/mistral-7b-instruct:free';

const ALLOWED_ORIGINS = [
  'https://nezzal.github.io',
  'https://legimedtravq.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

function addSecureCorsHeaders(headers = {}, origin) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'https://nezzal.github.io',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin') || '';
  return new Response(null, {
    headers: addSecureCorsHeaders({}, origin),
  });
}

export async function GET(request) {
  const origin = request.headers.get('origin') || '';
  const hasKey = !!process.env.OPENROUTER_API_KEY;
  return new Response(
    JSON.stringify({ status: 'ok', hasKey, origin }),
    { headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
  );
}

export async function POST(request) {
  const origin = request.headers.get('origin') || '';
  console.log('📡 [PROXY] Requête reçue depuis :', origin);

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: origin not allowed' }),
      { status: 403, headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    );
  }

  try {
    const body = await request.json();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

    const { messages = [], model = DEFAULT_MODEL } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array');
    }

    // 🚀 Paramètres optimisés pour les modèles :free
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nezzal.github.io/LegiMedTravQ/',
        'X-Title': 'LegiMedTravQ',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 512,     // ← limite stricte pour éviter les réponses vides
        temperature: 0.3,    // ← plus rigoureux, moins aléatoire
        top_p: 0.9,
        frequency_penalty: 0.2,
      }),
    });

    const data = await res.json();
    console.log('📤 [PROXY] OpenRouter →', res.status, '| tokens:', data?.usage?.total_tokens || 'N/A');

    // 📦 Format garanti pour le frontend
    return new Response(JSON.stringify({
      status: res.status,
      success: res.ok,
      data: res.ok ? data : null,
      error: !res.ok ? data.error || 'Unknown error' : null,
    }), {
      status: res.status,
      headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin),
    });

  } catch (err) {
    console.error('💥 [PROXY] Erreur interne :', err.message);
    return new Response(JSON.stringify({
      success: false,
      error: `Proxy error: ${err.message}`,
    }), {
      status: 500,
      headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin),
    });
  }
}