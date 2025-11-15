// app/api/route/route.js
export const runtime = 'edge';

export async function GET() {
  return Response.json({
    ok: true,
    message: "Proxy LegiMedTravQ opérationnel ✅",
    hasKey: !!process.env.OPENROUTER_API_KEY,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  // 🔑 Clé à tester — remplace ici par ta VRAIE clé (celle qui commence par sk-or-v1-)
  // ✅ Dans route.js (ou tout handler)
const apiKey = process.env.OPENROUTER_API_KEY; // ✔️ jamais en dur

  // 👀 Diagnostic sécurisé (masque tout sauf les 4 premiers et 4 derniers caractères)
  const masked = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '❌ undefined';
  console.log('🔑 Masquée (dev):', masked);
  console.log('✅ Format valide ?', apiKey?.startsWith('sk-or-v1-'));

  if (!apiKey || !apiKey.startsWith('sk-or-v1-')) {
    return Response.json({
      error: 'Clé API invalide ou mal formatée',
      hint: 'Doit commencer par "sk-or-v1-"'
    }, { status: 400 });
  }

  try {
    const { prompt } = await request.json();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://legimedtravq-proxy.vercel.app',
        'X-Title': 'LegiMedTravQ'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt || 'Bonjour' }]
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('📡 OpenRouter erreur:', res.status, data);
      return Response.json({ error: `OpenRouter ${res.status}`, debug: data }, { status: res.status });
    }

    return Response.json({ reply: data.choices?.[0]?.message?.content?.trim() || 'OK' });
  } catch (e) {
    console.error('💥 Erreur:', e.message);
    return Response.json({ error: 'Erreur interne', debug: e.message }, { status: 500 });
  }
}