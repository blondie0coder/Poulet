/**
 * Poulet Voice Server
 *
 * Bridges Twilio outbound calls with ElevenLabs Conversational AI.
 * Based on the official ElevenLabs + Twilio example:
 * https://github.com/elevenlabs/elevenlabs-examples/tree/main/examples/conversational-ai/twilio/javascript
 *
 * POST /call  { to, prompt, first_message }  → places an outbound call
 * GET  /      → health check
 */

import Fastify from "fastify";
import WebSocket from "ws";
import dotenv from "dotenv";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";
import Twilio from "twilio";

dotenv.config();

const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  SERVER_PORT,
  PUBLIC_URL,
} = process.env;

if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
  console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID");
  process.exit(1);
}
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
  console.error("Missing Twilio credentials");
  process.exit(1);
}
if (!PUBLIC_URL) {
  console.error("Missing PUBLIC_URL (your ngrok https URL, no trailing slash)");
  process.exit(1);
}

const PORT = Number(SERVER_PORT || 8000);
const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const fastify = Fastify({ logger: true });
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// ── Health check ──────────────────────────────────────────────────────────────

fastify.get("/", async (_, reply) => {
  reply.send({ ok: true, service: "poulet-voice-server" });
});

// ── Initiate outbound call ────────────────────────────────────────────────────

fastify.post("/call", async (request, reply) => {
  const { to, prompt, first_message } = request.body ?? {};

  if (!to) {
    return reply.code(400).send({ error: "Missing 'to' phone number" });
  }

  const twimlUrl = `${PUBLIC_URL}/call-twiml?prompt=${encodeURIComponent(
    prompt ?? ""
  )}&first_message=${encodeURIComponent(
    first_message ?? "Hello! This is Poulet, your food ordering assistant. How can I help you today?"
  )}`;

  try {
    const call = await twilioClient.calls.create({
      from: TWILIO_FROM_NUMBER,
      to,
      url: twimlUrl,
    });

    reply.send({ ok: true, callSid: call.sid, to, status: call.status });
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: err.message });
  }
});

// ── TwiML for outbound call ───────────────────────────────────────────────────

fastify.all("/call-twiml", async (request, reply) => {
  const prompt = request.query.prompt ?? "";
  const first_message = request.query.first_message ?? "";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${request.headers.host}/media-stream">
      <Parameter name="prompt" value="${prompt.replace(/"/g, "&quot;")}"/>
      <Parameter name="first_message" value="${first_message.replace(/"/g, "&quot;")}"/>
    </Stream>
  </Connect>
</Response>`;

  reply.type("text/xml").send(twiml);
});

// ── WebSocket: bridge Twilio ↔ ElevenLabs ────────────────────────────────────

async function getSignedUrl() {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );
  if (!res.ok) throw new Error(`ElevenLabs signed URL failed: ${res.statusText}`);
  const { signed_url } = await res.json();
  return signed_url;
}

fastify.register(async (instance) => {
  instance.get("/media-stream", { websocket: true }, (twilioWs) => {
    console.log("[Server] Twilio connected to media stream");

    let streamSid = null;
    let callSid = null;
    let elevenLabsWs = null;
    let customParams = null;

    twilioWs.on("error", console.error);

    const setupElevenLabs = async () => {
      try {
        const signedUrl = await getSignedUrl();
        elevenLabsWs = new WebSocket(signedUrl);

        elevenLabsWs.on("open", () => {
          console.log("[ElevenLabs] Connected");

          const initConfig = {
            type: "conversation_initiation_client_data",
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: customParams?.prompt || "You are Poulet, a helpful food ordering assistant calling a restaurant on behalf of a customer.",
                },
                first_message: customParams?.first_message || "Hello! This is Poulet, your food ordering assistant.",
              },
            },
          };

          elevenLabsWs.send(JSON.stringify(initConfig));
          console.log("[ElevenLabs] Sent init config, first_message:", initConfig.conversation_config_override.agent.first_message.slice(0, 80));
        });

        elevenLabsWs.on("message", (data) => {
          try {
            const msg = JSON.parse(data);

            switch (msg.type) {
              case "audio":
                if (streamSid) {
                  const payload = msg.audio?.chunk ?? msg.audio_event?.audio_base_64;
                  if (payload) {
                    twilioWs.send(JSON.stringify({ event: "media", streamSid, media: { payload } }));
                  }
                }
                break;

              case "interruption":
                if (streamSid) twilioWs.send(JSON.stringify({ event: "clear", streamSid }));
                break;

              case "ping":
                if (msg.ping_event?.event_id) {
                  elevenLabsWs.send(JSON.stringify({ type: "pong", event_id: msg.ping_event.event_id }));
                }
                break;

              case "agent_response":
                console.log("[Agent]", msg.agent_response_event?.agent_response?.slice(0, 100));
                break;

              case "user_transcript":
                console.log("[User]", msg.user_transcription_event?.user_transcript?.slice(0, 100));
                break;

              case "conversation_initiation_metadata":
                console.log("[ElevenLabs] Conversation started");
                break;
            }
          } catch (err) {
            console.error("[ElevenLabs] message parse error:", err.message);
          }
        });

        elevenLabsWs.on("error", (err) => console.error("[ElevenLabs] WS error:", err));
        elevenLabsWs.on("close", () => console.log("[ElevenLabs] Disconnected"));
      } catch (err) {
        console.error("[ElevenLabs] Setup error:", err.message);
      }
    };

    setupElevenLabs();

    twilioWs.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);

        switch (msg.event) {
          case "start":
            streamSid = msg.start.streamSid;
            callSid = msg.start.callSid;
            customParams = msg.start.customParameters;
            console.log(`[Twilio] Stream started — StreamSid: ${streamSid}, CallSid: ${callSid}`);

            // Re-configure ElevenLabs with the actual prompt/first_message from TwiML params
            if (elevenLabsWs?.readyState === WebSocket.OPEN && customParams) {
              const cfg = {
                type: "conversation_initiation_client_data",
                conversation_config_override: {
                  agent: {
                    prompt: { prompt: customParams.prompt || "" },
                    first_message: customParams.first_message || "",
                  },
                },
              };
              elevenLabsWs.send(JSON.stringify(cfg));
            }
            break;

          case "media":
            if (elevenLabsWs?.readyState === WebSocket.OPEN) {
              elevenLabsWs.send(
                JSON.stringify({ user_audio_chunk: Buffer.from(msg.media.payload, "base64").toString("base64") })
              );
            }
            break;

          case "stop":
            console.log(`[Twilio] Stream ${streamSid} stopped`);
            if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
            break;
        }
      } catch (err) {
        console.error("[Twilio] message error:", err.message);
      }
    });

    twilioWs.on("close", () => {
      console.log("[Twilio] Disconnected");
      if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
    });
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[Poulet] Voice server running on port ${PORT}`);
  console.log(`[Poulet] Outbound call endpoint: POST ${PUBLIC_URL}/call`);
});
