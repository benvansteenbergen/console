import { NextRequest } from "next/server";
import { streamText, type CoreMessage } from "ai";

export const runtime = "edge";

export async function POST(req: NextRequest) {
    try {
        const { messages, fileId, version } = (await req.json()) as {
            messages: CoreMessage[];
            fileId?: string;
            version?: string;
        };

        const systemPrompt = `
You are a helpful text-editing assistant.
You suggest improvements and edits, but never directly save documents.
Context: fileId=${fileId ?? "unknown"}, version=${version ?? "n/a"}.
    `;

        const fullMessages: CoreMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        // ✅ minimal, fully-typed streaming call
        const result = await streamText({
            model: "gpt-4o-mini",
            messages: fullMessages,
            temperature: 0.6,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response("Failed to connect to OpenAI API", { status: 500 });
    }
}