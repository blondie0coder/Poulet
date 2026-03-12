# TOOLS.md — Configuration

## Voice Calls

Calls are placed via two dedicated ElevenLabs agents:

| Agent | ID | Purpose |
|---|---|---|
| Poulet (menu) | `agent_3601kkhkb4vmfxs9j3fry6nmqpby` | Asks for the daily menu, hangs up when done |
| Poulet-Order | `agent_2101kkhtdk5be5nt9nw51kq8czat` | Places an order, confirms, hangs up |

The agents call via a Twilio number managed inside ElevenLabs.
When a call ends, ElevenLabs fires a post-call webhook → `server.js` → Telegram.

## Restaurant Directory

Add known restaurants here so Poulet can look up numbers without asking:

| Restaurant | Phone | Notes |
|---|---|---|
| Test number | +41782040799 | Default test |

Add more rows as you use the agent.

## Language

Both agents use `eleven_turbo_v2_5` with `language_detection` enabled — they switch automatically to French, German, Italian, or English depending on how the restaurant answers.
