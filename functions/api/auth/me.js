import { json, handleOptions, getUserFromRequest } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  if (!env.CHAT_KV) {
    return json({ error: "服务器未绑定 CHAT_KV" }, 500);
  }
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return json({ error: "未登录或会话已过期" }, 401);
  }
  return json({ username: user.username });
}
