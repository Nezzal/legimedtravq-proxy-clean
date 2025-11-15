// app/api/route/route.js
export const runtime = 'edge'; // ⚡️ recommandé pour les proxys légers (ou 'nodejs' si besoin de fs, etc.)

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 🔐 Sécurité : ne jamais exposer la clé
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY is missing in environment variables');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🔍 Masquer partiellement la clé dans les logs (ex: sk-or-v1-****54a2)
    const maskedKey = apiKey.length > 8 
      ? `sk-or-v1-****${apiKey.slice(-4)}` 
      : '***';

    console.log(`✅ Using masked key: ${maskedKey}`);

    // 📥 Récupérer le body de la requête frontend
    const body = await request.json();
    const { messages = [], stream = false } = body;

    // ✅ Valider les messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or empty messages array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🎯 Modèle par défaut — à adapter selon ton besoin
    const model = body.model || 'qwen/qwen3-max'; // ou 'meta-llama/llama-3.2-1b-instruct:free' pour test

    // 🌐 Appel à OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://legimedtravq-proxy-clean.vercel.app', // ✅ requis
        'X-Title': 'LegiMedTravQ', // ✅ requis
      },
      body: JSON.stringify({
        model,
        messages,
        stream, // supporte le streaming côté frontend si besoin
        // temperature: 0.7,
        // max_tokens: 1000,
      }),
    });

    // 🔁 Transférer la réponse telle quelle (y compris en streaming)
    if (stream && response.body) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 📥 Réponse classique (non-streaming)
    const data = await response.json();
    const status = response.ok ? 200 : response.status;

    if (!response.ok) {
      console.error('❌ OpenRouter error:', {
        status,
        code: data?.code,
        message: data?.message,
        model,
      });
    }

    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔥 Proxy error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Proxy failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ✅ Route GET pour vérifier la configuration (optionnel, à garder en dev seulement)
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      hasKey: !!process.env.OPENROUTER_API_KEY,
      runtime: process.env.NEXT_RUNTIME || 'unknown',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}