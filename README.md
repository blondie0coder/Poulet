# Poulet 🐔

You send a message on Telegram. Poulet calls the restaurant and orders for you. Natural voice, full conversation — powered by ElevenLabs Conversational AI.

## Architecture

```
Telegram → OpenClaw (Claude) → POST /call → Voice Server → Twilio dials the restaurant
                                                               ↕ WebSocket
                                                          ElevenLabs Conversational AI
                                                          (talks to restaurant, fully autonomous)
```

No OpenAI needed. ElevenLabs handles the entire conversation — STT, LLM, TTS — natively.

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd poulet
npm install
```

### 2. Create an ElevenLabs Conversational AI agent

1. Go to [elevenlabs.io](https://elevenlabs.io) → **Conversational AI** → **Create Agent**
2. Set the **system prompt** (example):
   ```
   You are Poulet, a food ordering assistant calling a restaurant on behalf of a customer.
   Be polite and professional. Confirm the order details, ask for price and pickup time,
   and say goodbye when done.
   ```
3. Choose the **voice** (use your preferred ElevenLabs voice)
4. Copy the **Agent ID** from the agent settings page

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key |
| `ELEVENLABS_AGENT_ID` | Agent ID from step 2 |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number |
| `ANTHROPIC_API_KEY` | Anthropic API key (for the Telegram bot brain) |
| `PUBLIC_URL` | Your ngrok public URL (no trailing slash) |

### 4. Set up ngrok

```bash
ngrok config add-authtoken <your-token>
# ngrok.yml already configured for port 8000
ngrok start --all
```

Copy the public URL (e.g. `https://xxxx.ngrok-free.app`) and set it as `PUBLIC_URL` in `.env`.

### 5. Start everything

Terminal 1 — voice server:
```bash
npm run server
```

Terminal 2 — OpenClaw Telegram bot:
```bash
npm run agent
```

### 6. Use it

Send to your Telegram bot:
> Order a margherita pizza from Pizzeria Napoli, pickup at 7pm

Poulet places the call. ElevenLabs handles the conversation. You get a confirmation.

## Customising the voice

Change the voice in the ElevenLabs agent settings — any voice, any language, any accent. The agent prompt controls the personality and language of the call.

## Adding restaurants

Add phone numbers to `TOOLS.md` so Poulet doesn't have to ask every time.
