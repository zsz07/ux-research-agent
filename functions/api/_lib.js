const SESSION_TTL = 30 * 24 * 60 * 60;

const USERNAME_RE = /^[A-Za-z_][A-Za-z0-9_]{2,19}$/;

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extraHeaders,
    },
  });
}

export async function handleOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export function validUsername(u) {
  return USERNAME_RE.test(u);
}

export function validPassword(p) {
  return typeof p === "string" && p.length >= 6 && p.length <= 64;
}

async function pbkdf2(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hash = await pbkdf2(password, salt);
  return `${saltHex}:${hash}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, expectedHash] = String(stored || "").split(":");
  if (!saltHex || !expectedHash) return false;
  const saltBytes = new Uint8Array(
    saltHex.match(/.{2}/g).map((h) => parseInt(h, 16))
  );
  const actual = await pbkdf2(password, saltBytes);
  return actual === expectedHash;
}

export function newToken() {
  return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
}

export async function getUserFromRequest(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/);
  if (!match) return null;
  const token = match[1];
  const raw = await env.CHAT_KV.get(`session:${token}`);
  if (!raw) return null;
  try {
    const sess = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    if (sess.expiresAt && sess.expiresAt < now) return null;
    return { username: sess.username, token };
  } catch {
    return null;
  }
}

export async function createSession(env, username) {
  const token = newToken();
  const now = Math.floor(Date.now() / 1000);
  const sess = { username, createdAt: now, expiresAt: now + SESSION_TTL };
  await env.CHAT_KV.put(`session:${token}`, JSON.stringify(sess), {
    expirationTtl: SESSION_TTL,
  });
  return token;
}

export async function getConvList(env, username) {
  const raw = await env.CHAT_KV.get(`conv_list:${username}`);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function setConvList(env, username, list) {
  await env.CHAT_KV.put(`conv_list:${username}`, JSON.stringify(list));
}

export async function getConv(env, username, id) {
  const raw = await env.CHAT_KV.get(`conv:${username}:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setConv(env, username, id, messages) {
  await env.CHAT_KV.put(
    `conv:${username}:${id}`,
    JSON.stringify(messages)
  );
}

export async function deleteConv(env, username, id) {
  await env.CHAT_KV.delete(`conv:${username}:${id}`);
  const list = await getConvList(env, username);
  const filtered = list.filter((c) => c.id !== id);
  await setConvList(env, username, filtered);
}
