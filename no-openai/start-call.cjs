#!/usr/bin/env node
"use strict";

require("dotenv").config();

const SERVER_URL = process.env.NOOPENAI_SERVER_URL || "http://127.0.0.1:3340";
const ADMIN_TOKEN = process.env.NOOPENAI_ADMIN_TOKEN || "";
const target = process.argv[2] || process.env.DEFAULT_TEST_NUMBER;

if (!target) {
  console.error("Usage: node no-openai/start-call.cjs <E.164-number>");
  process.exit(1);
}

async function main() {
  const response = await fetch(`${SERVER_URL}/twilio/no-openai/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_TOKEN ? { "x-admin-token": ADMIN_TOKEN } : {}),
    },
    body: JSON.stringify({ to: target }),
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error("Call start failed:", payload);
    process.exit(1);
  }

  console.log(`Call started: ${payload.sid} -> ${payload.to} (${payload.status})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

