/**
 * Poulet webhook server
 * Receives ElevenLabs post-call webhooks and forwards the transcript to Telegram.
 */
import Fastify from "fastify";
import fastifyFormBody from "@fastify/formbody";
import dotenv from "dotenv";

dotenv.config();

const { TELEGRAM_BOT_TOKEN, SERVER_PORT, PUBLIC_URL } = process.env;
const PORT = Number(SERVER_PORT || 8000);

// Telegram user ID to send transcripts to (Chris)
const TELEGRAM_CHAT_ID = "1001283603";

const fastify = Fastify({ logger: false });
fastify.register(fastifyFormBody);

fastify.get("/", async (_, reply) => {
  reply.send({ ok: true, service: "poulet-webhook-server" });
});

// ElevenLabs post-call webhook
fastify.post("/webhook/call-ended", async (request, reply) => {
  try {
    const body = request.body;
    // ElevenLabs sends: { type, data: { conversation_id, transcript: [{role, message}] } }
    const transcript = body?.data?.transcript ?? body?.transcript ?? [];
    const convId = body?.data?.conversation_id ?? body?.conversation_id ?? "unknown";

    // Extract only the restaurant's responses
    const restaurantLines = transcript
      .filter(t => t.role !== "agent" && t.message && t.message !== "None")
      .map(t => t.message);

    const text = restaurantLines.length
      ? `📋 Today's menu:\n\n${restaurantLines.join("\n")}\n\nWhat would you like to order?`
      : `📞 Call ended but no menu was captured. Conv ID: ${convId}`;

    await sendTelegram(text);
    reply.send({ ok: true });
  } catch (err) {
    console.error("[webhook] error:", err.message);
    reply.code(500).send({ error: err.message });
  }
});

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) throw new Error(`Telegram error: ${res.statusText}`);
  console.log("[Telegram] Message sent");
}

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`[Poulet] Webhook server on port ${PORT}`);
  console.log(`[Poulet] Webhook URL: ${PUBLIC_URL}/webhook/call-ended`);
});
