"use client";

import { useRef, useState } from 'react';

const API_ROUTE = '/api/providers/replicate/predictions';
const MAX_POLLS = 150;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Replicate API request failed.');
  }
  return data;
}

/**
 * A deliberately small BYOK test studio. Tokens remain in React memory only;
 * the server forwards them to Replicate, never storing them or exposing them
 * to the existing MuAPI client. No generation is submitted without a click.
 */
export default function ReplicateVideoStudio({
  apiToken,
  onTokenChange,
  onGenerationStart,
  onGenerationEnd,
  onGenerationComplete,
  onGenerationError,
}) {
  const [prompt, setPrompt] = useState(
    'A cinematic camera slowly moving through a lush green forest at sunrise, golden sunlight filtering through the trees, gentle mist, realistic nature, smooth camera movement.'
  );
  const [resolution, setResolution] = useState('480p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [predictionId, setPredictionId] = useState('');
  const generatingRef = useRef(false);

  async function handleGenerate(event) {
    event.preventDefault();
    if (generatingRef.current) return;
    if (!apiToken?.trim()) {
      setError('Enter your Replicate API token to continue.');
      return;
    }
    if (!prompt.trim()) {
      setError('Enter a video prompt.');
      return;
    }

    generatingRef.current = true;
    setGenerating(true);
    setError('');
    setVideoUrl('');
    setPredictionId('');
    setStatus('Submitting to Replicate…');
    onGenerationStart?.();

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-replicate-token': apiToken.trim(),
      };
      const created = await readApiResponse(await fetch(API_ROUTE, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: prompt.trim(), resolution, aspectRatio }),
        cache: 'no-store',
      }));
      if (!created.id) throw new Error('Replicate did not provide a prediction ID.');

      setPredictionId(created.id);
      let result = created;
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        if (result.status === 'succeeded') break;
        if (result.status === 'failed' || result.status === 'canceled') {
          throw new Error(result.error || `Generation ${result.status}.`);
        }
        setStatus(result.status === 'processing' ? 'Generating your video…' : 'Waiting for the model to start…');
        await sleep(2000);
        result = await readApiResponse(await fetch(`${API_ROUTE}/${encodeURIComponent(created.id)}`, {
          headers: { 'x-replicate-token': apiToken.trim() },
          cache: 'no-store',
        }));
      }
      if (result.status !== 'succeeded') {
        throw new Error('The request is still running. Check the prediction in Replicate to retrieve it.');
      }

      const output = result.outputUrl ||
        (typeof result.output === 'string' ? result.output : Array.isArray(result.output) ? result.output[0] : null);
      if (!output || !/^https:\/\//.test(output)) {
        throw new Error('Generation finished, but no downloadable video URL was returned.');
      }

      setVideoUrl(output);
      setStatus('Video generated successfully. Download it now; hosted outputs may expire.');
      onGenerationComplete?.({
        url: output,
        type: 'video',
        provider: 'replicate',
        model: 'wan-video/wan-2.2-5b-fast',
        prompt: prompt.trim(),
      });
    } catch (err) {
      const message = err?.message || 'Video generation failed.';
      setError(message);
      setStatus('');
      onGenerationError?.(message);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
      onGenerationEnd?.();
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#050505] text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Replicate video test</h2>
          <p className="mt-2 text-sm text-white/60">
            Generate an approximately 5-second video using Wan 2.2 5B Fast.
            Your token stays in memory during this session and is never saved by our app.
          </p>
        </div>
        <form onSubmit={handleGenerate} className="space-y-5 rounded-xl bg-[#0c0c0c] border border-white/10 p-5 sm:p-6">
          <label className="block text-sm font-semibold">
            Replicate API token
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiToken || ''}
              onChange={(event) => onTokenChange?.(event.target.value)}
              placeholder="r8_..."
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <p className="text-xs text-white/45">
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
              Create or view your Replicate token
            </a>. Never put the token in GitHub or share it in chat.
          </p>
          <label className="block text-sm font-semibold">
            Prompt
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">
              Resolution
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#171717] px-4 py-3 text-white"
              >
                <option value="480p">480p — listed $0.0125/video</option>
                <option value="720p">720p — listed $0.025/video</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Aspect ratio
              <select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#171717] px-4 py-3 text-white"
              >
                <option value="16:9">16:9 — landscape</option>
                <option value="9:16">9:16 — vertical</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-amber-200/80">
            Clicking Generate submits a billable request to Replicate. Displayed prices are estimates;
            confirm current prices on Replicate. Switching pages does not cancel a submitted job.
          </p>
          <button
            type="submit"
            disabled={generating || !prompt.trim() || !apiToken?.trim()}
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? 'Generating video…' : 'Generate video'}
          </button>
        </form>
        {(status || predictionId || error) && (
          <div aria-live="polite" className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            {status && <p>{status}</p>}
            {predictionId && (
              <p>
                Prediction: <a
                  className="text-cyan-300 underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://replicate.com/p/${encodeURIComponent(predictionId)}`}
                >{predictionId}</a>
              </p>
            )}
            {error && <p role="alert" className="text-red-300">{error}</p>}
          </div>
        )}
        {videoUrl && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="font-semibold">Generated video</h3>
            <video controls playsInline src={videoUrl} className="w-full rounded-lg bg-black" />
            <a href={videoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block rounded-lg bg-white px-4 py-2 text-black font-semibold">
              Open MP4 / Save video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
