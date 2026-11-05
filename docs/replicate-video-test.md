# First Replicate video test (BYOK)

This **draft/experimental** feature adds a second Video Studio provider without changing MuAPI video generation. It is deliberately limited to one Replicate model, **wan-video/wan-2.2-5b-fast**.

## Run the Next.js web studio

1. From this repository, initialize the three workspace submodules and install/build dependencies with `npm run setup`.
2. Start `npm run dev` (web server on port 3000).
3. Open `/studio`. If you have no MuAPI API key, choose **Try Replicate video without a MuAPI key**.
4. Open **Video Studio**, then choose **Replicate (Wan 2.2 Fast)** in the provider dropdown.
5. Obtain a token from <https://replicate.com/account/api-tokens> and paste it **only into the website form**.
6. Review the prompt, resolution, and estimate before clicking **Generate video**.
7. Once completed, click **Open MP4 / Save video**. Replicate API outputs may expire, so save promptly.

## Test parameters

- One model: wan-video/wan-2.2-5b-fast (official Replicate endpoint).
- Text-to-video only in this first pass; reference-image uploads are not implemented.
- 81 frames at 16 FPS (~5 seconds). Select 480p/720p and 16:9/9:16.
- The estimates displayed in the UI are published per-output figures as of November 2026, **not a quote or guarantee**.
- Generation is billable and requires explicit user action. It is **not** automatically retried or submitted on mount.
- A generated job may continue to run if the browser is closed; look it up via the prediction link or in your Replicate dashboard.

## Token and security behavior

- The Replicate token is held **only in React memory**, not persisted in localStorage, sessionStorage, cookies, Git, or the server database.
- It is passed over the same-origin HTTPS request header to an allowlisted Next.js proxy, and then to Replicate with Bearer authorization.
- Tokens are not written to application logs by the new code. The proxy does not accept arbitrary upstream URLs or arbitrary model IDs.
- **Do not expose a public production version without further rate limiting, audit logging (excluding secrets), abuse controls, and security review.**
- The original MuAPI key handling remains unchanged. This PR does not claim to remediate that legacy flow.

## Rollback

This work is isolated on `feature/video-multi-provider-byok-20261105`, based on `main`.

- Before merge: close the pull request and leave `main` unchanged.
- After merge: use GitHub's **Revert** action on the merge commit (or create an equivalent revert PR).
- Do not deploy/merge until dependency build and one manual generation test succeed.

## Provider API references

- <https://replicate.com/wan-video/wan-2.2-5b-fast/api/schema>
- <https://replicate.com/docs/reference/http>
