import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { cookies } from 'next/headers';

export const runtime = 'edge';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const CLUSTERS = [
  'general_company_info',
  'product_sheets',
  'pricing_sales',
  'documentation',
  'marketing_materials',
  'case_studies',
  'technical_specs',
  'training_materials',
  'no_cluster',
];

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const textExcerpt = formData.get('excerpt') as string;

    if (!textExcerpt || textExcerpt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text excerpt provided'
      }, { status: 400 });
    }

    const prompt = `Analyze this document excerpt and suggest categorization.

Document excerpt:
---
${textExcerpt.substring(0, 2000)}
---

Available clusters:
- general_company_info: General information about the company
- product_sheets: Product specifications and features
- pricing_sales: Pricing information and sales materials
- documentation: User guides and technical documentation
- marketing_materials: Marketing content and promotional materials
- case_studies: Customer case studies and success stories
- technical_specs: Detailed technical specifications
- training_materials: Training guides and educational content
- no_cluster: Uncategorized or miscellaneous documents

Return ONLY valid JSON with this structure (no markdown, no code blocks):
{
  "description": "One sentence description of what this document is about",
  "suggested_cluster": "one of the cluster values from the list above"
}`;

    const result = await generateText({
      model: openai('gpt-5-mini'),
      prompt: prompt,
    });

    // Parse the response
    let parsed;
    try {
      const cleaned = result.text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Cannot connect to helper agent. But can proceed.'
      });
    }

    // Validate the cluster
    if (!CLUSTERS.includes(parsed.suggested_cluster)) {
      parsed.suggested_cluster = 'no_cluster';
    }

    return NextResponse.json({
      success: true,
      description: parsed.description || '',
      suggested_cluster: parsed.suggested_cluster || 'no_cluster',
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Cannot connect to helper agent. But can proceed.'
    });
  }
}
