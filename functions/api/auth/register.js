import {
  json,
  handleOptions,
  validUsername,
  validPassword,
  hashPassword,
  createSession,
} from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  const envKeys = Object.keys(env || {});
  const hasCHAT_KV = !!env.CHAT_KV;
  const kvType = env.CHAT_KV ? typeof env.CHAT_KV : "undefined";
  const kvMethods = env.CHAT_KV
    ? Object.getOwnPropertyNames(Object.getPrototypeOf(env.CHAT_KV))
    : [];
  if (!env.CHAT_KV) {
    return json({
      error: "服务器未绑定 CHAT_KV",
      debug: {
        envKeys,
        hasCHAT_KV,
        kvType,
        msg: "检查 Settings → Bindings 里变量名是否精确为 CHAT_KV（全大写下划线）",
      },
    }, 500);
  }
  try {
    const { username, password } = await request.json();
    if (!validUsername(username)) {
      return json(
        { error: "用户名不合法（3-20 字符，字母/数字/下划线，不能数字开头）" },
        400
      );
    }
    if (!validPassword(password)) {
      return json({ error: "密码至少 6 位" }, 400);
    }
    const exists = await env.CHAT_KV.get(`user:${username}`);
    if (exists) {
      return json({ error: "用户名已被占用" }, 409);
    }
    const pwdHash = await hashPassword(password);
    const now = Math.floor(Date.now() / 1000);
    await env.CHAT_KV.put(
      `user:${username}`,
      JSON.stringify({ pwdHash, createdAt: now })
    );
    const token = await createSession(env, username);
    return json({ token, username });
  } catch (e) {
    return json({ error: `服务器错误: ${e.message}` }, 500);
  }
}
