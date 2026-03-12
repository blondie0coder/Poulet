/**
 * Poulet webhook server
 * Receives ElevenLabs post-call webhooks and forwards a summary to Telegram.
 */
import Fastify from "fastify";
import dotenv from "dotenv";

dotenv.config();

const { TELEGRAM_BOT_TOKEN, SERVER_PORT, PUBLIC_URL,
        ELEVENLABS_ORDER_AGENT_ID } = process.env;
const PORT = Number(SERVER_PORT || 8000);

// Telegram chat ID for Chris
const TELEGRAM_CHAT_ID = "1001283603";

const fastify = Fastify({ logger: false });

fastify.get("/", async (_, reply) => {
  reply.send({ ok: true, service: "poulet-webhook-server" });
});

// ElevenLabs post-call webhook
fastify.post("/webhook/call-ended", async (request, reply) => {
  try {
    const body = request.body;
    const data = body?.data ?? body ?? {};
    const transcript = data?.transcript ?? [];
    const convId = data?.conversation_id ?? "unknown";
    const agentId = data?.agent_id ?? "";
    const callStatus = data?.status ?? "unknown";  // "done" | "failed" | "in-progress"

    console.log(`[webhook] agent=${agentId} conv=${convId} status=${callStatus}`);
    console.log(`[webhook] transcript lines: ${transcript.length}`);

    const isOrderCall = agentId === ELEVENLABS_ORDER_AGENT_ID;

    // Filter out empty/None messages
    const lines = transcript.filter(t => t.message && t.message !== "None");

    let text;

    if (isOrderCall) {
      if (callStatus === "done") {
        // Show the full conversation so Chris can see the order was confirmed
        const formatted = lines
          .map(t => `${t.role === "agent" ? "🤖" : "🍽️"} ${t.message}`)
          .join("\n");
        text = `✅ Order call completed!\n\n${formatted}`;
      } else {
        text = `⚠️ Order call ended with status: ${callStatus}. Conv ID: ${convId}`;
      }
    } else {
      // Menu call — show just the restaurant's lines so it reads as a menu
      const restaurantLines = lines
        .filter(t => t.role === "user")
        .map(t => t.message);

      if (callStatus !== "done") {
        text = `⚠️ Menu call ended with status: ${callStatus}. Conv ID: ${convId}`;
      } else if (restaurantLines.length) {
        text = `📋 Today's menu:\n\n${restaurantLines.join("\n")}\n\nWhat would you like to order?`;
      } else {
        // Fallback: show full transcript if restaurant lines are empty
        const full = lines.map(t => `${t.role === "agent" ? "🤖" : "🍽️"} ${t.message}`).join("\n");
        text = full
          ? `📋 Menu call ended:\n\n${full}\n\nWhat would you like to order?`
          : `📞 Menu call ended but nothing was captured. Conv ID: ${convId}`;
      }
    }

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
  if (!res.ok) throw new Error(`Telegram error: ${res.status} ${res.statusText}`);
  console.log("[Telegram] Message sent");
}

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`[Poulet] Webhook server on port ${PORT}`);
  console.log(`[Poulet] Webhook URL: ${PUBLIC_URL}/webhook/call-ended`);
});
