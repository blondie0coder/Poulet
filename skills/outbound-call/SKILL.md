---
name: outbound-call
description: Place outbound phone calls via ElevenLabs and get the transcript back
---

# Outbound Call

Two scripts, two use cases:

## Check the daily menu

Step 1 — place the call (instant):
```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/get_menu.py +41782040799
```
Returns `{ "conversation_id": "conv_xxx" }`

Step 2 — wait 30s then get transcript:
```bash
sleep 30 && set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/get_menu.py --transcript conv_xxx
```

## Place an order

Step 1 — place the call (instant):
```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/place_order.py +41782040799 "2 pasta carbonara"
```

Step 2 — wait 30s then get transcript:
```bash
sleep 30 && set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/place_order.py --transcript conv_xxx
```

## Available scripts
- `get_menu.py` — menu inquiry calls
- `place_order.py` — order calls
