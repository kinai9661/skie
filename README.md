# GeminiGen.ai 逆向工程 UI 代理 API (ES Module 版)

此專案已修復 `Unexpected external import of "node:perf_hooks"` 與 `no default export` 的 Cloudflare 部署錯誤。

## 目錄結構
- `wrangler.toml`: Cloudflare Workers 設定檔
- `src/index.js`: 主程式碼，使用 `export default { fetch }` 格式，內含 HTML 前端 UI。
- `deploy.sh`: 部署腳本

## 🚀 部署教學
1. 在本資料夾執行指令 `npm i -g wrangler` (若尚未安裝)。
2. 登入 Cloudflare: `wrangler login`。
3. 建立一個 KV 命名空間供我們存放安全密碼：
   ```bash
   wrangler kv:namespace create API_SECRETS
   ```
4. 指令會回傳一段 `[[kv_namespaces]]` 的設定，將 `id = "..."` 複製，並取代本專案內 `wrangler.toml` 裡面的 `id = "your-kv-id-here"`。
5. **綁定 Token 與 Guard ID**:
   ```bash
   wrangler kv:key put --binding=API_SECRETS "TOKEN" "你的 Bearer Token"
   wrangler kv:key put --binding=API_SECRETS "GUARD_ID" "你的 x-guard-id"
   ```
6. **執行部署**:
   ```bash
   wrangler deploy
   ```

## 🛠️ 開發與除錯
- 你可以直接透過 `wrangler dev` 啟動本地測試（注意：本地測試仍需要 KV 設定）。
- 若發生授權錯誤（如 Token 過期），請回到 Dashboard 或使用 CLI 更新 `TOKEN` 與 `GUARD_ID`。
