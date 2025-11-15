// app/api/route/route.js
export const runtime = 'edge';

const DEFAULT_MODEL = 'meta-llama/llama-4-maverick:free';

function addCorsHeaders(headers = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return new Response(null, { headers: addCorsHeaders() });
}

export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', hasKey: !!process.env.OPENROUTER_API_KEY }),
    { headers: addCorsHeaders({ 'Content-Type': 'application/json' }) }
  );
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

    const body = await request.json();
    const { messages = [], model = DEFAULT_MODEL } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages' }),
        { status: 400, headers: addCorsHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://legimedtravq-proxy-clean.vercel.app',
        'X-Title': 'LegiMedTravQ',
      },
      body: JSON.stringify({ model, messages }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: addCorsHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
}