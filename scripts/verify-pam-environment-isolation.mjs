#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_STAGING_REF = "fxdixausvpzmytyxfqhv";
const DEFAULT_PRODUCTION_REF = "kycoklimpzkyrecbjecn";
const DEFAULT_FILES = [
  ".env.local",
  ".env.staging",
  ".env.staging.example",
  "config/environments/staging.json",
  "netlify.toml",
];

const SUPABASE_REF_RE = /^[a-z0-9]{20}$/;

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseJwtPayload(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
}

function extractSupabaseRef(value) {
  if (!value || /<|>|your_|placeholder/i.test(value)) return null;

  const jwtPayload = parseJwtPayload(value);
  if (jwtPayload?.ref && SUPABASE_REF_RE.test(jwtPayload.ref)) {
    return {
      ref: jwtPayload.ref,
      source: "jwt",
      role: jwtPayload.role || "unknown",
    };
  }

  const directHostMatch = value.match(
    /(?:https?:\/\/)?([a-z0-9]{20})\.supabase\.co\b/i,
  );
  if (directHostMatch) {
    return {
      ref: directHostMatch[1],
      source: "url",
      restEndpoint: /\/rest\/v1\/?$/i.test(value),
    };
  }

  const dbHostMatch = value.match(/db\.([a-z0-9]{20})\.supabase\.co\b/i);
  if (dbHostMatch) {
    return {
      ref: dbHostMatch[1],
      source: "database_url",
    };
  }

  return null;
}

function redactValue(value) {
  const ref = extractSupabaseRef(value);
  if (!ref) return value ? "<set>" : "<empty>";
  if (ref.source === "jwt") return `<jwt role=${ref.role} ref=${ref.ref}>`;
  return `<${ref.source} ref=${ref.ref}>`;
}

function parseDotenv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }

  return values;
}

function parseJson(content) {
  const parsed = JSON.parse(content);
  const values = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

function parseTomlLike(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("[")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"(.*)"\s*$/);
    if (match) values[match[1]] = match[2];
  }

  return values;
}

function readConfigFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const extension = path.extname(filePath);

  if (extension === ".json") return parseJson(content);
  if (extension === ".toml") return parseTomlLike(content);
  return parseDotenv(content);
}

function collectFindings(files, options) {
  const failures = [];
  const warnings = [];
  const observations = [];
  const foundRefs = new Set();

  if (options.stagingRef === options.productionRef && !options.allowSharedDatabase) {
    failures.push(
      `Staging and production Supabase refs are both ${options.stagingRef}. Refusing to continue without --allow-shared-database.`,
    );
  }

  for (const file of files) {
    if (!fs.existsSync(file)) {
      warnings.push(`Skipped missing file: ${file}`);
      continue;
    }

    let values;
    try {
      values = readConfigFile(file);
    } catch (error) {
      failures.push(`Could not parse ${file}: ${error.message}`);
      continue;
    }

    for (const [key, value] of Object.entries(values)) {
      const refInfo = extractSupabaseRef(value);
      if (refInfo) {
        foundRefs.add(refInfo.ref);
        observations.push(`${file}: ${key} -> ${redactValue(value)}`);

        if (refInfo.restEndpoint) {
          failures.push(
            `${file}: ${key} uses /rest/v1. Use the base Supabase URL: https://${refInfo.ref}.supabase.co`,
          );
        }

        if (options.mode === "staging" && refInfo.ref === options.productionRef) {
          failures.push(
            `${file}: ${key} points at production Supabase ref ${options.productionRef}; staging must use ${options.stagingRef}.`,
          );
        }

        if (
          options.mode === "staging" &&
          refInfo.ref !== options.stagingRef &&
          refInfo.ref !== options.productionRef
        ) {
          failures.push(
            `${file}: ${key} points at unexpected Supabase ref ${refInfo.ref}; expected staging ref ${options.stagingRef}.`,
          );
        }
      }

      if (
        options.mode === "staging" &&
        ["VITE_BACKEND_URL", "VITE_API_URL", "BACKEND_URL"].includes(key) &&
        value.includes("pam-backend.onrender.com")
      ) {
        failures.push(
          `${file}: ${key} points at production backend pam-backend.onrender.com; use wheels-wins-backend-staging.onrender.com for staging.`,
        );
      }

      if (
        options.mode === "staging" &&
        key === "VITE_PAM_WEBSOCKET_URL" &&
        value.includes("pam-backend.onrender.com")
      ) {
        failures.push(
          `${file}: ${key} points at production WebSocket backend; use the staging backend WebSocket URL.`,
        );
      }
    }
  }

  if (options.mode === "staging" && !foundRefs.has(options.stagingRef)) {
    warnings.push(
      `No checked file currently references staging Supabase ref ${options.stagingRef}. Deployment dashboards may still be configured correctly, but this repo cannot prove it yet.`,
    );
  }

  return { failures, warnings, observations };
}

function parseArgs(argv) {
  const options = {
    files: [],
    mode: "staging",
    stagingRef: process.env.STAGING_SUPABASE_REF || DEFAULT_STAGING_REF,
    productionRef: process.env.PRODUCTION_SUPABASE_REF || DEFAULT_PRODUCTION_REF,
    allowSharedDatabase: process.env.ALLOW_SHARED_STAGING_DATABASE === "true",
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") options.files.push(argv[++index]);
    else if (arg === "--mode") options.mode = argv[++index];
    else if (arg === "--staging-ref") options.stagingRef = argv[++index];
    else if (arg === "--production-ref") options.productionRef = argv[++index];
    else if (arg === "--allow-shared-database") options.allowSharedDatabase = true;
    else if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["staging", "production"].includes(options.mode)) {
    throw new Error("--mode must be staging or production");
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/verify-pam-environment-isolation.mjs [options]

Options:
  --file <path>              File to inspect. Repeatable.
  --mode <staging|production> Defaults to staging.
  --staging-ref <ref>        Expected staging Supabase project ref.
  --production-ref <ref>     Known production Supabase project ref.
  --allow-shared-database    Permit matching staging/production refs.
  --self-test                Run built-in fixture tests.
`);
}

function runSelfTests() {
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), ".tmp-pam-isolation-"));
  const oldProd = path.join(tempDir, "old.env");
  const staging = path.join(tempDir, "staging.env");
  const rest = path.join(tempDir, "rest.env");

  fs.writeFileSync(
    oldProd,
    "VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co\n",
  );
  fs.writeFileSync(
    staging,
    "VITE_SUPABASE_URL=https://fxdixausvpzmytyxfqhv.supabase.co\nVITE_BACKEND_URL=https://wheels-wins-backend-staging.onrender.com\n",
  );
  fs.writeFileSync(
    rest,
    "VITE_SUPABASE_URL=https://fxdixausvpzmytyxfqhv.supabase.co/rest/v1/\n",
  );

  const baseOptions = {
    mode: "staging",
    stagingRef: DEFAULT_STAGING_REF,
    productionRef: DEFAULT_PRODUCTION_REF,
    allowSharedDatabase: false,
  };

  const oldResult = collectFindings([oldProd], baseOptions);
  if (oldResult.failures.length === 0) {
    throw new Error("Self-test failed: production ref was not rejected");
  }

  const stagingResult = collectFindings([staging], baseOptions);
  if (stagingResult.failures.length !== 0) {
    throw new Error(
      `Self-test failed: valid staging env rejected: ${stagingResult.failures.join("; ")}`,
    );
  }

  const restResult = collectFindings([rest], baseOptions);
  if (!restResult.failures.some((failure) => failure.includes("/rest/v1"))) {
    throw new Error("Self-test failed: /rest/v1 endpoint was not rejected");
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("Self-tests passed.");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    runSelfTests();
    return;
  }

  const files = options.files.length > 0 ? options.files : DEFAULT_FILES;
  const { failures, warnings, observations } = collectFindings(files, options);

  console.log("PAM environment isolation check");
  console.log(`Mode: ${options.mode}`);
  console.log(`Expected staging ref: ${options.stagingRef}`);
  console.log(`Known production ref: ${options.productionRef}`);
  console.log("");

  if (observations.length > 0) {
    console.log("Observed Supabase references:");
    for (const observation of observations) console.log(`  - ${observation}`);
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) console.log(`  - ${warning}`);
    console.log("");
  }

  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("PASS: staging Supabase configuration is isolated in checked files.");
}

main();
