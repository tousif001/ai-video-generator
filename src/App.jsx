import { useMemo, useState } from 'react';

const VIDEO_MODELS = ['kwaivgi/kling-v1.6-standard', 'minimax/video-01', 'lucataco/hunyuan-video'];
const IMAGE_MODELS = [];
const STYLES = ['Cinematic Horror', 'Dark Finance Story', 'Anime Horror', 'Realistic Documentary', 'Brainrot Meme', 'Indian Suspense'];
const ASPECTS = ['9:16 YouTube Shorts', '16:9 YouTube', '1:1 Social'];
const PROXY_URLS = ['http://127.0.0.1:8787/api/generate', 'http://localhost:8787/api/generate'];

const FINANCE_SCRIPT = `He worked every day but still felt broke.
At first, earning money felt exciting.
Then small habits started leaking his money.
Every harmless purchase became part of a bigger problem.
One night, he checked his bank statement and understood the truth.
He was not broke because he earned too little.
He was broke because his money had no plan.
Revenue is loud. Profit is silent. Save this before your next money decision.`;

function getPrompt(style, subject, aspect, duration) {
  const ratio = aspect.startsWith('9:16') ? 'vertical 9:16, 1080x1920' : aspect.startsWith('16:9') ? 'wide 16:9, 1920x1080' : 'square 1:1, 1080x1080';
  return `${subject}. ${style}. ${ratio}. ${duration} seconds. cinematic lighting, detailed environment, realistic motion, strong atmosphere, sharp focus, smooth camera movement, no text, no watermark, no logo.`;
}

function pretty(data) {
  return JSON.stringify(data, null, 2);
}

function splitScriptIntoScenes(script, maxScenes = 8) {
  const lines = script
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  if (lines.length <= maxScenes) return lines;

  const scenes = [];
  const chunkSize = Math.ceil(lines.length / maxScenes);
  for (let i = 0; i < lines.length; i += chunkSize) {
    scenes.push(lines.slice(i, i + chunkSize).join(' '));
  }
  return scenes.slice(0, maxScenes);
}

function makeScenePrompt({ line, index, projectTitle, style, aspect, sceneDuration }) {
  const ratio = aspect.startsWith('9:16') ? 'vertical 9:16, 1080x1920' : aspect.startsWith('16:9') ? 'wide 16:9, 1920x1080' : 'square 1:1, 1080x1080';
  return `Scene ${index + 1} for a text-to-video project titled "${projectTitle}". Voiceover line: "${line}". Create a ${sceneDuration}-second ${style.toLowerCase()} shot. ${ratio}. Visualize the meaning of the line through cinematic action, natural human expression, realistic motion, dramatic lighting, strong atmosphere, clean composition, no text on screen, no watermark, no logo. Camera movement should be smooth and intentional, with one clear subject and one clear emotional beat.`;
}

async function postToProxy(body) {
  let lastError = null;
  for (const url of PROXY_URLS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return { response, data, url };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Could not reach local proxy.');
}

export default function App() {
  const [tab, setTab] = useState('video');
  const [provider, setProvider] = useState('replicate-video');
  const [style, setStyle] = useState('Dark Finance Story');
  const [aspect, setAspect] = useState('9:16 YouTube Shorts');
  const [duration, setDuration] = useState('5');
  const [subject, setSubject] = useState('A tired young man checking his bank balance at night, unpaid bills on the table, emotional finance story mood');
  const [negative, setNegative] = useState('low quality, blurry, distorted face, extra limbs, bad anatomy, text, watermark, logo, bad motion');
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_video_api_key') || '');
  const [modelId, setModelId] = useState(localStorage.getItem('ai_video_model_id') || 'minimax/video-01');
  const [comfyUrl, setComfyUrl] = useState(localStorage.getItem('comfy_url') || 'http://127.0.0.1:8188');
  const [customPayload, setCustomPayload] = useState('{\n  "input": {\n    "prompt": "{{PROMPT}}",\n    "negative_prompt": "{{NEGATIVE}}"\n  }\n}');
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState('');
  const [projectTitle, setProjectTitle] = useState('Revenue Is Loud, Profit Is Silent');
  const [projectScript, setProjectScript] = useState(FINANCE_SCRIPT);
  const [sceneDuration, setSceneDuration] = useState('5');
  const [maxScenes, setMaxScenes] = useState('8');

  const prompt = useMemo(() => getPrompt(style, subject, aspect, duration), [style, subject, aspect, duration]);
  const examples = tab === 'video' ? VIDEO_MODELS : IMAGE_MODELS;

  const projectScenes = useMemo(() => {
    return splitScriptIntoScenes(projectScript, Number(maxScenes) || 8).map((line, index) => ({
      line,
      prompt: makeScenePrompt({ line, index, projectTitle, style, aspect, sceneDuration })
    }));
  }, [projectScript, maxScenes, projectTitle, style, aspect, sceneDuration]);

  function changeTab(nextTab) {
    setTab(nextTab);
    if (nextTab === 'video') {
      setProvider('replicate-video');
      setModelId('minimax/video-01');
    } else {
      setProvider('stability-image');
      setModelId('');
    }
  }

  function saveSettings() {
    localStorage.setItem('ai_video_api_key', apiKey);
    localStorage.setItem('ai_video_model_id', modelId);
    localStorage.setItem('comfy_url', comfyUrl);
    setStatus('Settings saved locally in this browser.');
  }

  async function copyText(text, message = 'Copied.') {
    await navigator.clipboard.writeText(text);
    setStatus(message);
  }

  async function copyPrompt() {
    await copyText(prompt, 'Prompt copied.');
  }

  function useScenePrompt(scenePrompt) {
    setTab('video');
    setSubject(scenePrompt);
    setDuration(sceneDuration);
    setProvider('replicate-video');
    setStatus('Scene prompt loaded into generator. Click Generate Video when ready.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyAllScenes() {
    const text = projectScenes.map((scene, index) => `SCENE ${index + 1}\nVOICEOVER: ${scene.line}\nPROMPT: ${scene.prompt}`).join('\n\n');
    await copyText(text, 'All scene prompts copied.');
  }

  function buildPayload() {
    const replaced = customPayload
      .replaceAll('{{PROMPT}}', prompt.replaceAll('"', '\\"'))
      .replaceAll('{{NEGATIVE}}', negative.replaceAll('"', '\\"'));
    return JSON.parse(replaced);
  }

  async function generate() {
    setStatus('Sending request to local proxy on port 8787...');
    setResult('');

    try {
      const payload = provider === 'stability-image'
        ? {
            prompt,
            negative_prompt: negative,
            aspect_ratio: aspect.startsWith('9:16') ? '9:16' : aspect.startsWith('16:9') ? '16:9' : '1:1',
            output_format: 'png'
          }
        : buildPayload();

      const { response, data, url } = await postToProxy({ provider, apiKey, modelId, comfyUrl, payload });
      setResult(pretty({ proxyUrl: url, ...data }));

      if (!response.ok || data.ok === false) {
        setStatus('Error from API. Check the result box below.');
      } else {
        setStatus('Request sent successfully. If this is video, wait and open the status/output URL from the result.');
      }
    } catch (error) {
      setStatus('Local proxy is not running on port 8787. Start it in a separate CMD with: npm run server');
      setResult(`Failed to reach local proxy.\n\nFix:\n1. Open a NEW CMD window\n2. cd C:\\Automation\\ai-video-generator\n3. npm run server\n4. Keep that CMD open\n5. Come back here and click Generate again\n\nTest link: http://127.0.0.1:8787/health\n\nError: ${error.message || String(error)}`);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">FAST AI IMAGE + VIDEO PANEL</p>
          <h1>Generate text-to-video projects with scripts, scenes, and APIs</h1>
          <p className="subtitle">Paste a project script, convert it into scene prompts, then generate each 5-second clip through Replicate, Hugging Face, Stability, or local ComfyUI.</p>
          <div className="tabs">
            <button className={tab === 'video' ? 'active' : ''} onClick={() => changeTab('video')}>Video</button>
            <button className={tab === 'image' ? 'active' : ''} onClick={() => changeTab('image')}>Image</button>
          </div>
        </div>
        <div className="miniCard">
          <strong>{duration}s</strong>
          <span>{aspect}</span>
        </div>
      </section>

      <section className="grid">
        <div className="panel controls">
          <h2>1. Prompt Settings</h2>
          <label>Style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>{STYLES.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label>Aspect
            <select value={aspect} onChange={(e) => setAspect(e.target.value)}>{ASPECTS.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label>Duration
            <input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
          <label>Main prompt
            <textarea rows="5" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>Negative prompt
            <textarea rows="4" value={negative} onChange={(e) => setNegative(e.target.value)} />
          </label>
          <button onClick={copyPrompt}>Copy Prompt</button>
        </div>

        <div className="panel controls">
          <h2>2. Provider</h2>
          <label>Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {tab === 'video' && <option value="replicate-video">Replicate Video</option>}
              {tab === 'video' && <option value="huggingface-video">Hugging Face Video</option>}
              {tab === 'video' && <option value="comfyui-local">Local ComfyUI</option>}
              {tab === 'image' && <option value="stability-image">Stability Image - recommended</option>}
              {tab === 'image' && <option value="replicate-image">Replicate Image - paste verified model slug only</option>}
              {tab === 'image' && <option value="huggingface-image">Hugging Face Image</option>}
            </select>
          </label>

          {provider !== 'comfyui-local' && (
            <>
              <label>API key/token
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste API token" />
              </label>
              {provider !== 'stability-image' && (
                <label>Model slug or version hash
                  <input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="Copy exact slug from provider page, like owner/model-name" />
                </label>
              )}
              {provider === 'replicate-image' && (
                <div className="exampleBox">
                  <p className="note"><b>Important:</b> Replicate returns 404 if the slug is wrong. Open the model page on Replicate and copy the exact owner/model-name from the URL.</p>
                </div>
              )}
              {provider === 'stability-image' && (
                <div className="exampleBox">
                  <p className="note"><b>Recommended for images:</b> Stability Image does not need a model slug. Just paste your Stability API key and click Generate Image.</p>
                </div>
              )}
              {provider === 'replicate-video' && examples.length > 0 && (
                <div className="exampleBox">
                  <p className="note"><b>Video examples:</b></p>
                  <div className="exampleBtns">
                    {examples.map((item) => <button key={item} onClick={() => setModelId(item)}>{item}</button>)}
                  </div>
                </div>
              )}
            </>
          )}

          {provider === 'comfyui-local' && (
            <label>ComfyUI URL
              <input value={comfyUrl} onChange={(e) => setComfyUrl(e.target.value)} />
            </label>
          )}
          <button onClick={saveSettings}>Save Settings</button>
        </div>
      </section>

      <section className="panel workflow">
        <div className="topRow">
          <h2>Project Script → Text-to-Video Scenes</h2>
          <button onClick={copyAllScenes}>Copy All Scene Prompts</button>
        </div>
        <div className="grid">
          <div className="controls">
            <label>Project title
              <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
            </label>
            <label>Scene duration
              <input value={sceneDuration} onChange={(e) => setSceneDuration(e.target.value)} />
            </label>
            <label>Maximum scenes
              <input value={maxScenes} onChange={(e) => setMaxScenes(e.target.value)} />
            </label>
            <button onClick={() => { setProjectScript(FINANCE_SCRIPT); setStyle('Dark Finance Story'); setAspect('9:16 YouTube Shorts'); }}>Load Finance Script</button>
          </div>
          <label>Paste full project script / voiceover lines
            <textarea rows="10" value={projectScript} onChange={(e) => setProjectScript(e.target.value)} />
          </label>
        </div>

        <div className="sceneList">
          {projectScenes.map((scene, index) => (
            <div className="sceneCard" key={`${scene.line}-${index}`}>
              <div className="topRow">
                <h3>Scene {index + 1}</h3>
                <div className="tabs">
                  <button onClick={() => useScenePrompt(scene.prompt)}>Use for Generate</button>
                  <button onClick={() => copyText(scene.prompt, `Scene ${index + 1} prompt copied.`)}>Copy</button>
                </div>
              </div>
              <p className="note"><b>Voiceover:</b> {scene.line}</p>
              <pre>{scene.prompt}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="grid wideGrid">
        <div className="panel output">
          <div className="topRow">
            <h2>Generated Prompt</h2>
            <button onClick={copyPrompt}>Copy</button>
          </div>
          <pre>{prompt}</pre>
        </div>

        <div className="panel output">
          <div className="topRow">
            <h2>API Payload Template</h2>
          </div>
          <textarea className="payloadBox" rows="14" value={customPayload} onChange={(e) => setCustomPayload(e.target.value)} />
          <p className="note">Use {'{{PROMPT}}'} and {'{{NEGATIVE}}'} placeholders. For ComfyUI, paste your full workflow JSON here.</p>
        </div>
      </section>

      <section className="panel resultPanel">
        <div className="topRow">
          <h2>3. Generate</h2>
          <button className="generate" onClick={generate}>Generate {tab === 'video' ? 'Video' : 'Image'}</button>
        </div>
        <p className="status">Status: {status}</p>
        <pre>{result || 'Result will appear here. For a full project, generate one scene at a time and combine the clips in CapCut.'}</pre>
      </section>
    </main>
  );
}
