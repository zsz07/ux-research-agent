import {
  json,
  handleOptions,
  getUserFromRequest,
  getConv,
  setConv,
  deleteConv,
  getConvList,
  setConvList,
} from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env, params }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return json({ error: "未登录" }, 401);
  }
  const id = params.id;
  const messages = await getConv(env, user.username, id);
  if (messages === null) {
    return json({ error: "对话不存在" }, 404);
  }
  return json({ id, messages });
}

export async function onRequestPut({ request, env, params }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return json({ error: "未登录" }, 401);
  }
  const id = params.id;
  try {
    const body = await request.json();
    if (!Array.isArray(body.messages)) {
      return json({ error: "messages 必须是数组" }, 400);
    }
    const cleanMessages = body.messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant" || m.role === "system") &&
          typeof m.content === "string"
      )
      .slice(-100)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 8000),
        ts: m.ts || Math.floor(Date.now() / 1000),
      }));
    await setConv(env, user.username, id, cleanMessages);

    const title = (body.title || "").slice(0, 60);
    const list = await getConvList(env, user.username);
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) {
      list[idx].updatedAt = Math.floor(Date.now() / 1000);
      if (title) list[idx].title = title;
      await setConvList(env, user.username, list);
    }
    return json({ ok: true, count: cleanMessages.length });
  } catch (e) {
    return json({ error: `服务器错误: ${e.message}` }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return json({ error: "未登录" }, 401);
  }
  const id = params.id;
  await deleteConv(env, user.username, id);
  return json({ ok: true });
}
