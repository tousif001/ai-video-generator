import { useMemo, useState } from 'react';

const MODELS = ['Wan 2.1 / Wan 2.2', 'AnimateDiff', 'HunyuanVideo', 'CogVideoX', 'Generic Open Source'];
const STYLES = ['Cinematic Horror', 'Dark Finance Story', 'Anime Horror', 'Realistic Documentary', 'Brainrot Meme', 'Indian Suspense'];
const ASPECTS = ['9:16 YouTube Shorts', '16:9 YouTube', '1:1 Social'];

const sceneIdeas = {
  'Cinematic Horror': 'abandoned hospital corridor at 2 AM, flickering lights, wet floor, shadow figure at the end of the hallway',
  'Dark Finance Story': 'young man checking bank balance in a dark room, bills around him, phone light on his worried face',
  'Anime Horror': 'anime boy entering a cursed train station under a red moon, empty platform, black smoke in the distance',
  'Realistic Documentary': 'wildlife camera tracking a dangerous animal in a foggy forest, tense documentary style',
  'Brainrot Meme': 'low-poly businessman chased by a giant tax monster inside a surreal office',
  'Indian Suspense': 'young Indian man walking through a quiet narrow lane during a power cut, one flickering street light'
};

function buildPrompt({ style, model, subject, aspect, duration, motion }) {
  const defaultScene = sceneIdeas[style] || sceneIdeas['Cinematic Horror'];
  const cleanSubject = subject.trim() || defaultScene;
  const ratio = aspect.startsWith('9:16') ? 'vertical 9:16, 1080x1920' : aspect.startsWith('16:9') ? 'wide 16:9, 1920x1080' : 'square 1:1, 1080x1080';

  return `MODEL: ${model}\nSTYLE: ${style}\nDURATION: ${duration} seconds\nFORMAT: ${ratio}\n\nPROMPT:\n${cleanSubject}. Create a cinematic AI video with realistic movement, strong atmosphere, detailed environment, dramatic lighting, clean subject focus, no text on screen, no watermark.\n\nCAMERA MOTION:\n${motion || 'slow handheld push-in, subtle camera shake, tense pacing, smooth natural movement'}\n\nACTION:\nThe subject moves naturally through the scene, notices something strange, pauses with fear, then the final seconds reveal a disturbing detail in the background.\n\nNEGATIVE PROMPT:\nlow quality, blurry, distorted face, extra limbs, bad anatomy, text, captions, watermark, logo, oversaturated, flickering artifacts, broken hands, duplicate characters, unstable motion.`;
}

function buildWorkflow(model) {
  if (model.includes('Wan')) {
    return 'Use ComfyUI + Wan. Paste the prompt into your Wan text-to-video or image-to-video workflow. Keep clips 4-6 seconds. For consistent characters, create one image first and reuse it for image-to-video.';
  }
  if (model.includes('AnimateDiff')) {
    return 'Use ComfyUI or Automatic1111 + AnimateDiff. Add a Stable Diffusion checkpoint, motion module, and ControlNet/reference image for consistent characters.';
  }
  return 'Generate a reference image first, then use image-to-video. Keep each clip short, create multiple variations, and edit the best clips together in CapCut or DaVinci Resolve.';
}

export default function App() {
  const [model, setModel] = useState('Wan 2.1 / Wan 2.2');
  const [style, setStyle] = useState('Cinematic Horror');
  const [aspect, setAspect] = useState('9:16 YouTube Shorts');
  const [duration, setDuration] = useState('5');
  const [subject, setSubject] = useState('A terrified young man walking alone through an abandoned hospital corridor at night');
  const [motion, setMotion] = useState('slow handheld camera push-in, flickering lights, shadow movement behind the character, tense final reveal');
  const [copied, setCopied] = useState('');

  const prompt = useMemo(() => buildPrompt({ model, style, aspect, duration, subject, motion }), [model, style, aspect, duration, subject, motion]);
  const workflow = useMemo(() => buildWorkflow(model), [model]);

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1200);
    } catch {
      alert('Copy failed. Select the text manually.');
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">OPEN SOURCE AI VIDEO PROMPT STUDIO</p>
          <h1>AI Video Generator</h1>
          <p className="subtitle">Create prompts for Wan, AnimateDiff, HunyuanVideo, CogVideoX and ComfyUI workflows.</p>
        </div>
        <div className="miniCard">
          <strong>{duration}s</strong>
          <span>{aspect}</span>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Generator Settings</h2>
          <label>Video model
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>Style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>Aspect ratio
            <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
              {ASPECTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>Clip duration
            <input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>

          <label>Main scene
            <textarea rows="5" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>

          <label>Motion direction
            <textarea rows="5" value={motion} onChange={(e) => setMotion(e.target.value)} />
          </label>
        </div>

        <div className="panel output">
          <div className="topRow">
            <h2>Video Prompt</h2>
            <button onClick={() => copyText(prompt, 'prompt')}>{copied === 'prompt' ? 'Copied' : 'Copy Prompt'}</button>
          </div>
          <pre>{prompt}</pre>
        </div>
      </section>

      <section className="panel workflow">
        <div className="topRow">
          <h2>How to Generate Video</h2>
          <button onClick={() => copyText(workflow, 'workflow')}>{copied === 'workflow' ? 'Copied' : 'Copy'}</button>
        </div>
        <pre>{workflow}</pre>
      </section>
    </main>
  );
}
