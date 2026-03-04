# GeminiGen Proxy (隨機 Token 測試版)

這是一個用來測試 Worker 網路連線與路由轉發的專案。

## 本次生成的隨機測試資料：
- **隨機 Bearer Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.v7Gd8htyHDDqd3Z7TEJMpJ3JUlToHXyUQtTY1GPY.iOkFbpiMEQdhUYOuwXnIDiqulZjAzTo9R_tWY8sE15d`
- **隨機 Guard ID**: `OByaME3rFi7vV3pmHqiZJQZrid6Oz1tp`

## 部署與預期結果：
1. 執行 `wrangler deploy`。
2. 開啟網頁後點擊生成。
3. 因為 Token 是假的，目標伺服器 (api.geminigen.ai) 預期會攔截這個請求。
4. 你可以在「**API 響應**」面板中觀察到類似 `401 Unauthorized` 或 `Invalid Token` 的錯誤訊息，這代表 Worker 已經成功連線到正確的端點，只是過不了門禁。
