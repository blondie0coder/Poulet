#!/usr/bin/env node
"use strict";

require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = Number(process.env.NOOPENAI_PORT || 3340);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const CALL_LANGUAGE = process.env.CALL_LANGUAGE || "de-CH";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
const ADMIN_TOKEN = process.env.NOOPENAI_ADMIN_TOKEN || "";

const audioDir = path.join(__dirname, "audio-cache");
fs.mkdirSync(audioDir, { recursive: true });
app.use("/audio", express.static(audioDir));

const sessions = new Map();

function ensureBaseUrl() {
  if (!PUBLIC_BASE_URL) {
    throw new Error("PUBLIC_BASE_URL is required");
  }
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

async function elevenLabsToMp3(text) {
  if (!ELEVENLABS_API_KEY) return null;

  const hash = crypto
    .createHash("sha1")
    .update(`${ELEVENLABS_VOICE_ID}|${ELEVENLABS_MODEL_ID}|${CALL_LANGUAGE}|${text}`)
    .digest("hex");

  const filename = `${hash}.mp3`;
  const fullPath = path.join(audioDir, filename);
  if (fs.existsSync(fullPath)) return `${PUBLIC_BASE_URL}/audio/${filename}`;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[elevenlabs] failed:", response.status, errBody.slice(0, 300));
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(fullPath, bytes);
  return `${PUBLIC_BASE_URL}/audio/${filename}`;
}

function extractText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c && c.type === "text" && typeof c.text === "string")
    .map((c) => c.text.trim())
    .filter(Boolean)
    .join(" ");
}

async function maybeRewriteWithClaude(message) {
  if (!ANTHROPIC_API_KEY) return message;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 120,
        system:
          "You are a concise phone assistant. Rewrite the text naturally for spoken phone audio. Keep it under 2 short sentences.",
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("[anthropic] rewrite failed:", response.status, errText.slice(0, 200));
      return message;
    }

    const payload = await response.json();
    return extractText(payload.content) || message;
  } catch (error) {
    console.warn("[anthropic] rewrite error:", error.message);
    return message;
  }
}

async function renderGatherResponse(options) {
  const { promptText, actionUrl, hints } = options;
  const audioUrl = await elevenLabsToMp3(promptText);
  const hintAttr = hints ? ` hints="${xmlEscape(hints)}"` : "";

  if (audioUrl) {
    return twiml(
      `<Gather input="speech" speechTimeout="auto" language="${xmlEscape(CALL_LANGUAGE)}"${hintAttr} action="${xmlEscape(
        actionUrl
      )}" method="POST"><Play>${xmlEscape(audioUrl)}</Play></Gather><Redirect method="POST">${xmlEscape(
        `${actionUrl}${actionUrl.includes("?") ? "&" : "?"}empty=1`
      )}</Redirect>`
    );
  }

  // Fallback only if ElevenLabs is unavailable.
  return twiml(
    `<Gather input="speech" speechTimeout="auto" language="${xmlEscape(CALL_LANGUAGE)}"${hintAttr} action="${xmlEscape(
      actionUrl
    )}" method="POST"><Say>${xmlEscape(promptText)}</Say></Gather><Redirect method="POST">${xmlEscape(
      `${actionUrl}${actionUrl.includes("?") ? "&" : "?"}empty=1`
    )}</Redirect>`
  );
}

async function renderSayAndHangup(text) {
  const finalText = await maybeRewriteWithClaude(text);
  const audioUrl = await elevenLabsToMp3(finalText);
  if (audioUrl) return twiml(`<Play>${xmlEscape(audioUrl)}</Play><Hangup/>`);
  return twiml(`<Say>${xmlEscape(finalText)}</Say><Hangup/>`);
}

function getSession(callSid) {
  if (!sessions.has(callSid)) {
    sessions.set(callSid, {
      menuTranscript: "",
      detailsTranscript: "",
      retries: 0,
      createdAt: Date.now(),
    });
  }
  return sessions.get(callSid);
}

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "no-openai-voice-loop" });
});

app.post("/twilio/no-openai/start", async (req, res) => {
  try {
    ensureBaseUrl();
    const callSid = req.body.CallSid || "unknown";
    const session = getSession(callSid);
    const requestedPrompt = (req.query.prompt || "").toString().trim();
    const defaultPrompt = "Gruezi. This is Poulet. Could you please tell me today's daily menu?";
    session.initialPrompt = requestedPrompt || session.initialPrompt || defaultPrompt;

    const actionUrl = `${PUBLIC_BASE_URL}/twilio/no-openai/step?turn=1`;
    const xml = await renderGatherResponse({
      promptText: session.initialPrompt,
      actionUrl,
      hints: "daily menu,lunch special,menu of the day",
    });

    res.type("text/xml").send(xml);
  } catch (error) {
    console.error("[start] error:", error.message);
    res.type("text/xml").send(twiml("<Say>Sorry, there was a setup error.</Say><Hangup/>"));
  }
});

app.post("/twilio/no-openai/step", async (req, res) => {
  try {
    ensureBaseUrl();
    const turn = Number(req.query.turn || 1);
    const isEmptyRedirect = String(req.query.empty || "") === "1";
    const callSid = req.body.CallSid || "unknown";
    const speech = (req.body.SpeechResult || "").trim();
    const session = getSession(callSid);

    if (!speech || isEmptyRedirect) {
      session.retries += 1;
      if (session.retries > 1) {
        const xml = await renderSayAndHangup(
          "I could not hear a clear answer. Please call again. Goodbye."
        );
        return res.type("text/xml").send(xml);
      }

      const retryAction = `${PUBLIC_BASE_URL}/twilio/no-openai/step?turn=${turn}`;
      const xml = await renderGatherResponse({
        promptText: "Sorry, I did not catch that. Could you repeat, please?",
        actionUrl: retryAction,
        hints: "menu,price,pickup time",
      });
      return res.type("text/xml").send(xml);
    }

    session.retries = 0;

    if (turn === 1) {
      session.menuTranscript = speech;
      const nextAction = `${PUBLIC_BASE_URL}/twilio/no-openai/step?turn=2`;
      const xml = await renderGatherResponse({
        promptText: "Thank you. Could you also tell me the price and pickup time?",
        actionUrl: nextAction,
        hints: "price,pickup time,ready at",
      });
      return res.type("text/xml").send(xml);
    }

    session.detailsTranscript = speech;
    const summary = `Thank you. I noted: menu is ${session.menuTranscript}. Price and time: ${session.detailsTranscript}. I will report this to my user now. Goodbye.`;
    const xml = await renderSayAndHangup(summary);
    return res.type("text/xml").send(xml);
  } catch (error) {
    console.error("[step] error:", error.message);
    res.type("text/xml").send(twiml("<Say>Sorry, an error occurred.</Say><Hangup/>"));
  }
});

app.post("/twilio/no-openai/call", async (req, res) => {
  try {
    ensureBaseUrl();
    if (ADMIN_TOKEN && req.header("x-admin-token") !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      return res.status(500).json({ error: "missing Twilio env configuration" });
    }

    const to = req.body.to || process.env.DEFAULT_TEST_NUMBER;
    const prompt =
      (req.body.prompt || "").toString().trim() ||
      "Gruezi. This is Poulet. Could you please tell me today's daily menu?";
    if (!to) return res.status(400).json({ error: "missing destination number" });

    const params = new URLSearchParams();
    params.set("To", to);
    params.set("From", TWILIO_FROM_NUMBER);
    params.set(
      "Url",
      `${PUBLIC_BASE_URL}/twilio/no-openai/start?prompt=${encodeURIComponent(prompt)}`
    );
    params.set("Method", "POST");
    params.set("StatusCallback", `${PUBLIC_BASE_URL}/twilio/no-openai/status`);
    params.set("StatusCallbackMethod", "POST");
    params.append("StatusCallbackEvent", "initiated");
    params.append("StatusCallbackEvent", "ringing");
    params.append("StatusCallbackEvent", "answered");
    params.append("StatusCallbackEvent", "completed");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json(payload);
    return res.json({
      sid: payload.sid,
      status: payload.status,
      to: payload.to,
      prompt,
    });
  } catch (error) {
    console.error("[call] error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/twilio/no-openai/status", (req, res) => {
  const { CallSid, CallStatus, Duration } = req.body;
  console.log("[status]", CallSid, CallStatus, Duration || "-");
  res.type("text/xml").send(twiml(""));
});

app.listen(PORT, () => {
  console.log(`[no-openai-voice-loop] listening on http://127.0.0.1:${PORT}`);
});

