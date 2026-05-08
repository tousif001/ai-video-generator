import { useMemo, useState } from 'react';

const VIDEO_MODELS = ['kwaivgi/kling-v1.6-standard', 'minimax/video-01', 'lucataco/hunyuan-video'];
const IMAGE_MODELS = ['black-forest-labs/flux-schnell', 'stability-ai/sdxl', 'bytedance/sdxl-lightning-4step'];
const STYLES = ['Cinematic Horror', 'Dark Finance Story', 'Anime Horror', 'Realistic Documentary', 'Brainrot Meme', 'Indian Suspense'];
const ASPECTS = ['9:16 YouTube Shorts', '16:9 YouTube', '1:1 Social'];
const PROXY_URLS = ['http://127.0.0.1:8787/api/generate', 'http://localhost:8787/api/generate'];

function getPrompt(style, subject, aspect, duration) {
  const ratio = aspect.startsWith('9:16') ? 'vertical 9:16, 1080x1920' : aspect.startsWith('16:9') ? 'wide 16:9, 1920x1080' : 'square 1:1, 1080x1080';
  return `${subject}. ${style}. ${ratio}. ${duration} seconds. cinematic lighting, detailed environment, realistic motion, strong atmosphere, sharp focus, smooth camera movement, no text, no watermark, no logo.`;
}

function pretty(data) {
  return JSON.stringify(data, null, 2);
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
  const [style, setStyle] = useState('Cinematic Horror');
  const [aspect, setAspect] = useState('9:16 YouTube Shorts');
  const [duration, setDuration] = useState('5');
  const [subject, setSubject] = useState('A terrified young man walking alone through an abandoned hospital corridor at night');
  const [negative, setNegative] = useState('low quality, blurry, distorted face, extra limbs, bad anatomy, text, watermark, logo, bad motion');
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_video_api_key') || '');
  const [modelId, setModelId] = useState(localStorage.getItem('ai_video_model_id') || 'kwaivgi/kling-v1.6-standard');
  const [comfyUrl, setComfyUrl] = useState(localStorage.getItem('comfy_url') || 'http://127.0.0.1:8188');
  const [customPayload, setCustomPayload] = useState('{\n  "input": {\n    "prompt": "{{PROMPT}}",\n    "negative_prompt": "{{NEGATIVE}}"\n  }\n}');
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState('');

  const prompt = useMemo(() => getPrompt(style, subject, aspect, duration), [style, subject, aspect, duration]);
  const examples = tab === 'video' ? VIDEO_MODELS : IMAGE_MODELS;

  function changeTab(nextTab) {
    setTab(nextTab);
    if (nextTab === 'video') {
      setProvider('replicate-video');
      setModelId('kwaivgi/kling-v1.6-standard');
    } else {
      setProvider('replicate-image');
      setModelId('black-forest-labs/flux-schnell');
    }
  }

  function saveSettings() {
    localStorage.setItem('ai_video_api_key', apiKey);
    localStorage.setItem('ai_video_model_id', modelId);
    localStorage.setItem('comfy_url', comfyUrl);
    setStatus('Settings saved locally in this browser.');
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setStatus('Prompt copied.');
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
          <h1>Generate images and videos with APIs or local ComfyUI</h1>
          <p className="subtitle">Keep two CMD windows open: one for <b>npm run server</b> and one for <b>npm run dev</b>. The website sends generation requests to the local proxy on port 8787.</p>
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
              {tab === 'image' && <option value="replicate-image">Replicate Image</option>}
              {tab === 'image' && <option value="huggingface-image">Hugging Face Image</option>}
              {tab === 'image' && <option value="stability-image">Stability Image</option>}
            </select>
          </label>

          {provider !== 'comfyui-local' && (
            <>
              <label>API key/token
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste API token" />
              </label>
              <label>Model slug or version hash
                <input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="owner/model-name" />
              </label>
              <div className="exampleBox">
                <p className="note"><b>Examples:</b></p>
                <div className="exampleBtns">
                  {examples.map((item) => <button key={item} onClick={() => setModelId(item)}>{item}</button>)}
                </div>
              </div>
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
        <pre>{result || 'Result will appear here.'}</pre>
      </section>
    </main>
  );
}
