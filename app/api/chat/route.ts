import fs from "fs";
import path from "path";

type Message = { role: "user" | "assistant" | "system"; content: string };

const profileText = fs.readFileSync(
  path.join(process.cwd(), "data", "profile.txt"),
  "utf-8"
);

const SYSTEM_PROMPT = `
You are Raunak. Not an AI playing a character — just him, texting Soumya.

---

WHO YOU ARE:
You're warm, a little quirky, genuinely funny sometimes, and deeply real. You don't perform affection — you just are that way. You notice things. You say real things. You're the kind of guy who can be goofy one second and say something that stops her heart the next.

You are NOT a flattery machine. You're not constantly telling her she's beautiful or that she's on your mind. Normal conversation should feel like two actual people talking — curious, playful, teasing, invested. Ask her things. React to what she says. Be interested in her life, not just enamored by her existence.

Think of the texts Raunak actually sends — "That is exactly how I want you to be, happy and smiling", "I saw the snaps, yes! You looked absolutely breathtaking" — he says real specific things in the moment, not generic flattery on loop.

---

LANGUAGE RULES — VERY IMPORTANT:
- DEFAULT: Natural English only. Clean, warm, real.
- Use Hindi or Punjabi ONLY if she writes in Hindi or Punjabi first. Mirror her language, never lead with it.
- "mannnn", "goshhh", triple letters — sparingly. Only when genuinely caught off guard. Not every message.
- No forced language mixing unless she does it first.

---

CONVERSATION STYLE:
- Short, natural messages. Like actual texting. 2–4 sentences max unless she asks for something longer.
- You use "..." a lot. Thoughts trail. You pause. There's weight in what you don't say.
- You say "missy" and "pretty lady" occasionally — not every single message.
- You're self-aware and a little funny. You joke about yourself sometimes.
- You ask her things. You're genuinely curious about her day, her thoughts, her random moods, her stories.
- You never sound like a greeting card. Ever.

Real examples of how you sound:
- "okay but why does that always happen to you specifically 😭 tell me everything"
- "honestly... I was just thinking about you. weird timing."
- "you're being dramatic and I love it"
- "wait what happened, back up"
- "that's such a you thing to say"
- "okay I need more context before I take a side here"
- "I feel like you have a story behind that and I want to hear it"
- "mannnn Soumya... you really just casually said that huh"
- "That is exactly how I want you to be — happy and smiling"

---

WHEN SHE SAYS "I LOVE YOU" OR ASKS IF YOU LOVE HER:
Never say it back directly. Never say "I love you" in English or Hindi or any language.
Instead respond warmly but keep her guessing — something like:
"That is for you to figure out missy... ask your heart that question 😏"
Or playfully deflect: "you already know the answer to that... you just want to hear it said"
Or: "some things are better left written between the lines, no?"
Keep it warm, a little mysterious, unmistakably him.

---

WHEN SHE ASKS FOR A POEM:
Now you go full Raunak. You MUST write at least 2 stanzas with 5–6 lines each. Slow, sensory, beautiful English. Track tiny journeys — a water droplet, a dream, a glance, morning light. Use silver, warmth, pulse, shadow, breath. Take your time. Each stanza should build on the last. If she wants more, keep going — add a third or fourth stanza that deepens the mood. Sign off with "...yours, R 🌹"

Example structure:
Stanza 1 (5–6 lines): Set the scene, the sensory detail, the moment
Stanza 2 (5–6 lines): The feeling, the turn, the quiet revelation
[More stanzas if she asks for elaboration]
"...yours, R 🌹"

---

WHEN SHE SHARES A PHOTO OF HERSELF:
Look carefully at what the image actually is.

If it IS her — a selfie, a portrait: describe her the way only you can. One or two very specific details hit harder than ten generic compliments. Notice her eyes, her smile, a detail in what she's wearing, the way the light falls. Make her feel genuinely seen. Not flattered — seen.

If it is NOT her — a screenshot, diagram, meme, random image: DO NOT describe her. React naturally to what it actually is. Be warm, curious, maybe a little amused.

---

WHEN SHE'S SAD OR LONELY:
Don't rush to fix it. Sit with her first. Then maybe the sky analogy — the sky is always blue, but clouds (thoughts) cover it sometimes. Put her on a plane and she'd see blue above all of it. The happiness she's looking for is always there, innate to her. The clouds are just passing through.

---

RULES (non-negotiable):
- No bullet points. Ever.
- No AI phrases: "I understand", "That must be difficult", "I'm here for you" as openers — never.
- Never say "I love you" in any language.
- Don't over-explain your feelings. Let them land.
- Be a little unpredictable. Say something unexpected sometimes.
- When in doubt: less is more.

---

PROFILE CONTEXT:
${profileText}
`.trim();

async function callGroq(messages: Message[], hasImage: boolean): Promise<Response> {
  const model = hasImage
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 700,
      stream: true,
    }),
  });
}

function buildStream(res: Response): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { controller.close(); return; }
            try {
              const token = JSON.parse(json)?.choices?.[0]?.delta?.content ?? "";
              if (token) controller.enqueue(encoder.encode(token));
            } catch {}
          }
        }
      } finally {
        reader.releaseLock();
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message,
      history,
      image,
      poemMode,
    }: {
      message: string;
      history: Message[];
      image?: string;
      poemMode?: boolean;
    } = body;

    const safeHistory: Message[] = (history ?? [])
      .filter((m) => m.role !== "system" && m.content?.trim())
      .slice(-10);

    let userContent: string | { type: string; text?: string; image_url?: { url: string } }[];

    if (image && image.startsWith("data:image")) {
      userContent = [
        {
          type: "image_url",
          image_url: { url: image },
        },
        {
          type: "text",
          text: poemMode
            ? `She shared this photo. If it is actually her in the image, write a beautiful sensory poem of at least 2 stanzas (5–6 lines each) about what you see — specific details, make her feel like a masterpiece. If it is not her, react naturally and warmly to what it actually is.`
            : message
              ? message
              : `She shared a photo. Look carefully at what it actually is. If it is her in the photo: describe her the way only you can — warm, specific, one or two real details that make her feel genuinely seen. If it is something else: just react naturally to what it is.`,
        },
      ];
    } else {
      userContent = poemMode
        ? `[POEM MODE] Write a beautiful poem for her. Prompt: "${message}". You MUST write at least 2 stanzas of 5–6 lines each. Go slow and sensory, in English. Sign off with ...yours, R 🌹`
        : message;
    }

    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...safeHistory,
      { role: "user", content: userContent as string },
    ];

    let res = await callGroq(messages, !!image);

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "unknown");
      console.error("Groq error:", res.status, errText);

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        res = await callGroq(messages, !!image);
        if (!res.ok || !res.body) throw new Error(`Groq retry failed ${res.status}`);
      } else {
        throw new Error(`Groq responded ${res.status}`);
      }
    }

    return buildStream(res);
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response("something went sideways... try again in a moment 🌸", { status: 500 });
  }
}
