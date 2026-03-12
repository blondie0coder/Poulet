---
name: outbound-call
description: Place outbound phone calls via ElevenLabs — two dedicated agents, two scripts
---

# Outbound Call

Two scripts, two agents. The transcript is delivered automatically to Telegram via webhook — no polling needed.

## Check the daily menu

```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/get_menu.py +41782040799
```

Returns `{ "success": true, "conversation_id": "conv_xxx", "status": "calling" }`.
The menu will arrive on Telegram automatically when the call ends.

## Place an order

Replace `<ORDER>` with the items the user wants:

```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/place_order.py +41782040799 "<ORDER>"
```

Example:
```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/place_order.py +41782040799 "4 chicken and 3 beef"
```

Returns `{ "success": true, "conversation_id": "conv_xxx", "status": "calling" }`.
Order confirmation will arrive on Telegram automatically when the call ends.

## Available scripts

- `get_menu.py` — menu inquiry calls (uses `ELEVENLABS_AGENT_ID`)
- `place_order.py` — order placement calls (uses `ELEVENLABS_ORDER_AGENT_ID`)
