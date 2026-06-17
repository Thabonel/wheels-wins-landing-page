#!/usr/bin/env node
/**
 * Smoke test for Pam V2 on staging.
 *
 * Unauthenticated checks:
 *   - GET /api/v2/pam/health returns 200 and pam_v2_enabled:true
 *
 * Authenticated checks (requires STAGING_EMAIL and STAGING_PASSWORD):
 *   - Supabase sign-in against staging project
 *   - POST /api/v2/pam/turn with a simple message and SSE read
 *
 * Usage:
 *   STAGING_EMAIL=... STAGING_PASSWORD=... node scripts/pam-v2-staging-smoke.mjs
 */

import { createClient } from "@supabase/supabase-js";

const BACKEND_URL = "https://wheels-wins-backend-staging.onrender.com";
const SUPABASE_URL = "https://fxdixausvpzmytyxfqhv.supabase.co";
const SUPABASE_ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY || "";

const exitOk = [];
const exitFail = [];

function pass(msg) {
  console.log(`✅ ${msg}`);
  exitOk.push(msg);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  exitFail.push(msg);
}

async function healthCheck() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v2/pam/health`);
    if (res.status !== 200) {
      fail(`V2 health returned HTTP ${res.status}`);
      return;
    }
    const body = await res.json();
    if (!body.pam_v2_enabled) {
      fail(`V2 health says pam_v2_enabled=false`);
      return;
    }
    pass(`V2 health OK: provider=${body.provider}, model=${body.model}`);
  } catch (err) {
    fail(`V2 health request failed: ${err.message}`);
  }
}

async function turnCheck() {
  const email = process.env.STAGING_EMAIL;
  const password = process.env.STAGING_PASSWORD;
  if (!email || !password) {
    console.log("ℹ️  Skipping authenticated turn test (set STAGING_EMAIL and STAGING_PASSWORD).");
    return;
  }

  if (!SUPABASE_ANON_KEY) {
    console.log("ℹ️  Skipping authenticated turn test (set STAGING_SUPABASE_ANON_KEY).");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    fail(`Staging sign-in failed: ${error?.message || "no session"}`);
    return;
  }

  const token = data.session.access_token;
  const conversationId = crypto.randomUUID();
  const clientMessageId = crypto.randomUUID();

  try {
    const res = await fetch(`${BACKEND_URL}/api/v2/pam/turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        client_message_id: clientMessageId,
        message: "Say a one-word greeting.",
        channel: "text",
        locale: "en-AU",
        timezone: "Australia/Sydney",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      fail(`V2 turn returned HTTP ${res.status}: ${body}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotText = false;
    let gotCompleted = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(trimmed.slice(6));
          if (event.event === "text_delta") gotText = true;
          if (event.event === "turn_completed") gotCompleted = true;
        } catch {
          // ignore malformed
        }
      }
    }

    if (gotText && gotCompleted) {
      pass("V2 turn streamed text and completed");
    } else {
      fail(`V2 turn incomplete: text=${gotText}, completed=${gotCompleted}`);
    }
  } catch (err) {
    fail(`V2 turn request failed: ${err.message}`);
  }
}

await healthCheck();
await turnCheck();

console.log("");
console.log(`Passed: ${exitOk.length}, Failed: ${exitFail.length}`);
process.exit(exitFail.length ? 1 : 0);
