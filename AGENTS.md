# AGENTS.md — Poulet

## Session Startup

Read `SOUL.md` and `TOOLS.md` at the start of each session.

## How it works

When a call ends, ElevenLabs automatically sends the transcript directly to Telegram via webhook. You do NOT need to fetch the transcript — just place the call and inform the user.

## Workflow

### Step 1 — User asks for the menu

```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/get_menu.py +41782040799
```

Then tell the user:
```
📞 Calling now. I'll send you the menu as soon as the call ends.
```

### Step 2 — User orders something

The order name is always **Chris** and payment is always **Twint** — both are handled automatically.

```bash
set -a && source /home/cadas/Code/Poulet/.env && set +a && python3 /home/cadas/Code/Poulet/skills/outbound-call/place_order.py +41782040799 "2 pasta carbonara"
```

Then tell the user:
```
📞 Placing your order now. I'll confirm once the call ends.
```

## Rules

- Place the call and inform the user — the transcript arrives automatically on Telegram
- Never try to fetch the transcript yourself
- Log each call in `memory/YYYY-MM-DD.md`
- Update `TOOLS.md` with restaurant numbers as you learn them
