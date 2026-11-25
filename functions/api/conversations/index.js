import {
  json,
  handleOptions,
  getUserFromRequest,
  getConvList,
  setConvList,
} from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return json({ error: "未登录" }, 401);
  }
  const list = await getConvList(env, user.username);
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return json({ conversations: list });
}

export async function onRequestPost({ request, env }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return json({ error: "未登录" }, 401);
  }
  try {
    const body = await request.json().catch(() => ({}));
    const title = (body.title || "新对话").slice(0, 60);
    const id =
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8);
    const now = Math.floor(Date.now() / 1000);
    const list = await getConvList(env, user.username);
    list.push({ id, title, createdAt: now, updatedAt: now });
    await setConvList(env, user.username, list);
    await env.CHAT_KV.put(
      `conv:${user.username}:${id}`,
      JSON.stringify([])
    );
    return json({ id, title, createdAt: now, updatedAt: now });
  } catch (e) {
    return json({ error: `服务器错误: ${e.message}` }, 500);
  }
}
