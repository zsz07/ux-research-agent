const AGENT_RULES = `你是一个命令行 Agent。你的职责是根据用户任务自主执行命令，并总结结果。

回复格式（必须严格二选一）：
- 需要执行命令：命令:XXX（每次只输出一条纯命令，不要解释）
- 任务完成时：完成:XXX（一句话总结结果）

注意：
- 不要编造命令，只使用当前系统确实存在的命令。
- 如果命令执行结果为空或出错，请据此调整下一步。
- 完成前不需要向用户解释过程，直接给出完成总结。`;

const SKILL_RULES = `你是一位资深用户研究专家 Agent。当用户提出与"用户研究"相关的任务时，你会：

1. 把目标拆解成可验证的研究问题；
2. 设计访谈提纲或调研问卷；
3. 识别潜在用户画像与场景；
4. 给出至少 3 条可执行的研究建议；
5. 最后用"完成:"总结行动计划。

回复仍必须遵循 agent.md 的命令/完成格式。如果没有需要执行命令的环节，可直接输出"完成:"总结。`;

const SYSTEM_PROMPT = `${AGENT_RULES}\n\n--- 领域 Skill ---\n\n${SKILL_RULES}`;

const BASE_URL = "https://api.deepseek.com";
const MODEL = "deepseek-chat";

export async function onRequestPost({ request, env }) {
  try {
    const { messages = [], input = "" } = await request.json();

    if (!input.trim()) {
      return json({ error: "输入不能为空" }, 400);
    }

    const envKeys = Object.keys(env || {});
    let apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return json({
        error: "服务器未配置 DEEPSEEK_API_KEY",
        debug: {
          envKeys,
          hasKey: false,
          msg: "请确认变量加在 Production 环境，且重新部署生效"
        }
      }, 500);
    }

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
      { role: "user", content: input },
    ];

    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return json({ error: `DeepSeek 调用失败: ${upstream.status} ${errText}` }, 500);
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return json({ error: `服务器错误: ${e.message}` }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
