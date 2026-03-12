# TOOLS.md — Configuration

## Voice Calls

Calls are placed via the `voice_call` tool (OpenClaw voice-call plugin, powered by Twilio).
Config lives in `~/.openclaw/openclaw.json` under `plugins.entries.voice-call`.

Voice: ElevenLabs (`eleven_multilingual_v2`, voice ID configured in openclaw.json).
STT: OpenAI Realtime (used by OpenClaw for live transcription during calls).

## Restaurant Directory

Add known restaurants here so Poulet can look up numbers without asking:

| Restaurant | Phone | Notes |
|---|---|---|
| Test number | +41782040799 | Default test |

Add more rows as you use the agent.

## Language

Default is English. The user can specify a different language in their Telegram message (e.g. "call in French", "call in German").
