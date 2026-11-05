import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const respond = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request, { params }) {
  const { id } = await params;
  const token = request.headers.get('x-replicate-token')?.trim();

  if (!token || token.length < 10 || token.length > 512) {
    return respond({ error: 'Enter a valid Replicate API token.' }, 401);
  }
  if (!/^[a-z0-9]{8,40}$/i.test(id || '')) {
    return respond({ error: 'Invalid prediction ID.' }, 400);
  }

  try {
    const upstream = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return respond({ error: data.detail || data.error || 'Replicate status lookup failed.' }, upstream.status);
    }

    const firstOutput = Array.isArray(data.output) ? data.output[0] : data.output;
    const outputUrl = typeof firstOutput === 'string'
      ? firstOutput
      : firstOutput?.url || null;
    return respond({
      id: data.id,
      status: data.status,
      outputUrl,
      error: data.error || null,
    });
  } catch {
    return respond({ error: 'Unable to connect to Replicate. Retry later.' }, 502);
  }
}
