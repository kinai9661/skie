# geminigen.ai 逆向工程 UI Proxy

## 專案結構
- `src/index.js`: Cloudflare Worker 核心邏輯與 UI 介面
- `wrangler.toml`: Cloudflare 部署設定
- `deploy.sh`: 一鍵部署腳本

## 快速部署步驟
1. 解壓縮檔案 `unzip geminigen_proxy_project.zip`
2. 在 Cloudflare Dashboard 建立一個 KV 命名空間，名稱可以叫 `API_SECRETS`
3. 將建立的 KV ID 填入 `wrangler.toml` 中的 `id = "your-kv-id-here"`
4. 在 KV 中新增兩筆資料：
   - `TOKEN`: 填入您的 Authorization Bearer token (例如 eyJ...)
   - `GUARD_ID`: 填入您的 x-guard-id 值
5. 在終端機執行: `npm install -g wrangler` (若尚未安裝)
6. 執行 `./deploy.sh` 授予權限 `chmod +x deploy.sh` 並執行部署，或直接輸入 `wrangler deploy`

## 功能說明
- 完整代理 `geminigen.ai` 的圖像生成 API
- 單一響應式 UI 介面，支援手機與桌面版
- 支援自動輪詢 `/api/history` 直到圖片生成完成
- 提供除錯標籤頁，方便查看請求與響應的 JSON 資料
