import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8787;
const HOST = '127.0.0.1';

// Backend is bound to 127.0.0.1, so it is local-only.
// Allowing CORS here avoids browser localhost/127.0.0.1 origin mismatch issues.
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'AI generation proxy running locally only' });
});

async function forwardJson({ url, token, body, headers = {}, method = 'POST' }) {
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
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    requestUrl: url,
    data
  };
}

async function forwardStabilityImage({ url, token, payload = {} }) {
  const form = new FormData();
  form.append('prompt', payload.prompt || '');
  if (payload.negative_prompt) form.append('negative_prompt', payload.negative_prompt);
  form.append('aspect_ratio', payload.aspect_ratio || '1:1');
  form.append('output_format', payload.output_format || 'png');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    body: form
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    requestUrl: url,
    data
  };
}

function isReplicateVersionHash(value) {
  return /^[a-f0-9]{32,}$/i.test(String(value || '').trim());
}

function isReplicateModelSlug(value) {
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(String(value || '').trim());
}

function normalizeReplicatePayload(payload = {}) {
  if (payload.input) return payload;
  return { input: payload };
}

app.post('/api/generate', async (req, res) => {
  try {
    const { provider, apiKey, modelId, payload, comfyUrl } = req.body;

    if (!provider) return res.status(400).json({ error: 'Missing provider' });

    if (provider === 'replicate-video' || provider === 'replicate-image') {
      if (!apiKey) return res.status(400).json({ error: 'Missing Replicate API token' });
      if (!modelId) return res.status(400).json({ error: 'Missing Replicate model slug or version hash' });

      const cleanModel = String(modelId).trim();
      let url = 'https://api.replicate.com/v1/predictions';
      let body = normalizeReplicatePayload(payload || {});

      if (isReplicateModelSlug(cleanModel)) {
        const [owner, name] = cleanModel.split('/').map(encodeURIComponent);
        url = `https://api.replicate.com/v1/models/${owner}/${name}/predictions`;
      } else if (isReplicateVersionHash(cleanModel)) {
        body = { version: cleanModel, ...body };
      } else {
        return res.status(400).json({ error: 'Replicate model must be owner/model-name or a long version hash.' });
      }

      const result = await forwardJson({
        url,
        token: apiKey,
        body,
        headers: { Prefer: 'wait' }
      });

      return res.status(result.ok ? 200 : result.status).json(result);
    }

    if (provider === 'huggingface-video' || provider === 'huggingface-image') {
      if (!apiKey) return res.status(400).json({ error: 'Missing Hugging Face token' });
      if (!modelId) return res.status(400).json({ error: 'Missing Hugging Face model id' });

      const result = await forwardJson({
        url: `https://api-inference.huggingface.co/models/${modelId}`,
        token: apiKey,
        body: payload || {}
      });
      return res.status(result.ok ? 200 : result.status).json(result);
    }

    if (provider === 'stability-image') {
      if (!apiKey) return res.status(400).json({ error: 'Missing Stability API key' });
      const result = await forwardStabilityImage({
        url: 'https://api.stability.ai/v2beta/stable-image/generate/core',
        token: apiKey,
        payload: payload || {}
      });
      return res.status(result.ok ? 200 : result.status).json(result);
    }

    if (provider === 'comfyui-local') {
      const base = (comfyUrl || 'http://127.0.0.1:8188').replace(/\/$/, '');
      const result = await forwardJson({ url: `${base}/prompt`, body: payload || {} });
      return res.status(result.ok ? 200 : result.status).json(result);
    }

    return res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

app.post('/api/replicate-status', async (req, res) => {
  try {
    const { apiKey, predictionId } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'Missing Replicate API token' });
    if (!predictionId) return res.status(400).json({ error: 'Missing prediction ID' });

    const result = await forwardJson({
      url: `https://api.replicate.com/v1/predictions/${encodeURIComponent(predictionId)}`,
      token: apiKey,
      method: 'GET'
    });
    return res.status(result.ok ? 200 : result.status).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`AI generation proxy running locally on http://${HOST}:${PORT}`);
});
