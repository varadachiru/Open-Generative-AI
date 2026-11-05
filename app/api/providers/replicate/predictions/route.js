import { NextResponse } from 'next/server';

// BYOK-only, allowlisted endpoint. We never retain or log customer tokens.
export const runtime = 'nodejs';
const MODEL_URL = 'https://api.replicate.com/v1/models/wan-video/wan-2.2-5b-fast/predictions';
const noStore = { 'Cache-Control': 'no-store' };

const respond = (body, status = 200) => NextResponse.json(body, { status, headers: noStore });

export async function POST(request) {
  const token = request.headers.get('x-replicate-token')?.trim();
  if (!token || token.length < 10 || token.length > 512) {
    return respond({ error: 'Enter a valid Replicate API token.' }, 401);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return respond({ error: 'Invalid JSON request.' }, 400);
  }

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt || prompt.length > 2000) {
    return respond({ error: 'Prompt must contain 1 to 2000 characters.' }, 400);
  }

  const resolution = input.resolution;
  const aspectRatio = input.aspectRatio;
  if (!['480p', '720p'].includes(resolution) || !['16:9', '9:16'].includes(aspectRatio)) {
    return respond({ error: 'Invalid resolution or aspect ratio.' }, 400);
  }

  try {
    // 81 frames / 16 fps is approximately five seconds. No extra models are exposed.
    const upstream = await fetch(MODEL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=10',
      },
      body: JSON.stringify({
        input: {
          prompt,
          resolution,
          aspect_ratio: aspectRatio,
          num_frames: 81,
          frames_per_second: 16,
          go_fast: true,
          optimize_prompt: false,
        },
      }),
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return respond({ error: data.detail || data.error || 'Replicate rejected the request.' }, upstream.status);
    }
    return respond({
      id: data.id,
      status: data.status,
      output: data.output || null,
      error: data.error || null,
    });
  } catch {
    return respond({ error: 'Unable to connect to Replicate. Retry later.' }, 502);
  }
}
