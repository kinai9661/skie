export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return await handleAPI(request, url, env);
    }

    return new Response(getUI(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function handleAPI(request, url, env) {
  const token = env.TOKEN;
  const guardId = env.GUARD_ID;

  if (!token || !guardId || token === 'your-token-here') {
    return new Response(JSON.stringify({
      error: '缺少 TOKEN 或 GUARD_ID。請在 Cloudflare Dashboard 設定環境變數。'
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
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

  // 根據你提供的真實 Request 特徵，完美還原瀏覽器的 Fetch Headers
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('x-guard-id', guardId);
  headers.set('Accept', 'application/json, text/plain, */*');
  headers.set('Accept-Language', 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Sec-Ch-Ua', '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"');
  headers.set('Sec-Ch-Ua-Mobile', '?0');
  headers.set('Sec-Ch-Ua-Platform', '"Windows"');

  // 關鍵設定：加入 Referrer 與對應的 Policy
  headers.set('Origin', 'https://geminigen.ai'); 
  headers.set('Referer', 'https://geminigen.ai/');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 加入其他常見的防護繞過標頭
  headers.set('Sec-Fetch-Dest', 'empty');
  headers.set('Sec-Fetch-Mode', 'cors');
  headers.set('Sec-Fetch-Site', 'same-site');

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
    headers: headers,
    redirect: 'follow'
  };

  if (request.method === 'POST') {
      fetchOptions.body = bodyData;
  }

  try {
      const resp = await fetch(targetUrl, fetchOptions);
      const rawText = await resp.text();
      let data;

      try { 
        data = JSON.parse(rawText); 
      } catch(e) {
        data = {
          error: "伺服器未回傳 JSON (可能被 Cloudflare 阻擋)",
          httpStatus: resp.status,
          rawResponsePreview: rawText.substring(0, 1000)
        };
      }

      return new Response(JSON.stringify(data), {
        status: resp.status === 200 ? 200 : (resp.status === 403 ? 403 : 500),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
  } catch (err) {
      return new Response(JSON.stringify({error: "Fetch request failed: " + err.message}), { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
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
.error-msg { background: rgba(255,0,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid red; margin-top: 10px;}
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

    const rawText = await resp.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch(e) {
        data = { error: "解析失敗，可能遭遇阻擋", rawResponse: rawText };
    }

    statusEl.innerHTML = \`<div class="status">\${resp.status} (\${endTime - startTime}ms)</div>\`;
    document.getElementById('api-response').textContent = JSON.stringify(data, null, 2);

    if (data.id) {
      currentJobId = data.id;
      document.getElementById('job-status').innerHTML = \`任務 ID: \${currentJobId}<br>自動輪詢狀態中...\`;
      pollHistory();
    } else if (data.error) {
       document.getElementById('job-status').innerHTML = \`<div class="error-msg">\${data.error}<br>HTTP \${resp.status}</div>\`;
       document.querySelector('[data-tab="response"]').click();
    } else {
       document.getElementById('job-status').innerHTML = '未取得任務 ID。';
    }
  } catch (err) {
    statusEl.innerHTML = \`<div class="status" style="background:rgba(255,0,0,0.5);">錯誤: \${err.message}</div>\`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 生成圖片';
  }
}

async function pollHistory() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!currentJobId) return;
    try {
      const resp = await fetch(\`/api/history/\${currentJobId}\`);
      const rawText = await resp.text();
      let hist;
      try {
          hist = JSON.parse(rawText);
      } catch(e) {
          console.error("輪詢 JSON 解析失敗", rawText);
          return;
      }

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
    } catch(e) {}
  }, 3000);
}
</script>
</body></html>`
}
