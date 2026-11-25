import {
  json,
  handleOptions,
  validUsername,
  validPassword,
  verifyPassword,
  createSession,
} from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  try {
    const { username, password } = await request.json();
    if (!validUsername(username) || !validPassword(password)) {
      return json({ error: "用户名或密码格式不正确" }, 400);
    }
    const raw = await env.CHAT_KV.get(`user:${username}`);
    if (!raw) {
      return json({ error: "用户不存在" }, 404);
    }
    const user = JSON.parse(raw);
    const ok = await verifyPassword(password, user.pwdHash);
    if (!ok) {
      return json({ error: "密码错误" }, 401);
    }
    const token = await createSession(env, username);
    return json({ token, username });
  } catch (e) {
    return json({ error: `服务器错误: ${e.message}` }, 500);
  }
}
