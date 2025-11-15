// app/api/route/route.js
export const runtime = 'edge'; // ⚡️ léger, rapide, compatible Vercel

// 🔧 Paramètres configurables
const DEFAULT_MODEL = 'meta-llama/llama-4-maverick:free'; // ✅ Modèle gratuit confirmé (nov. 2025)
// const DEFAULT_MODEL = 'qwen/qwen3-max'; // ⏳ À décommenter la veille de la conf

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY missing in Vercel environment');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🔍 Masquage sécurisé pour les logs
    const maskedKey = `sk-or-v1-****${apiKey.slice(-4)}`;
    console.log(`✅ Proxy called | Key: ${maskedKey} | Model: ${DEFAULT_MODEL}`);

    const body = await request.json();
    const { messages = [], model = DEFAULT_MODEL, stream = false } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or empty messages array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🌐 Appel à OpenRouter — strict respect des headers requis
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://legimedtravq-proxy-clean.vercel.app',
        'X-Title': 'LegiMedTravQ',
      },
      body: JSON.stringify({ model, messages, stream }),
    });

    // 🔁 Streaming supporté si demandé
    if (stream && res.body) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 📥 Réponse classique
    const data = await res.json();
    const status = res.ok ? 200 : res.status;

    if (!res.ok) {
      console.error('❌ OpenRouter error:', {
        status,
        model,
        code: data?.code,
        message: data?.message?.substring(0, 100),
      });
    }

    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔥 Proxy crash:', error.message);
    return new Response(
      JSON.stringify({ error: 'Proxy failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ✅ GET pour vérification rapide (dev seulement — à supprimer en prod si souhaité)
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      hasKey: !!process.env.OPENROUTER_API_KEY,
      model: DEFAULT_MODEL,
      runtime: process.env.NEXT_RUNTIME || 'edge',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}