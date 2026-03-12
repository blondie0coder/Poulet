# Poulet 🐔

A personal restaurant-ordering agent. You tell it what you want on Telegram, it calls the restaurant and orders for you.

## Architecture

```
Telegram  →  OpenClaw (Claude)  →  Twilio (voice call)
                    ↑                        ↓
               ANTHROPIC_API_KEY      ElevenLabs TTS
                                      OpenAI Realtime STT
```

- **OpenClaw** is the orchestrator — it receives your Telegram message, understands what to order, places the call, has the conversation, and reports back.
- **Twilio** dials the phone number.
- **ElevenLabs** provides the voice (natural TTS).
- **OpenAI Realtime** transcribes what the restaurant says back (STT, required by OpenClaw's streaming mode).

## Prerequisites

- [OpenClaw](https://openclaw.ai) account and CLI
- [Twilio](https://twilio.com) account (paid — trial accounts block international calls)
- [ElevenLabs](https://elevenlabs.io) API key
- [OpenAI](https://platform.openai.com) API key
- [Anthropic](https://anthropic.com) API key
- [ngrok](https://ngrok.com) account + authtoken

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd poulet
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. ngrok

ngrok exposes your local OpenClaw webhook server to Twilio.

```bash
ngrok config add-authtoken <your-token>
ngrok http 3334
```

Copy the public URL (e.g. `https://xxxx.ngrok-free.app`) and set it as:
- `PUBLIC_BASE_URL` in `.env`
- `plugins.entries.voice-call.config.publicUrl` in `~/.openclaw/openclaw.json` (append `/voice/webhook`)

### 4. OpenClaw config

Edit `~/.openclaw/openclaw.json` — the voice-call plugin needs:

```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio",
          "twilio": {
            "accountSid": "<TWILIO_ACCOUNT_SID>",
            "authToken": "<TWILIO_AUTH_TOKEN>"
          },
          "fromNumber": "<TWILIO_FROM_NUMBER>",
          "publicUrl": "https://<ngrok-subdomain>.ngrok-free.app/voice/webhook",
          "serve": { "port": 3334, "path": "/voice/webhook" },
          "outbound": { "defaultMode": "conversation" },
          "tunnel": { "provider": "ngrok", "allowNgrokFreeTierLoopbackBypass": true },
          "streaming": { "enabled": true, "streamPath": "/voice/stream" },
          "skipSignatureVerification": true,
          "tts": {
            "provider": "elevenlabs",
            "elevenlabs": {
              "apiKey": "<ELEVENLABS_API_KEY>",
              "voiceId": "<ELEVENLABS_VOICE_ID>",
              "modelId": "eleven_multilingual_v2"
            }
          }
        }
      }
    }
  }
}
```

### 5. Start

```bash
npm start
```

Then pair your Telegram account when prompted.

## Usage

Send a message to your bot on Telegram:

> Order a margherita pizza from Pizzeria Napoli, pickup at 19:30

Poulet will call the restaurant, have the conversation, and report back with a confirmation.

## Adding restaurants

Add phone numbers to `TOOLS.md` so Poulet doesn't have to ask you every time.

## Troubleshooting

| Problem | Fix |
|---|---|
| Call connects but drops immediately | Check `publicUrl` in openclaw.json matches current ngrok URL |
| Robotic voice | ElevenLabs not configured — check `tts` block in openclaw.json |
| Agent can't hear the restaurant | OpenAI key missing or invalid — streaming STT requires it |
| Call never connects | Check Twilio geo permissions for Switzerland (+41) |
