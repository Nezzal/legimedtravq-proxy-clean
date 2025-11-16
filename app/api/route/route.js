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
  const status = hasKey ? '✅ prêt' : '❌ clé manquante';
  return new Response(
    JSON.stringify({ status, hasKey, origin }),
    { headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
  );
}

export async function POST(request) {
  const origin = request.headers.get('origin') || '';

  // 🚨 Log pour débogage
  console.log('📡 [PROXY] Requête reçue depuis :', origin);
  console.log('🔐 Clé présente ?', !!process.env.OPENROUTER_API_KEY);

  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn('⚠️ [PROXY] Origine refusée :', origin);
    return new Response(
      JSON.stringify({ error: 'Forbidden: origin not allowed' }),
      { status: 403, headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin) }
    );
  }

  try {
    const body = await request.json();
    console.log('📩 [PROXY] Payload reçu :', JSON.stringify(body, null, 2).substring(0, 300) + '...');

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY missing (check Vercel → Environment Variables)');
    }

    const { messages = [], model = DEFAULT_MODEL } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array');
    }

    // 📡 Appel à OpenRouter
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nezzal.github.io/LegiMedTravQ/',
        'X-Title': 'LegiMedTravQ',
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024 }),
    });

    const data = await res.json();
    console.log('📤 [PROXY] Statut OpenRouter :', res.status);
    if (res.status !== 200) {
      console.error('❌ [PROXY] Erreur OpenRouter :', JSON.stringify(data, null, 2));
    } else {
      const contentPreview = data?.choices?.[0]?.message?.content?.substring(0, 100) || '⚠️ vide';
      console.log('✅ [PROXY] Réponse reçue (preview) :', contentPreview);
    }

    // 📦 Format standard garanti pour le frontend
    const safeResponse = {
      status: res.status,
      success: res.ok,
      data: res.ok ? data : null,
      error: !res.ok ? data.error || 'Unknown error' : null,
    };

    return new Response(JSON.stringify(safeResponse), {
      status: res.status,
      headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin),
    });

  } catch (err) {
    console.error('💥 [PROXY] Erreur interne :', err.message, err.stack?.split('\n')[0]);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Proxy error: ${err.message}`,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      }),
      {
        status: 500,
        headers: addSecureCorsHeaders({ 'Content-Type': 'application/json' }, origin),
      }
    );
  }
}