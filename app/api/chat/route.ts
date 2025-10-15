import { NextRequest } from "next/server";
import { streamText, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "edge";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, fileId } = (await req.json()) as {
      messages: CoreMessage[];
      fileId?: string;
    };

    // 🟡 1️⃣  Fetch current document text
    const host = req.headers.get("host") ?? "";

    const docRes = await fetch(`https://${host}/api/drive/file?fileId=${fileId}`, {
      cache: "no-store",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        authorization: req.headers.get("authorization") ?? "",
      },
    });

    if (!docRes.ok) {
      console.warn("⚠️ Failed to load document content:", docRes.status);
    }

    const docData = (await docRes.json()) as { content?: string };
    const documentText = docData?.content ?? "";

    // 🟡 2️⃣  Build system prompt with doc context
    const systemPrompt = `
You are a text-editing assistant.

When responding to the user:
- Always return structured JSON.
- "assistant_message" = short explanation of what was changed or a direct answer in natural language.
- "suggested_text" = the full rewritten version of the document (with all edits applied).

Example output:
{
  "assistant_message": "I simplified the introduction for better flow.",
  "suggested_text": "## **Introductie** WingSuite heeft zijn design een frisse update gekregen..."
}

Document text:
"""
${documentText}
"""
`;

    // 🟡 3️⃣  Combine messages
    const fullMessages: CoreMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // 🟡 4️⃣  Request response
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: fullMessages,
      temperature: 0.6,
    });

// 🟡 5️⃣  Parse JSON manually
    const text = await (await result.toTextStreamResponse()).text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        assistant_message: "Could not parse AI response as JSON.",
        suggested_text: text,
      };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Failed to connect to OpenAI API", { status: 500 });
  }
}