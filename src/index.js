export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 處理 API 請求 (Proxy & History)
    if (url.pathname.startsWith('/api/')) {
      return await handleAPI(request, url, env);
    }

    // 處理根目錄請求，回傳 UI
    return new Response(getUI(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function handleAPI(request, url, env) {
  let token = '';
  let guardId = '';

  try {
    const secrets = await env.API_SECRETS.get(['TOKEN', 'GUARD_ID'], { type: 'json' });
    if (secrets) {
      token = secrets.TOKEN;
      guardId = secrets.GUARD_ID;
    }
  } catch (e) {
    token = await env.API_SECRETS.get('TOKEN');
    guardId = await env.API_SECRETS.get('GUARD_ID');
  }

  if (!token || !guardId) {
    return new Response(JSON.stringify({
      error: 'KV 缺少 TOKEN 或 GUARD_ID 變數，請在 Cloudflare Dashboard 設定。'
    }), { 
      status: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      } 
    });
  }

  let targetUrl;
  if (url.pathname === '/api/generate') {
    targetUrl = 'https://api.geminigen.ai/api/generate';
  } else if (url.pathname.startsWith('/api/history/')) {
    targetUrl = `https://api.geminigen.ai${url.pathname}${url.search}`;
  } else {
    return new Response('無效端點', { status: 404 });
  }

  let bodyData = null;
  if (request.method === 'POST') {
    try {
      bodyData = await request.formData();
    } catch(e) {
      return new Response(JSON.stringify({error: 'Invalid FormData'}), {status: 400});
    }
  }

  const fetchOptions = {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-guard-id': guardId
    }
  };

  if (request.method === 'POST') {
      fetchOptions.body = bodyData;
  }

  try {
      const resp = await fetch(targetUrl, fetchOptions);
      let data = await resp.text();

      try { 
        data = JSON.parse(data); 
      } catch(e) {}

      return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
        status: resp.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
  } catch (err) {
      return new Response(JSON.stringify({error: err.message}), { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
  }
}

function getUI() {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>geminigen.ai 逆向 UI</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #fff; }
.container { max-width: 1200px; margin: 2rem auto; padding: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
@media (max-width: 768px) { .container { grid-template-columns: 1fr; } }
.left, .right { background: rgba(255,255,255,.1); backdrop-filter: blur(20px); border-radius: 24px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,.1); }
input, select, textarea, button { width: 100%; padding: 1rem; margin: .5rem 0; border: none; border-radius: 12px; font-size: 1rem; background: rgba(255,255,255,.2); color: white; }
input::placeholder, select { color: rgba(255,255,255,.7); }
button { background: linear-gradient(135deg, #667eea, #764ba2); cursor: pointer; font-weight: bold; transition: all .3s; border: 1px solid rgba(255,255,255,0.2); }
button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102,126,234,.4); }
button:disabled { opacity: .6; cursor: not-allowed; }
#image-preview { width: 100%; max-height: 400px; object-fit: contain; border-radius: 12px; margin: 1rem 0; display: none; background: rgba(0,0,0,0.2); }
.tabs { display: flex; background: rgba(255,255,255,.1); border-radius: 12px 12px 0 0; overflow: hidden; }
.tab { flex: 1; padding: 1rem; text-align: center; cursor: pointer; transition: background .3s; }
.tab.active, .tab:hover { background: rgba(102,126,234,.6); }
.tab-content { background: rgba(255,255,255,.1); padding: 1.5rem; border-radius: 0 12px 12px 12px; min-height: 400px; }
pre { background: rgba(0,0,0,.4); padding: 1rem; border-radius: 8px; overflow: auto; font-size: .9rem; white-space: pre-wrap; word-break: break-all; max-height: 400px;}
.status { padding: 1rem; border-radius: 12px; margin: 1rem 0; text-align: center; }
.loading { animation: pulse 1.5s infinite; background: rgba(102,126,234,.3); }
@keyframes pulse { 50% { opacity: .5; } }
</style>
</head>
<body>
<div class="container">
  <div class="left">
    <h1 style="margin-bottom: 1.5rem; font-size: 2rem;">🖼️ geminigen.ai 生成器</h1>
    <textarea id="prompt" rows="3" placeholder="輸入圖像描述，例如：A beautiful sunset over mountains with vibrant colors...">A beautiful sunset over mountains with vibrant colors</textarea>
    <select id="model"><option value="nano-banana-pro">Nano Banana Pro</option><option value="imagen-4-ultra">Imagen 4 Ultra</option></select>
    <input id="aspect_ratio" value="16:9" placeholder="aspect_ratio (16:9, 1:1, 9:16)">
    <input id="style" value="Photorealistic" placeholder="style (Photorealistic, Anime, Oil Painting)">
    <input id="output_format" value="jpeg" placeholder="output_format (jpeg, png)">
    <input id="resolution" value="1K" placeholder="resolution (1K, 2K, 4K)">
    <input id="file_urls" placeholder="file_urls (圖像參考 URL，選填)">
    <button onclick="generateImage()">🚀 生成圖片</button>
    <div id="status"></div>
  </div>
  <div class="right">
    <div class="tabs">
      <div class="tab active" data-tab="preview">預覽</div>
      <div class="tab" data-tab="response">API 響應</div>
      <div class="tab" data-tab="request">請求內容</div>
      <div class="tab" data-tab="history">任務歷史</div>
    </div>
    <div id="preview" class="tab-content">
      <img id="image-preview" alt="生成圖片">
      <div id="job-status" style="margin-top:10px; text-align:center;"></div>
    </div>
    <div id="response" class="tab-content" style="display:none"><pre id="api-response">等待請求...</pre></div>
    <div id="request" class="tab-content" style="display:none"><pre id="api-request">等待請求...</pre></div>
    <div id="history" class="tab-content" style="display:none"><pre id="history-data">無任務</pre></div>
  </div>
</div>
<script>
let currentJobId = null;
let pollTimer = null;

const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => tab.addEventListener('click', (e) => {
  tabs.forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(e.target.dataset.tab).style.display = 'block';
}));

async function generateImage() {
  const btn = event.target;
  const statusEl = document.getElementById('status');
  btn.disabled = true;
  btn.textContent = '生成中...';
  statusEl.innerHTML = '<div class="status loading">發送請求...</div>';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('job-status').innerHTML = '';

  const formData = new FormData();
  ['prompt', 'model', 'aspect_ratio', 'style', 'output_format', 'resolution', 'file_urls'].forEach(id => {
    const el = document.getElementById(id);
    if (el.value) formData.append(id, el.value);
  });

  const reqData = Object.fromEntries(formData.entries());
  document.getElementById('api-request').textContent = JSON.stringify(reqData, null, 2);

  const startTime = Date.now();
  try {
    const resp = await fetch('/api/generate', { method: 'POST', body: formData });
    const endTime = Date.now();
    const data = await resp.json();

    statusEl.innerHTML = \`<div class="status">\${resp.status} (\${endTime - startTime}ms)</div>\`;
    document.getElementById('api-response').textContent = JSON.stringify(data, null, 2);

    if (data.id) {
      currentJobId = data.id;
      document.getElementById('job-status').innerHTML = \`任務 ID: \${currentJobId}<br>自動輪詢狀態中...\`;
      pollHistory();
    } else {
       document.getElementById('job-status').innerHTML = '未取得任務 ID，請檢查 API 響應或授權狀態。';
    }
  } catch (err) {
    statusEl.innerHTML = \`<div class="status" style="background:rgba(255,0,0,0.5);">錯誤: \${err.message}</div>\`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 生成圖片';
    document.querySelector('[data-tab="preview"]').click();
  }
}

async function pollHistory() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!currentJobId) return;
    try {
      const resp = await fetch(\`/api/history/\${currentJobId}\`);
      const hist = await resp.json();
      document.getElementById('history-data').textContent = JSON.stringify(hist, null, 2);

      if (hist.status === 'completed' || hist.status === 'success') {
        const outUrl = hist.output_url || hist.url || (hist.data && hist.data.url);
        if(outUrl) {
            document.getElementById('image-preview').src = outUrl;
            document.getElementById('image-preview').style.display = 'block';
            document.getElementById('job-status').innerHTML = '🎉 生成成功！';
        }
        clearInterval(pollTimer);
      } else if (hist.status === 'failed' || hist.status === 'error') {
        document.getElementById('job-status').innerHTML = '❌ 生成失敗。';
        clearInterval(pollTimer);
      }
    } catch(e) {
        console.error('輪詢失敗', e);
    }
  }, 3000);
}
</script>
</body></html>`
}
