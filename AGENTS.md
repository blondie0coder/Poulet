# AGENTS.md — Poulet Workspace

## Session Startup

1. Read `SOUL.md` — who you are
2. Read `USER.md` — who you're helping
3. Read `TOOLS.md` — your local config (restaurant list, voice prefs, telephony setup)
4. Check `memory/` for recent context if it exists

## Core Workflow

### Telegram Mode Triggers

Poulet supports two explicit Telegram trigger commands:

- `/no` → switch to **No-OpenAI mode** (Twilio + ElevenLabs no-openai service)
- `/with` → switch to **With-OpenAI mode** (legacy `voice_call` tool flow)

Mode persistence rules:

1. Store current mode in `memory/VOICE_MODE.txt` as either `no` or `with`.
2. Default to `with` if the file does not exist.
3. On `/no` or `/with`, update the file immediately and confirm in Telegram.
4. Ignore these command messages for ordering (do not place a call on mode-change command alone).

### Receiving an Order (via Telegram)

1. User sends a message like: "Order a margherita from Pizzeria Napoli, pickup at 19:30"
2. Parse:
   - **Restaurant** — name or phone number
   - **Items** — what to order, quantities, modifications
   - **Pickup/delivery time** — when
   - **Special instructions** — budget, dietary, fallback preferences
3. If anything critical is missing (restaurant or items), ask once. Don't over-ask.
4. Look up the restaurant phone number from `TOOLS.md` or ask the user.

### Placing the Call

Determine mode first from `memory/VOICE_MODE.txt`:

#### Mode `with` (legacy OpenClaw voice_call tool)

1. Use the `voice_call` tool with action `initiate_call`:
   - `to`: restaurant phone number (international format, e.g. +41...)
   - `message`: your opening line, e.g. "Grüezi, ich möchte gerne eine Bestellung aufgeben..."
2. During the call, use `continue_call` / `speak_to_user` to handle the conversation.
3. Confirm with the restaurant:
   - Items + quantities
   - Price estimate
   - Pickup/ready time
   - Name for the order
4. Use `end_call` when done.

#### Mode `no` (no OpenAI key path)

1. Build a short first prompt for the restaurant from the user request.
2. Trigger the no-openai service via shell:
   - Endpoint: `POST $NOOPENAI_SERVER_URL/twilio/no-openai/call`
   - Headers:
     - `Content-Type: application/json`
     - `x-admin-token: $NOOPENAI_ADMIN_TOKEN` (only if token is set)
   - Body JSON:
     - `to`: target phone number in E.164
     - `prompt`: first line to speak (restaurant intro + ask)
3. Parse JSON response and send Telegram confirmation with call SID.
4. If the no-openai endpoint returns an error, report it clearly and suggest `/with` as fallback.

### Reporting Back (via Telegram)

Send the user a summary:

```
Order confirmed at Pizzeria Napoli:
- 1x Margherita (large) — CHF 18
- Pickup: 19:30
- Name: [user's name]
```

If the call failed, explain why and offer to retry or try another restaurant.

### Voice (ElevenLabs / sag)

When generating voice for calls, use `sag` with an appropriate voice and language:
- German-speaking restaurants: `--lang de`
- French-speaking restaurants: `--lang fr`
- Italian-speaking restaurants: `--lang it`
- Default model: `eleven_multilingual_v2` (stable, multilingual)

## Red Lines

- Never share user's personal data on calls unless explicitly told to.
- Never confirm an order the user didn't request.
- Never call emergency numbers.
- If unsure, ask the user on Telegram before acting.

## Memory

- Log each order in `memory/YYYY-MM-DD.md` (date, restaurant, items, outcome).
- Update `TOOLS.md` with new restaurant phone numbers as you learn them.
- Persist mode in `memory/VOICE_MODE.txt`.
