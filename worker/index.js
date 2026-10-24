
const TABLES = [
  "Clients",
  "Quotations",
  "Invoices",
  "DeliveryNotes",
  "ClientPOs",
  "Vendors",
  "PurchaseOrders"
];

const ROLES = {
  admin: ["read", "create", "update", "delete"],
  manager: ["read", "create", "update"],
  staff: ["read", "create"]
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(data) {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decode(value) {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "=".repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmac(secret) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    { name: "HMAC" },
    await hmac(secret),
    enc.encode(body)
  );
  return `${body}.${b64url(signature)}`;
}

async function verify(token, secret) {
  try {
    const [body, sig, extra] = token.split(".");
    if (!body || !sig || extra) return null;

    const valid = await crypto.subtle.verify(
      { name: "HMAC" },
      await hmac(secret),
      decode(sig),
      enc.encode(body)
    );

    if (!valid) return null;

    const payload = JSON.parse(dec.decode(decode(body)));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function json(data, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };

  if (origin) headers["Access-Control-Allow-Origin"] = origin;

  return new Response(JSON.stringify(data), { status, headers });
}

function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "")
    .split(",")
    .map(s => s.trim());

  return allowed.includes(origin) ? origin : "";
}

function parseUsers(env) {
  const users = JSON.parse(env.USERS_JSON || "[]");
  if (!Array.isArray(users)) throw Error("Invalid USERS_JSON");
  return users;
}

function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return difference === 0;
}

// GOOGLE SERVICE ACCOUNT AUTHENTICATION

async function googleToken(env) {
  const sa = JSON.parse(env.SERVICE_ACCOUNT_JSON);

  if (!sa.client_email || !sa.private_key) {
    throw Error("Invalid service account configuration");
  }

  const header = b64url(
    enc.encode(JSON.stringify({
      alg: "RS256",
      typ: "JWT"
    }))
  );

  const now = Math.floor(Date.now() / 1000);

  const claims = b64url(
    enc.encode(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3500
    }))
  );

  const privateKey = sa.private_key
    .replace(
      /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
      ""
    );

  const keyBytes = Uint8Array.from(
    atob(privateKey),
    c => c.charCodeAt(0)
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  // Explicit SHA-256 algorithm configuration
  const signature = await crypto.subtle.sign(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    key,
    enc.encode(`${header}.${claims}`)
  );

  const assertion =
    `${header}.${claims}.${b64url(signature)}`;

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    }
  );

  if (!response.ok) {
    throw Error(
      `Google authentication failed (${response.status})`
    );
  }

  const result = await response.json();

  if (!result.access_token) {
    throw Error("Google did not return an access token");
  }

  return result.access_token;
}

// GOOGLE SHEETS DATABASE

async function sheet(
  env,
  table,
  method = "GET",
  range = "A:I",
  body
) {
  if (!TABLES.includes(table)) {
    throw Error("Invalid database table");
  }

  const token = await googleToken(env);

  const base =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${encodeURIComponent(env.SPREADSHEET_ID)}/values/` +
    `${encodeURIComponent(table + "!" + range)}`;

  let url = base;
  let httpMethod = method;

  if (method === "APPEND") {
    url += ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
    httpMethod = "POST";
  } else if (method === "PUT") {
    url += "?valueInputOption=RAW";
  }

  const response = await fetch(url, {
    method: httpMethod,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw Error(`Google Sheets request failed (${response.status})`);
  }

  return response.json();
}

// DATABASE RECORD CONVERSION

function rowObj(row) {
  let extra = {};

  try {
    extra = JSON.parse(row[8] || "{}");
    if (!extra || typeof extra !== "object" || Array.isArray(extra)) {
      extra = {};
    }
  } catch {
    extra = {};
  }

  return {
    ...extra,
    id: row[0] || "",
    brand_id: row[1] || "",
    reference: row[2] || "",
    name: row[3] || "",
    status: row[4] || "",
    amount: Number(row[5] || 0),
    date: row[6] || "",
    updated_at: row[7] || ""
  };
}

function toRow(record) {
  const {
    id,
    brand_id,
    reference,
    name,
    status,
    amount,
    date,
    updated_at,
    ...extra
  } = record;

  return [
    id,
    brand_id,
    reference || "",
    name || "",
    status || "",
    Number(amount) || 0,
    date || "",
    updated_at || new Date().toISOString(),
    JSON.stringify(extra)
  ];
}

function cleanRecord(body, user, brand, existing) {
  const data = { ...existing, ...body };

  for (const key of [
    "id",
    "brand_id",
    "created_by",
    "created_at",
    "updated_at",
    "row"
  ]) {
    delete data[key];
  }

  const now = new Date().toISOString();

  const record = {
    ...data,
    id: existing?.id || crypto.randomUUID(),
    brand_id: brand,
    created_by: existing?.created_by || user.username,
    created_at: existing?.created_at || now,
    updated_at: now
  };

  for (const key of Object.keys(record)) {
    if (
      typeof record[key] === "object" &&
      record[key] !== null
    ) {
      record[key] = JSON.stringify(record[key]);
    }
  }

  return record;
}

// MAIN WORKER

export default {
  async fetch(req, env) {
    const origin = cors(req, env);
    const url = new URL(req.url);

    // Serve frontend static assets when available
    if (!url.pathname.startsWith("/api/")) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(req);
      }
      return json({ error: "Frontend assets not configured" }, 404);
    }

    const baseHeaders = {
      "Access-Control-Allow-Headers":
        "authorization,content-type",
      "Access-Control-Allow-Methods":
        "GET,POST,PATCH,OPTIONS",
      "Vary": "Origin"
    };

    if (origin) {
      baseHeaders["Access-Control-Allow-Origin"] = origin;
    }

    if (req.method === "OPTIONS") {
      if (req.headers.get("Origin") && !origin) {
        return json({ error: "Origin not allowed" }, 403);
      }
      return new Response(null, {
        status: 204,
        headers: baseHeaders
      });
    }

    if (req.headers.get("Origin") && !origin) {
      return json({ error: "Origin not allowed" }, 403);
    }

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true }, 200, origin);
      }

      const required = [
        "AUTH_SECRET",
        "USERS_JSON",
        "SPREADSHEET_ID",
        "SERVICE_ACCOUNT_JSON"
      ];

      const missing = required.filter(key => !env[key]);

      if (missing.length) {
        return json({
          error: "Backend secrets are not configured",
          missing
        }, 500, origin);
      }

      // LOGIN

      if (
        url.pathname === "/api/login" &&
        req.method === "POST"
      ) {
        const body = await req.json();

        const user = parseUsers(env).find(
          u => u.username === body.username
        );

        if (
          !user ||
          !equal(user.password, body.password) ||
          !ROLES[user.role] ||
          !Array.isArray(user.brands)
        ) {
          return json({
            error: "Invalid credentials"
          }, 401, origin);
        }

        const payload = {
          username: user.username,
          role: user.role,
          brands: user.brands,
          exp: Date.now() + 8 * 60 * 60 * 1000
        };

        return json({
          token: await sign(payload, env.AUTH_SECRET),
          user: {
            username: payload.username,
            role: payload.role,
            brands: payload.brands
          }
        }, 200, origin);
      }

      // AUTHENTICATION

      const auth = (
        req.headers.get("Authorization") || ""
      ).replace(/^Bearer\s+/i, "");

      const user = await verify(auth, env.AUTH_SECRET);

      if (!user) {
        return json({
          error: "Session expired or unauthorized"
        }, 401, origin);
      }

      if (url.pathname === "/api/me") {
        return json({
          user: {
            username: user.username,
            role: user.role,
            brands: user.brands
          }
        }, 200, origin);
      }

      // RECORD ROUTING

      const parts = url.pathname.split("/").filter(Boolean);

      if (
        parts[0] !== "api" ||
        parts[1] !== "records" ||
        !TABLES.includes(parts[2])
      ) {
        return json({ error: "Not found" }, 404, origin);
      }

      const table = parts[2];
      const id = parts[3];
      const brand = url.searchParams.get("brand") || "";

      if (!user.brands.includes(brand)) {
        return json({
          error: "Brand access denied"
        }, 403, origin);
      }

      const permission =
        req.method === "GET" ? "read" :
        req.method === "POST" ? "create" :
        req.method === "PATCH" ? "update" : "";

      if (!ROLES[user.role]?.includes(permission)) {
        return json({
          error: "Permission denied"
        }, 403, origin);
      }

      const result = await sheet(env, table);
      const values = result.values || [];

      const rows = values
        .slice(1)
        .map((r, i) => ({
          row: i + 2,
          ...rowObj(r)
        }))
        .filter(r =>
          r.brand_id === brand &&
          r.status !== "Deleted"
        );

      // GET RECORDS

      if (req.method === "GET") {
        const q = (
          url.searchParams.get("q") || ""
        ).toLowerCase();

        const records = rows
          .filter(r =>
            !q ||
            JSON.stringify(r).toLowerCase().includes(q)
          )
          .map(({ row, ...record }) => record);

        return json({ records }, 200, origin);
      }

      // CREATE RECORD

      if (req.method === "POST" && !id) {
        const body = await req.json();

        const record = cleanRecord(
          body,
          user,
          brand
        );

        if (!record.reference) {
          record.reference =
            `${table.slice(0, 3).toUpperCase()}-` +
            record.id.slice(0, 8).toUpperCase();
        }

        await sheet(env, table, "APPEND", "A:I", {
          values: [toRow(record)]
        });

        return json({ record }, 201, origin);
      }

      // UPDATE RECORD

      if (req.method === "PATCH" && id) {
        const old = rows.find(r => r.id === id);

        if (!old) {
          return json({
            error: "Record not found"
          }, 404, origin);
        }

        const body = await req.json();

        if (
          body.status === "Deleted" &&
          user.role !== "admin"
        ) {
          return json({
            error: "Only admins can archive records"
          }, 403, origin);
        }

        const { row, ...original } = old;

        const record = cleanRecord(
          body,
          user,
          brand,
          original
        );

        await sheet(
          env,
          table,
          "PUT",
          `A${row}:I${row}`,
          { values: [toRow(record)] }
        );

        return json({ record }, 200, origin);
      }

      return json({
        error: "Unsupported operation"
      }, 405, origin);

    } catch (error) {
      console.error("Worker error:", error.message);

      return json({
        error: error.message || "Unexpected error"
      }, 500, origin);
    }
  }
};
