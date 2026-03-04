# GeminiGen Proxy (固定驗證版)

此版本已將 `TOKEN` 和 `GUARD_ID` 直接寫死在程式碼中，無需設定環境變數。
並包含了最新的：
- 精準生成路徑 (`/api/generate_image`)
- 歷史狀態輪詢防 404 容錯
- 暴力圖片網址解析 (相容所有 JSON 格式)

## 部署步驟
1. 打開 `src/index.js`。
2. 找到第 20 行與第 21 行：
   ```javascript
   const token = "請將你的Bearer Token寫在這裡";
   const guardId = "請將你的x-guard-id寫在這裡";
   ```
3. 將裡面的中文字替換成你真實的 Token 與 Guard ID (保留雙引號)。
4. 在終端機執行 `wrangler deploy`。
