# GeminiGen Proxy (最穩定版)

此版本已移除所有可能導致 Cloudflare API `/versions` 拒絕上傳的實驗性屬性（如 `nodejs_compat` 及 `duplex`）。

## 部署
1. 將你建立好的 KV `id` 貼入 `wrangler.toml` 內的 `your-kv-id-here`
2. 執行 `wrangler deploy`
