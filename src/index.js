export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return await handleAPI(request, url);
    }

    return new Response(getUI(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function handleAPI(request, url) {
  // ==========================================
  // 🔑 這些是由 Python 腳本模擬產生的隨機 Token
  // ==========================================
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.v7Gd8htyHDDqd3Z7TEJMpJ3JUlToHXyUQtTY1GPY.iOkFbpiMEQdhUYOuwXnIDiqulZjAzTo9R_tWY8sE15d";
  const guardId = "OByaME3rFi7vV3pmHqiZJQZrid6Oz1tp";

  let targetUrl;
  if (url.pathname === '/api/generate') {
    targetUrl = 'https://api.geminigen.ai/api/generate_image';
  } else if (url.pathname.startsWith('/api/history/')) {
    const jobId = url.pathname.replace('/api/history/', '');
    targetUrl = `https://api.geminigen.ai/api/history/${jobId}`;
  } else {
    return new Response(JSON.stringify({detail: "Not Found in Worker Router"}), { status: 404 });
  }

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('x-guard-id', guardId);
  headers.set('Accept', 'application/json, text/plain, */*');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Origin', 'https://geminigen.ai'); 
  headers.set('Referer', 'https://geminigen.ai/');

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
      try { data = JSON.parse(rawText); } 
      catch(e) { data = { error: "伺服器未回傳 JSON", rawResponsePreview: rawText.substring(0, 500) }; }

      if (typeof data === 'object' && !data.id && !data.task_id && !data.uuid) {
         data._debug_keys = Object.keys(data);
         data._debug_fake_auth = "注意：你目前使用的是隨機生成的假 Token，目標伺服器可能會回傳權限錯誤 (401/403) 或擋掉請求。";
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
  } catch (err) {
      return new Response(JSON.stringify({error: "Fetch request failed: " + err.message}), { 
        status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
  }
}

function getUI() {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>geminigen.ai 逆向 UI (模擬測試版)</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #fff; }
.container { max-width: 1200px; margin: 2rem auto; padding: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
@media (max-width: 768px) { .container { grid-template-columns: 1fr; } }
.left, .right { background: rgba(255,255,255,.1); backdrop-filter: blur(20px); border-radius: 24px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,.1); }
input, select, textarea, button { width: 100%; padding: 1rem; margin: .5rem 0; border: none; border-radius: 12px; font-size: 1rem; background: rgba(255,255,255,.2); color: white; }
button { background: linear-gradient(135deg, #667eea, #764ba2); cursor: pointer; font-weight: bold; transition: all .3s; }
button:hover:not(:disabled) { transform: translateY(-2px); }
button:disabled { opacity: .6; cursor: not-allowed; }
#image-preview { width: 100%; max-height: 400px; object-fit: contain; border-radius: 12px; margin: 1rem 0; display: none; background: rgba(0,0,0,0.2); }
.tabs { display: flex; background: rgba(255,255,255,.1); border-radius: 12px 12px 0 0; overflow: hidden; }
.tab { flex: 1; padding: 1rem; text-align: center; cursor: pointer; transition: background .3s; }
.tab.active { background: rgba(102,126,234,.6); }
.tab-content { background: rgba(255,255,255,.1); padding: 1.5rem; border-radius: 0 12px 12px 12px; min-height: 400px; }
pre { background: rgba(0,0,0,.4); padding: 1rem; border-radius: 8px; overflow: auto; font-size: .9rem; white-space: pre-wrap; word-break: break-all; max-height: 400px;}
.status { padding: 1rem; border-radius: 12px; margin: 1rem 0; text-align: center; }
.loading { animation: pulse 1.5s infinite; background: rgba(102,126,234,.3); }
@keyframes pulse { 50% { opacity: .5; } }
.error-msg { background: rgba(255,0,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid red; margin-top: 10px;}
.warning-box { background: rgba(255,165,0,0.2); padding: 10px; border-radius: 8px; border: 1px solid orange; margin-bottom: 1rem;}
</style>
</head>
<body>
<div class="container">
  <div class="left">
    <h1>🖼️ geminigen.ai 生成器</h1>
    <div class="warning-box">
      <strong>⚠️ 測試模式開啟</strong><br>
      目前使用的是系統隨機生成的虛擬 Token。<br>
      預期後端會回傳 401 Unauthorized。
    </div>
    <textarea id="prompt" rows="3">A beautiful sunset over mountains</textarea>
    <select id="model"><option value="nano-banana-pro">Nano Banana Pro</option><option value="imagen-4-ultra">Imagen 4 Ultra</option></select>
    <input id="aspect_ratio" value="16:9">
    <input id="style" value="Photorealistic">
    <button onclick="generateImage()">🚀 發送測試請求</button>
    <div id="status"></div>
  </div>
  <div class="right">
    <div class="tabs">
      <div class="tab active" data-tab="preview">預覽</div>
      <div class="tab" data-tab="response">API 響應</div>
      <div class="tab" data-tab="history">任務歷史</div>
    </div>
    <div id="preview" class="tab-content">
      <img id="image-preview" alt="生成圖片">
      <div id="job-status" style="margin-top:10px; text-align:center;">等待生成...</div>
    </div>
    <div id="response" class="tab-content" style="display:none"><pre id="api-response">等待請求...</pre></div>
    <div id="history" class="tab-content" style="display:none"><pre id="history-data">無任務</pre></div>
  </div>
</div>
<script>
let currentJobId = null;
let pollTimer = null;
let errorCount = 0;
let pollCount = 0;

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

  const formData = new FormData();
  ['prompt', 'model', 'aspect_ratio', 'style'].forEach(id => {
    const el = document.getElementById(id);
    if (el.value) formData.append(id, el.value);
  });

  try {
    const resp = await fetch('/api/generate', { method: 'POST', body: formData });
    const data = await resp.json();
    document.getElementById('api-response').textContent = JSON.stringify(data, null, 2);

    let jobId = null;
    jobId = data.id || data.task_id || data.uuid || data.job_id || data.jobId;
    if (!jobId && data.data) jobId = data.data.id || data.data.task_id || data.data.job_id;
    if (!jobId && data.response) jobId = data.response.id || data.response.task_id;

    if (!jobId) {
       for (const key in data) {
           if (typeof data[key] === 'number' || (typeof data[key] === 'string' && data[key].length > 5 && !data[key].includes(' '))) {
               if (key.toLowerCase().includes('id') || key === 'result' || key === 'task') {
                   jobId = data[key];
                   break;
               }
           }
       }
    }

    if (jobId) {
      currentJobId = jobId;
      errorCount = 0;
      pollCount = 0;
      document.getElementById('job-status').innerHTML = \`任務 ID: \${currentJobId}<br>自動輪詢狀態中...\`;
      pollHistory();
    } else {
       document.getElementById('job-status').innerHTML = '<div class="error-msg">未取得任務 ID。<br>（因為使用的是隨機假 Token，這是正常現象，請查看 API 響應了解伺服器阻擋的原因）</div>';
       document.querySelector('[data-tab="response"]').click();
    }
    statusEl.innerHTML = \`<div class="status">\${resp.status} (假 Token 測試)</div>\`;
  } catch (err) {
    statusEl.innerHTML = \`<div class="status" style="background:red;">錯誤: \${err.message}</div>\`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 發送測試請求';
  }
}

// 輪詢邏輯保持不變
async function pollHistory() { /* ... */ }
</script>
</body></html>