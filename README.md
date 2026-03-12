# Poulet

An OpenClaw agent that calls restaurants and orders food on your behalf. You control it via Telegram.

## How It Works

1. You send a message on Telegram: *"Order a margherita from Pizzeria Napoli, pickup 19:30"*
2. Poulet calls the restaurant using a real phone call (via Twilio/Telnyx)
3. It speaks to the restaurant in the appropriate language (DE/FR/IT/EN) using ElevenLabs voices
4. It reports back on Telegram with the confirmation, price, and pickup time

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- An [ElevenLabs](https://elevenlabs.io/) API key (free tier works)
- A telephony provider account — one of:
  - [Twilio](https://www.twilio.com/) (recommended)
  - [Telnyx](https://telnyx.com/)
  - [Plivo](https://www.plivo.com/)
- An [Anthropic](https://console.anthropic.com/) API key (for the LLM brain)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure secrets

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
ELEVENLABS_API_KEY=your-elevenlabs-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Configure OpenClaw

If this is a fresh install, run onboarding:

```bash
npx openclaw onboard --non-interactive --accept-risk --workspace .
```

Otherwise, configure the key settings:

```bash
# Telegram
npx openclaw config set channels.telegram.botToken "$TELEGRAM_BOT_TOKEN"

# Voice call plugin
npx openclaw config set plugins.entries.voice-call.enabled true

# Telephony provider (example: Twilio)
npx openclaw config set plugins.entries.voice-call.config.provider twilio
npx openclaw config set plugins.entries.voice-call.config.twilio.accountSid "YOUR_TWILIO_SID"
npx openclaw config set plugins.entries.voice-call.config.twilio.authToken "YOUR_TWILIO_AUTH_TOKEN"
npx openclaw config set plugins.entries.voice-call.config.fromNumber "+1XXXXXXXXXX"

# Anthropic (for the agent brain)
npx openclaw config set auth.anthropicApiKey "$ANTHROPIC_API_KEY"
```

### 4. Install sag (ElevenLabs TTS CLI)

```bash
# macOS / Linux (Homebrew)
brew install steipete/tap/sag

# Or via Cargo
cargo install sag
```

### 5. Verify everything

```bash
npx openclaw doctor
npx openclaw skills check
```

### 6. Run

```bash
npx openclaw gateway
```

Then open Telegram, find your bot, and start ordering.

## Usage (Telegram)

Just message the bot naturally:

- *"Order 2 large margheritas from Pizza Hut Zurich, pickup at 20:00"*
- *"Call Sushi Zen and ask if they have the lunch special today"*
- *"Order pad thai from Thai Garden, budget max 25 CHF"*

Poulet will call, order, and report back.

### Mode Triggers in Telegram

- `/no` → use the no-openai phone flow
- `/with` → use the legacy OpenClaw `voice_call` flow

The selected mode is persisted by the agent in `memory/VOICE_MODE.txt`.

## No-OpenAI Voice Loop (Twilio + ElevenLabs)

If you want phone calls without OpenAI credits, use the `no-openai` flow on this branch.
It uses:

- Twilio for telephony
- ElevenLabs for natural speech playback
- Twilio speech recognition (`<Gather input="speech">`) for capturing responses
- Optional Claude rewrite (uses `ANTHROPIC_API_KEY` if present)

### 1) Set env vars

Add these to `.env`:

```bash
PUBLIC_BASE_URL=https://<your-ngrok-domain>
NOOPENAI_PORT=3340
NOOPENAI_SERVER_URL=http://127.0.0.1:3340
NOOPENAI_ADMIN_TOKEN=choose-a-random-secret
DEFAULT_TEST_NUMBER=+41782040799
CALL_LANGUAGE=de-CH
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

### 2) Run the no-openai server

```bash
npm run noopenai:server
```

### 3) Place a test call

```bash
# Uses DEFAULT_TEST_NUMBER
npm run noopenai:call

# Or explicit number
node no-openai/start-call.cjs +41782040799

# Explicit number + custom spoken prompt
node no-openai/start-call.cjs +41782040799 "Gruezi. Could you share today's daily menu?"
```

The call asks for the daily menu, listens, asks for price/pickup time, then confirms and hangs up.

## Project Structure

```
Poulet/
├── AGENTS.md        # Agent workflow and operational rules
├── SOUL.md          # Agent personality and behavior
├── IDENTITY.md      # Agent name, vibe, emoji
├── USER.md          # Your profile (built over time)
├── TOOLS.md         # Restaurant directory, voice prefs, local config
├── HEARTBEAT.md     # Periodic task config
├── no-openai/       # No-OpenAI Twilio + ElevenLabs call flow
├── .env             # Secrets (gitignored)
├── .env.example     # Template for secrets
├── package.json     # Node dependencies (openclaw)
└── memory/          # Auto-created session logs
```

## Adding Restaurants

Edit `TOOLS.md` to add known restaurants so Poulet can call them without asking for the number:

```markdown
- Pizzeria Napoli: +41 44 123 45 67
- Sushi Zen: +41 44 987 65 43
```

Poulet will also learn and add new restaurants to this list over time.

## License

MIT
