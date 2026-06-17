#!/usr/bin/env node
/**
 * Trigger Render + Netlify staging deploys for the pam-v2-rebuild branch.
 *
 * Required env:
 *   RENDER_API_KEY
 *   RENDER_STAGING_SERVICE_ID
 *   NETLIFY_AUTH_TOKEN (optional, can also use the site dashboard)
 *   NETLIFY_STAGING_SITE_ID (optional)
 */

const RENDER_API = "https://api.render.com/v1";

async function renderDeploy(serviceId, apiKey) {
  const res = await fetch(`${RENDER_API}/services/${serviceId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clearCache: "clear" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Render deploy trigger failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function netlifyDeploy(siteId, token, dir = "./dist") {
  // Netlify CLI deploy is easier interactively; this is a placeholder for API usage.
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/zip",
    },
    body: "", // would need a zipped build artifact
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Netlify deploy trigger failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function main() {
  const renderKey = process.env.RENDER_API_KEY;
  const renderService = process.env.RENDER_STAGING_SERVICE_ID;
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
  const netlifySite = process.env.NETLIFY_STAGING_SITE_ID;

  if (!renderKey || !renderService) {
    console.error("Missing RENDER_API_KEY or RENDER_STAGING_SERVICE_ID.");
    console.error("Set them, or deploy manually via the Render dashboard.");
    process.exit(1);
  }

  console.log("Triggering Render staging deploy...");
  const render = await renderDeploy(renderService, renderKey);
  console.log(`Render deploy id: ${render.id}`);

  if (netlifyToken && netlifySite) {
    console.log("Triggering Netlify staging deploy (placeholder)...");
    // In practice, build locally and use netlify CLI or actions.
    console.log("Netlify auto-deploy from dashboard/Git is preferred; skipping API zip deploy.");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
