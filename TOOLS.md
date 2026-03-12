# TOOLS.md — Local Configuration

## Telephony

Voice calls are placed via the `voice-call` plugin.
Provider config lives in `~/.openclaw/openclaw.json` under `plugins.entries.voice-call.config`.

Supported providers: Twilio, Telnyx, Plivo.

Current provider: (configure in openclaw.json — see README for setup)

## ElevenLabs (sag)

- Preferred model: `eleven_multilingual_v2` (multilingual, stable)
- Preferred voice: (set ELEVENLABS_VOICE_ID or pick per-call)
- API key: stored in `ELEVENLABS_API_KEY` env var

## Restaurant Directory

Add known restaurants here so Poulet can look up numbers without asking:

```
### Example
- Pizzeria Napoli: +41 44 123 45 67
- Sushi Zen: +41 44 987 65 43
```

(Add real entries as you use the agent)

## TTS Language Hints

Switzerland has four language regions. Use the appropriate `--lang` flag:
- Zurich / Bern / Basel → `de`
- Geneva / Lausanne → `fr`
- Lugano / Bellinzona → `it`
- Default fallback → `en`
