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

## Language by Region

| Region | Language |
|---|---|
| Zurich / Bern / Basel | German (de-CH) |
| Geneva / Lausanne | French (fr-CH) |
| Lugano / Bellinzona | Italian (it-CH) |
| Default | English |
