import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'AI generation proxy running' });
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

  if (!response.ok) {
    return { ok: false, status: response.status, statusText: response.statusText, data };
  }
  return { ok: true, status: response.status, data };
}

function isReplicateVersionHash(value) {
  return /^[a-f0-9]{32,}$/i.test(String(value || '').trim());
}

function isReplicateModelSlug(value) {
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(String(value || '').trim());
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
      let body = payload || {};

      if (isReplicateModelSlug(cleanModel)) {
        const [owner, name] = cleanModel.split('/');
        url = `https://api.replicate.com/v1/models/${owner}/${name}/predictions`;
      } else if (isReplicateVersionHash(cleanModel)) {
        body = { version: cleanModel, ...(payload || {}) };
      } else {
        return res.status(400).json({ error: 'Replicate model must be owner/model-name or a long version hash.' });
      }

      const result = await forwardJson({ url, token: apiKey, body });
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
      const result = await forwardJson({
        url: 'https://api.stability.ai/v2beta/stable-image/generate/core',
        token: apiKey,
        headers: { Accept: 'application/json' },
        body: payload || {}
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
      url: `https://api.replicate.com/v1/predictions/${predictionId}`,
      token: apiKey,
      method: 'GET'
    });
    return res.status(result.ok ? 200 : result.status).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`AI generation proxy running on http://localhost:${PORT}`);
});
