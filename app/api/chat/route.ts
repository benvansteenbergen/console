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
            version?: string;
        };

        // 🟡 1️⃣  Fetch current document text
        const host = req.headers.get('host') ?? '';

        const docRes = await fetch(
            `https://${host}/api/editor/file?fileId=${fileId}`,
            { cache: "no-store" }
        );

        if (!docRes.ok) {
            console.warn("⚠️ Failed to load document content:", docRes.status);
        }

        const docData = (await docRes.json()) as { content?: string };
        const documentText = docData?.content ?? "";

        // 🟡 2️⃣  Build system prompt with doc context
        const systemPrompt = `
You are a helpful text-editing assistant.
You help improve or rewrite parts of a document when asked.
Always base your suggestions on the document text below.

Document text:
"""
${documentText}
"""

If the user asks for a rewrite or improvement, respond with a direct, clear rewrite — not with meta comments or questions.
    `;

        // 🟡 3️⃣  Combine messages
        const fullMessages: CoreMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        // 🟡 4️⃣  Stream response from OpenAI
        const result = await streamText({
            model: openai("gpt-4o-mini"),
            messages: fullMessages,
            temperature: 0.6,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response("Failed to connect to OpenAI API", { status: 500 });
    }
}