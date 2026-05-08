# AI Video Generator Prompt Studio

A React dashboard for creating prompts and sending image/video generation requests to hosted APIs or a local ComfyUI server.

> Important: do not commit API tokens to GitHub. Paste keys only inside the running website UI. The app saves them in your browser local storage, not in the repository.

## Features

- Video generation panel
- Image generation panel
- Prompt builder for horror, finance stories, anime, documentaries, brainrot and Indian suspense
- Provider options for Replicate, Hugging Face, Stability image API and Local ComfyUI
- API payload editor
- Copy prompt button
- Result/status panel

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal, usually:

```text
http://localhost:5173/
```

## How to add your API token safely

1. Start the app with `npm run dev`.
2. Open `http://localhost:5173/`.
3. Select the provider, for example `Replicate Video`.
4. Paste your API token in the API key box.
5. Add the model/version ID required by that provider.
6. Click `Save Settings`.
7. Click `Generate Video` or `Generate Image`.

Do not paste real API tokens into files like `README.md`, `App.jsx`, `.env`, or GitHub commits.

## If your token was exposed

If you pasted a real token in a public place, revoke it from the provider dashboard and create a new token.

## Local free generation with ComfyUI

For totally free local generation:

1. Install ComfyUI.
2. Install a supported image/video workflow such as Wan or AnimateDiff.
3. Run ComfyUI locally.
4. In this app, choose `Local ComfyUI`.
5. Use this URL:

```text
http://127.0.0.1:8188
```

6. Paste your valid ComfyUI workflow JSON in the payload box.
7. Click Generate.

## Build

```bash
npm run build
npm run preview
```

## License

MIT
