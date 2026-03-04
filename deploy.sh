#!/bin/bash
echo "開始部署 geminigen-proxy-ui 到 Cloudflare Workers..."
wrangler deploy
echo "部署完成！請確保您已經在 Dashboard 綁定了 KV，並填入了 TOKEN 與 GUARD_ID。"
