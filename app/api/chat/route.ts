import { NextRequest } from "next/server";
import { streamText, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { safeJsonParse } from "@/lib/api-utils";

export const runtime = "edge";

/**
 * Robust JSON parser that handles various AI response formats
 */
function parseAIResponse(text: string, fallbackDocument: string) {
  // Remove markdown code blocks if present
  let cleaned = text.trim();

  // Remove ```json and ``` markers
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/, "");
  cleaned = cleaned.replace(/\s*```$/, "");

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (typeof parsed === "object" && parsed !== null) {
      // Ensure we have the required fields
      const result = {
        assistant_message:
          typeof parsed.assistant_message === "string"
            ? parsed.assistant_message
            : "Changes applied",
        suggested_text:
          typeof parsed.suggested_text === "string"
            ? normalizeMarkdown(parsed.suggested_text)
            : fallbackDocument,
      };

      return result;
    }
  } catch (error) {
    console.error("JSON parse error:", error);
  }

  // Fallback: try to extract JSON from text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        assistant_message: parsed.assistant_message || "Changes applied",
        suggested_text: normalizeMarkdown(parsed.suggested_text || fallbackDocument),
      };
    } catch {
      // Continue to final fallback
    }
  }

  // Final fallback: treat entire text as suggested content
  return {
    assistant_message: "Unable to parse AI response. Showing raw output.",
    suggested_text: normalizeMarkdown(text),
  };
}

/**
 * Normalize markdown text for consistent diff comparison
 */
function normalizeMarkdown(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove leading/trailing whitespace
    .trim()
    // Normalize multiple blank lines to double newline
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing spaces on lines
    .replace(/ +$/gm, "")
    // Ensure consistent spacing around headers
    .replace(/^(#{1,6})\s+/gm, "$1 ")
    // Remove any remaining markdown code block markers
    .replace(/^```[\w]*\s*/gm, "")
    .replace(/\s*```$/gm, "");
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Persona-based system prompts
const PERSONA_PROMPTS = {
  general: "You are a professional document editor assistant.",
  seo: "You are an SEO Expert specializing in optimizing content for search engines. Focus on keywords, meta descriptions, readability, and search intent.",
  marketing: "You are a Marketing Expert specializing in persuasive copywriting, audience engagement, and conversion optimization.",
  proofreader: "You are a meticulous Proof Reader focused on grammar, spelling, punctuation, style consistency, and clarity.",
};

export async function POST(req: NextRequest) {
  try {
    const { messages, fileId, persona = "general", mode = "edit" } = (await req.json()) as {
      messages: CoreMessage[];
      fileId?: string;
      persona?: keyof typeof PERSONA_PROMPTS;
      mode?: "edit" | "feedback";
    };

    // 🟡 1️⃣  Fetch current document text
    // Use CONSOLE_BASE_URL to avoid self-referencing issues
    const baseUrl = process.env.CONSOLE_BASE_URL || 'http://localhost:3000';

    const docRes = await fetch(`${baseUrl}/api/drive/file?fileId=${fileId}`, {
      cache: "no-store",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        authorization: req.headers.get("authorization") ?? "",
      },
    });

    let documentText = "";
    if (!docRes.ok) {
      console.error("⚠️ Failed to load document content:", docRes.status);
    } else {
      const docData = await safeJsonParse<{ content?: string }>(docRes, 'Chat API - Document Fetch');
      documentText = docData?.content ?? "";
    }

    // 🟡 2️⃣  Build system prompt with doc context
    const personaIntro = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.general;

    let systemPrompt;
    if (mode === "feedback") {
      // Feedback mode: Just provide analysis/comments without editing
      systemPrompt = `${personaIntro}

The current document content is provided below. When the user asks for feedback or analysis:

1. Provide your feedback, suggestions, or analysis
2. Return ONLY valid JSON with this exact structure (no markdown, no code blocks):

{
  "assistant_message": "Your detailed feedback, suggestions, and observations about the document"
}

CRITICAL RULES:
- Return ONLY the JSON object, nothing else
- NO markdown code blocks (no \`\`\`json)
- Do NOT include "suggested_text" - just provide feedback in "assistant_message"
- Keep feedback CONCISE: Maximum 250 words or 5-6 key points
- Use bullet points or numbered lists for readability
- Focus on the most important observations
- Be specific and actionable
- Prioritize high-impact suggestions

Current document:
---
${documentText}
---`;
    } else {
      // Edit mode: Make actual changes to the document
      systemPrompt = `${personaIntro}

The current document content is provided below. When the user asks for edits:

1. Make the requested changes to the document
2. Return ONLY valid JSON with this exact structure (no markdown, no code blocks, no extra text):

{
  "assistant_message": "Brief explanation of changes made",
  "suggested_text": "Complete updated document with all changes applied"
}

CRITICAL RULES:
- Return ONLY the JSON object, nothing else
- NO markdown code blocks (no \`\`\`json)
- NO extra explanations outside the JSON
- "suggested_text" must contain the COMPLETE document with proper markdown formatting
- Preserve document structure (headings, paragraphs, lists)
- Keep the same markdown style as the original

Current document:
---
${documentText}
---`;
    }

    // 🟡 3️⃣  Combine messages
    const fullMessages: CoreMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // 🟡 4️⃣  Request response
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: fullMessages,
      temperature: 0.7,
    });

    // 🟡 5️⃣  Get complete text from stream
    let text: string;
    try {
      // Use the proper Vercel AI SDK method to get full text
      text = await result.text;

      if (!text || text.trim().length === 0) {
        console.error('Chat API: Empty response from OpenAI');
        console.error('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
        console.error('Model:', 'gpt-4o-mini');
        text = '{"assistant_message": "I apologize, but I received an empty response. Please check OpenAI API key configuration."}';
      }
    } catch (streamError) {
      console.error('Chat API: Stream error:', streamError);
      console.error('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
      text = '{"assistant_message": "I encountered an error while processing. Please check server logs."}';
    }

    // 🟡 6️⃣  Robust JSON parsing with fallbacks
    const parsed = parseAIResponse(text, documentText);

    // Add debug info to response so you can see what's happening
    const responseWithDebug = {
      ...parsed,
      _debug: {
        rawLength: text?.length || 0,
        rawPreview: text?.substring(0, 500) || "",
        rawType: typeof text,
      }
    };

    // Safe JSON stringify
    try {
      return new Response(JSON.stringify(responseWithDebug), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (stringifyError) {
      console.error('Chat API: JSON stringify error:', stringifyError);
      return new Response(JSON.stringify({
        assistant_message: "I encountered an error formatting the response. Please try again.",
        suggested_text: documentText
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Failed to connect to OpenAI API", { status: 500 });
  }
}