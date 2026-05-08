import { useMemo, useState } from 'react';
import { Copy, Film, Wand2, RefreshCcw, Sparkles, Github, Video, Settings } from 'lucide-react';

const MODELS = ['Wan 2.1 / Wan 2.2', 'AnimateDiff', 'HunyuanVideo', 'CogVideoX', 'Generic Open Source'];
const STYLES = ['Cinematic Horror', 'Dark Finance Story', 'Anime Horror', 'Realistic Documentary', 'Brainrot Meme', 'Indian Suspense'];
const ASPECTS = ['9:16 YouTube Shorts', '16:9 YouTube', '1:1 Social'];

const sceneIdeas = {
  'Cinematic Horror': [
    'abandoned hospital corridor at 2 AM',
    'lonely village road under a broken streetlight',
    'old house basement with wet walls',
    'empty school hallway after midnight',
    'foggy forest path with distant whispers'
  ],
  'Dark Finance Story': [
    'young man checking bank balance in a dark room',
    'office worker surrounded by unpaid bills',
    'small business owner staring at empty cash drawer',
    'late night desk with laptop and expense notes',
    'person deleting shopping apps from phone'
  ],
  'Anime Horror': [
    'anime boy entering a cursed train station',
    'schoolgirl hearing footsteps behind classroom door',
    'red moon above an empty city street',
    'shadow monster reflected in rainy window',
    'old shrine gate with floating black smoke'
  ],
  'Realistic Documentary': [
    'wildlife camera tracking a dangerous animal',
    'stormy mountain rescue scene',
    'ancient ruins discovered in desert sand',
    'deep ocean research vessel at night',
    'firefighter entering smoke-filled building'
  ],
  'Brainrot Meme': [
    'low-poly businessman chased by giant tax monster',
    'confused stickman arguing with a talking ATM',
    'three NPC characters dancing in a cursed office',
    'surreal scooter chase through a finance chart',
    'cartoon boss fight against monthly expenses'
  ],
  'Indian Suspense': [
    'young Indian man walking through a quiet narrow lane',
    'small rural house during a power cut',
    'empty railway platform at midnight',
    'old haveli gate opening by itself',
    'rainy street with one flickering tea stall light'
  ]
};

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function buildPrompt({ style, model, subject, aspect, duration, motion }) {
  const seed = Date.now().toString().slice(-6);
  const idea = pick(sceneIdeas[style] || sceneIdeas['Cinematic Horror'], Number(seed));
  const cleanSubject = subject.trim() || idea;
  const ratio = aspect.startsWith('9:16') ? 'vertical 9:16, 1080x1920' : aspect.startsWith('16:9') ? 'wide 16:9, 1920x1080' : 'square 1:1, 1080x1080';
  const modelNote = model.includes('AnimateDiff')
    ? 'stable character identity, smooth looping motion, animation-friendly composition'
    : model.includes('Wan')
      ? 'high quality open-source text-to-video / image-to-video generation, realistic temporal consistency'
      : 'open-source video generation compatible prompt, strong motion clarity';

  return `Subject: ${cleanSubject}\n\nCreate a ${duration}-second ${style.toLowerCase()} AI video. Scene takes place in ${idea}. ${ratio}. ${modelNote}.\n\nVisual style: cinematic lighting, detailed environment, realistic shadows, strong atmosphere, no text on screen, no watermark, high detail, sharp subject focus, natural depth of field.\n\nCamera and motion: ${motion || 'slow handheld push-in, subtle shake, realistic character movement, tense pacing, smooth camera transition'}.\n\nAction: the subject moves naturally through the scene, notices something unusual, pauses with visible fear or tension, then the camera reveals a disturbing detail in the background during the final seconds.\n\nAudio direction: low rumble ambience, distant echo, soft breathing, sudden silence before the final reveal.\n\nNegative prompt: low quality, blurry, distorted face, extra limbs, bad anatomy, text, captions, watermark, logo, oversaturated colors, flickering artifacts, broken hands, duplicate characters, unstable camera, unrealistic motion.\n\nSeed note: ${seed}`;
}

function buildWorkflow({ model }) {
  if (model.includes('Wan')) {
    return `Recommended ComfyUI workflow:\n1. Install ComfyUI.\n2. Add Wan video model files to ComfyUI/models.\n3. Use text-to-video for first tests or image-to-video for character consistency.\n4. Set duration 4-6 seconds per clip.\n5. Generate multiple clips and edit in CapCut/DaVinci Resolve.\n6. Use the same character image as reference for every scene.`;
  }
  if (model.includes('AnimateDiff')) {
    return `Recommended AnimateDiff workflow:\n1. Install ComfyUI or Automatic1111.\n2. Add Stable Diffusion checkpoint + AnimateDiff motion module.\n3. Use reference image / ControlNet for character consistency.\n4. Generate 16-32 frame clips.\n5. Upscale/interpolate if needed.\n6. Edit clips with voiceover and sound effects.`;
  }
  return `Recommended open-source workflow:\n1. Generate a strong prompt.\n2. Create a reference image for the main character.\n3. Use image-to-video when possible.\n4. Keep clips short, around 4-6 seconds.\n5. Combine clips in a video editor.\n6. Reuse seed/style/character description for consistency.`;
}

export default function App() {
  const [style, setStyle] = useState('Cinematic Horror');
  const [model, setModel] = useState('Wan 2.1 / Wan 2.2');
  const [aspect, setAspect] = useState('9:16 YouTube Shorts');
  const [duration, setDuration] = useState('5');
  const [subject, setSubject] = useState('terrified young man walking alone through an abandoned hospital corridor');
  const [motion, setMotion] = useState('slow handheld camera push-in, flickering lights, shadow movement behind the character, tense final reveal');
  const [copied, setCopied] = useState('');

  const prompt = useMemo(() => buildPrompt({ style, model, subject, aspect, duration, motion }), [style, model, subject, aspect, duration, motion]);
  const workflow = useMemo(() => buildWorkflow({ model }), [model]);

  async function copyText(text, label) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1600);
  }

  function randomize() {
    const nextStyle = pick(STYLES, Math.floor(Math.random() * 9999));
    setStyle(nextStyle);
    setSubject(pick(sceneIdeas[nextStyle], Math.floor(Math.random() * 9999)));
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow"><Sparkles size={16} /> Open Source AI Video Prompt Studio</p>
          <h1>Generate video prompts for Wan, AnimateDiff, Hunyuan and ComfyUI.</h1>
          <p className="subtitle">A free starter app for making cinematic text-to-video and image-to-video prompts. No paid API required.</p>
          <div className="heroActions">
            <button onClick={randomize}><RefreshCcw size={18} /> Random idea</button>
            <a href="https://github.com/tousif001/ai-video-generator" target="_blank" rel="noreferrer"><Github size={18} /> GitHub Repo</a>
          </div>
        </div>
        <div className="statCard">
          <Video size={34} />
          <strong>{duration}s</strong>
          <span>{aspect}</span>
        </div>
      </section>

      <section className="grid">
        <div className="panel controls">
          <h2><Settings size={20} /> Generator Settings</h2>
          <label>Video model
            <select value={model} onChange={(e) => setModel(e.target.value)}>{MODELS.map(v => <option key={v}>{v}</option>)}</select>
          </label>
          <label>Style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>{STYLES.map(v => <option key={v}>{v}</option>)}</select>
          </label>
          <label>Aspect ratio
            <select value={aspect} onChange={(e) => setAspect(e.target.value)}>{ASPECTS.map(v => <option key={v}>{v}</option>)}</select>
          </label>
          <label>Clip duration in seconds
            <input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
          <label>Main subject / scene
            <textarea value={subject} onChange={(e) => setSubject(e.target.value)} rows={4} />
          </label>
          <label>Motion direction
            <textarea value={motion} onChange={(e) => setMotion(e.target.value)} rows={4} />
          </label>
        </div>

        <div className="panel output">
          <div className="panelHeader">
            <h2><Wand2 size={20} /> Video Prompt</h2>
            <button className="copy" onClick={() => copyText(prompt, 'prompt')}><Copy size={17} /> {copied === 'prompt' ? 'Copied' : 'Copy'}</button>
          </div>
          <pre>{prompt}</pre>
        </div>
      </section>

      <section className="panel workflow">
        <div className="panelHeader">
          <h2><Film size={20} /> Open Source Workflow</h2>
          <button className="copy" onClick={() => copyText(workflow, 'workflow')}><Copy size={17} /> {copied === 'workflow' ? 'Copied' : 'Copy'}</button>
        </div>
        <pre>{workflow}</pre>
      </section>
    </main>
  );
}
