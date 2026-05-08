import { useMemo, useState } from 'react';

const VIDEO_PROVIDERS = [
  {
    id: 'replicate-video',
    name: 'Replicate Video',
    type: 'video',
    apiKeyName: 'Replicate API token',
    docs: 'https://replicate.com/docs',
    note: 'Use a Replicate model slug like owner/model-name OR a long version hash. Model slug is easier.'
  },
  {
    id: 'huggingface-video',
    name: 'Hugging Face Video',
    type: 'video',
    apiKeyName: 'Hugging Face token',
    docs: 'https://huggingface.co/docs/api-inference/index',
    note: 'Works only with models enabled for Inference API. Paste model id like owner/model-name.'
  },
  {
    id: 'comfyui-local',
    name: 'Local ComfyUI',
    type: 'video',
    apiKeyName: 'No key needed',
    docs: 'https://github.com/comfyanonymous/ComfyUI',
    note: 'Fastest free option if you have GPU. Requires ComfyUI running locally.'
  }
];

const IMAGE_PROVIDERS = [
  {
    id: 'stability-image',
    name: 'Stability Image API',
    type: 'image',
    apiKeyName: 'Stability API key',
    docs: 'https://platform.stability.ai/docs',
    note: 'Good for fast image generation. Needs paid/free credits from Stability.'
  },
  {
    id: 'huggingface-image',
    name: 'Hugging Face Image',
    type: 'image',
    apiKeyName: 'Hugging Face token',
    docs: 'https://huggingface.co/docs/api-inference/index',
    note: 'Use Stable Diffusion / Flux style model ids that support image generation.'
  },
  {
    id: 'replicate-image',
    name: 'Replicate Image',
    type: 'image',
    apiKeyName: 'Replicate API token',
    docs: 'https://replicate.com/docs',
    note: 'Use a Replicate model slug like owner/model-name OR a long version hash. Model slug is easier.'
  }
];

const STYLES = ['Cinematic Horror', 'Dark Finance Story', 'Anime Horror', 'Realistic Documentary', 'Brainrot Meme', 'Indian Suspense'];
const ASPECTS = ['9:16 YouTube Shorts', '16:9 YouTube', '1:1 Social'];
const VIDEO_MODEL_EXAMPLES = ['kwaivgi/kling-v1.6-standard', 'minimax/video-01', 'lucataco/hunyuan-video'];
const IMAGE_MODEL_EXAMPLES = ['black-forest-labs/flux-schnell', 'stability-ai/sdxl', 'bytedance/sdxl-lightning-4step'];

function getPrompt(style, subject, aspect, duration) {
  const ratio = aspect.startsWith('9:16') ? 'vertical 9:16, 1080x1920' : aspect.startsWith('16:9') ? 'wide 16:9, 1920x1080' : 'square 1:1, 1080x1080';
  return `${subject}. ${style}. ${ratio}. ${duration} seconds. cinematic lighting, detailed environment, realistic motion, strong atmosphere, sharp focus, smooth camera movement, no text, no watermark, no logo.`;
}

function safeJson(value) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

async function callJsonApi({ url, method = 'POST', token, body, headers = {} }) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}\n${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isReplicateVersionHash(value) {
  return /^[a-f0-9]{32,}$/i.test(value.trim());
}

function isReplicateModelSlug(value) {
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value.trim());
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
  const [modelId, setModelId] = useState(localStorage.getItem('ai_video_model_id') || '');
  const [comfyUrl, setComfyUrl] = useState(localStorage.getItem('comfy_url') || 'http://127.0.0.1:8188');
  const [customPayload, setCustomPayload] = useState('{\n  "input": {\n    "prompt": "{{PROMPT}}",\n    "negative_prompt": "{{NEGATIVE}}"\n  }\n}');
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState('');

  const providers = tab === 'video' ? VIDEO_PROVIDERS : IMAGE_PROVIDERS;
  const activeProvider = providers.find((item) => item.id === provider) || providers[0];
  const prompt = useMemo(() => getPrompt(style, subject, aspect, duration), [style, subject, aspect, duration]);
  const examples = tab === 'video' ? VIDEO_MODEL_EXAMPLES : IMAGE_MODEL_EXAMPLES;

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
    setStatus('Generating request...');
    setResult('');

    try {
      if (provider === 'replicate-video' || provider === 'replicate-image') {
        if (!apiKey) throw new Error('Add your Replicate API token first.');
        if (!modelId) throw new Error('Add a Replicate model slug like owner/model-name, or a long version hash.');
        const payload = buildPayload();
        const cleanModel = modelId.trim();
        let url = 'https://api.replicate.com/v1/predictions';
        let body = payload;

        if (isReplicateModelSlug(cleanModel)) {
          const [owner, name] = cleanModel.split('/');
          url = `https://api.replicate.com/v1/models/${owner}/${name}/predictions`;
          body = payload;
        } else if (isReplicateVersionHash(cleanModel)) {
          body = { version: cleanModel, ...payload };
        } else {
          throw new Error('Replicate model must look like owner/model-name or a long version hash. Example: black-forest-labs/flux-schnell');
        }

        const data = await callJsonApi({ url, token: apiKey, body });
        setResult(safeJson(JSON.stringify(data, null, 2)));
        setStatus('Replicate prediction created. Copy/open the URLs from the result to track output.');
        return;
      }

      if (provider === 'huggingface-video' || provider === 'huggingface-image') {
        if (!apiKey) throw new Error('Add your Hugging Face token first.');
        if (!modelId) throw new Error('Add Hugging Face model id first, like owner/model-name.');
        const data = await callJsonApi({
          url: `https://api-inference.huggingface.co/models/${modelId}`,
          token: apiKey,
          body: { inputs: prompt, parameters: { negative_prompt: negative } }
        });
        setResult(typeof data === 'string' ? data : safeJson(JSON.stringify(data, null, 2)));
        setStatus('Hugging Face request finished. Some models return a file/blob or require waiting.');
        return;
      }

      if (provider === 'stability-image') {
        if (!apiKey) throw new Error('Add your Stability API key first.');
        const data = await callJsonApi({
          url: 'https://api.stability.ai/v2beta/stable-image/generate/core',
          token: apiKey,
          headers: { Accept: 'application/json' },
          body: { prompt, negative_prompt: negative, aspect_ratio: aspect.startsWith('9:16') ? '9:16' : aspect.startsWith('16:9') ? '16:9' : '1:1', output_format: 'png' }
        });
        setResult(safeJson(JSON.stringify(data, null, 2)));
        setStatus('Stability image request sent.');
        return;
      }

      if (provider === 'comfyui-local') {
        const data = await callJsonApi({
          url: `${comfyUrl.replace(/\/$/, '')}/prompt`,
          body: buildPayload()
        });
        setResult(safeJson(JSON.stringify(data, null, 2)));
        setStatus('ComfyUI prompt sent. Your workflow must be valid ComfyUI JSON.');
        return;
      }
    } catch (error) {
      setStatus('Error');
      setResult(error.message || String(error));
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">FAST AI IMAGE + VIDEO PANEL</p>
          <h1>Generate images and videos with APIs or local ComfyUI</h1>
          <p className="subtitle">Use hosted APIs for speed or connect your own free open-source ComfyUI setup. API keys are saved only in your browser local storage.</p>
          <div className="tabs">
            <button className={tab === 'video' ? 'active' : ''} onClick={() => { setTab('video'); setProvider('replicate-video'); }}>Video</button>
            <button className={tab === 'image' ? 'active' : ''} onClick={() => { setTab('image'); setProvider('stability-image'); }}>Image</button>
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
          <label>Generation provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <p className="note"><b>{activeProvider.name}</b>: {activeProvider.note}</p>
          <a className="docLink" href={activeProvider.docs} target="_blank" rel="noreferrer">Open provider docs</a>

          {provider !== 'comfyui-local' && (
            <>
              <label>{activeProvider.apiKeyName}
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste API key/token" />
              </label>
              <label>Model slug or version hash
                <input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="Example: owner/model-name" />
              </label>
              {(provider === 'replicate-video' || provider === 'replicate-image') && (
                <div className="exampleBox">
                  <p className="note"><b>No version?</b> Use a model slug instead. Try one example:</p>
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
        <pre>{result || 'Result will appear here. For hosted APIs, you may receive a prediction/status URL first. For ComfyUI, your local workflow must already be installed and working.'}</pre>
      </section>
    </main>
  );
}
