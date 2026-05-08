# AI Video Generator Prompt Studio

A free React starter app for creating cinematic AI video prompts for open-source video generation workflows like Wan, AnimateDiff, HunyuanVideo, CogVideoX and ComfyUI.

> Important: this web app generates prompts and workflow instructions. Actual AI video generation requires a local/open-source backend such as ComfyUI with Wan or AnimateDiff installed.

## Features

- Prompt generator for horror, finance stories, anime, documentaries, brainrot and Indian suspense
- Model presets for Wan, AnimateDiff, HunyuanVideo and CogVideoX
- Copy buttons for prompts and workflow steps
- Creative responsive UI
- No paid API required

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal.

## Build

```bash
npm run build
npm run preview
```

## Recommended open-source video setup

### Option 1: Wan + ComfyUI

1. Install ComfyUI.
2. Download Wan video model files from the official model source.
3. Place model files in the correct ComfyUI model folders.
4. Use this app to create prompts.
5. Paste prompts into your Wan ComfyUI workflow.
6. Generate short clips, then edit them together in CapCut, DaVinci Resolve or Premiere Pro.

### Option 2: AnimateDiff + Stable Diffusion

1. Install ComfyUI or Automatic1111.
2. Add a Stable Diffusion checkpoint.
3. Add AnimateDiff motion modules.
4. Use ControlNet/reference images for character consistency.
5. Generate 4-6 second clips.

## Best settings for YouTube Shorts

- Aspect ratio: 9:16
- Clip length: 4-6 seconds
- Keep one subject per clip
- Use image-to-video for character consistency
- Generate multiple variations and choose the cleanest one
- Add voiceover, music and sound effects in your video editor

## License

MIT
