/**
 * Content Format Questions Configuration
 *
 * This configuration defines the clarifying questions that the n8n AI agent
 * should ask for each content format. These questions help gather the necessary
 * information to generate high-quality, format-specific content.
 *
 * The agent will ask these questions in sequence, but users can skip them
 * or provide minimal answers if they prefer.
 */

interface FormatQuestion {
  id: string;
  question: string;
  required: boolean;
  placeholder?: string;
}

interface ContentFormatConfig {
  format: string;
  label: string;
  description: string;
  questions: FormatQuestion[];
}

export const CONTENT_FORMAT_QUESTIONS: { [key: string]: ContentFormatConfig } = {
  'blog-post': {
    format: 'blog-post',
    label: 'Blog Post',
    description: 'A structured blog article with introduction, body, and conclusion',
    questions: [
      {
        id: 'target_audience',
        question: 'Who is the target audience for this blog post?',
        required: false,
        placeholder: 'e.g., Marketing professionals, Small business owners, Tech enthusiasts'
      },
      {
        id: 'key_message',
        question: 'What is the main message or takeaway you want readers to have?',
        required: false,
        placeholder: 'e.g., How our product solves a specific problem'
      },
      {
        id: 'word_count',
        question: 'What is your preferred word count?',
        required: false,
        placeholder: 'e.g., 800-1000 words, 1500+ words'
      },
      {
        id: 'cta',
        question: 'What call-to-action should be included at the end?',
        required: false,
        placeholder: 'e.g., Sign up for a demo, Download whitepaper, Contact sales'
      }
    ]
  },

  'case-study': {
    format: 'case-study',
    label: 'Case Study',
    description: 'Customer success story with problem, solution, and results',
    questions: [
      {
        id: 'customer_name',
        question: 'What is the customer/company name? (Can be anonymized)',
        required: false,
        placeholder: 'e.g., Acme Corp, A leading e-commerce company'
      },
      {
        id: 'industry',
        question: 'What industry are they in?',
        required: false,
        placeholder: 'e.g., Healthcare, E-commerce, Manufacturing'
      },
      {
        id: 'challenge',
        question: 'What was the main challenge they faced?',
        required: false,
        placeholder: 'e.g., Low conversion rates, Manual processes, High costs'
      },
      {
        id: 'results',
        question: 'What measurable results were achieved?',
        required: false,
        placeholder: 'e.g., 30% increase in sales, 50% time savings, €100K cost reduction'
      }
    ]
  },

  'product-sheet': {
    format: 'product-sheet',
    label: 'Product Sheet',
    description: 'One-page product overview with features, benefits, and specifications',
    questions: [
      {
        id: 'product_name',
        question: 'What is the product name?',
        required: false,
        placeholder: 'e.g., Wingsuite Analytics Pro'
      },
      {
        id: 'key_features',
        question: 'What are the 3-5 key features to highlight?',
        required: false,
        placeholder: 'e.g., Real-time reporting, AI insights, Custom dashboards'
      },
      {
        id: 'target_market',
        question: 'Who is the target market?',
        required: false,
        placeholder: 'e.g., Enterprise companies, SMBs, Specific industry'
      },
      {
        id: 'differentiators',
        question: 'What sets this product apart from competitors?',
        required: false,
        placeholder: 'e.g., Easiest to use, Fastest implementation, Best ROI'
      }
    ]
  },

  'social-media': {
    format: 'social-media',
    label: 'Social Media Post',
    description: 'Engaging social media content optimized for platform algorithms',
    questions: [
      {
        id: 'platform',
        question: 'Which platform is this for?',
        required: false,
        placeholder: 'e.g., LinkedIn, Twitter/X, Facebook, Instagram'
      },
      {
        id: 'goal',
        question: 'What is the goal of this post?',
        required: false,
        placeholder: 'e.g., Drive traffic, Generate leads, Build awareness, Engage community'
      },
      {
        id: 'length',
        question: 'Preferred post length?',
        required: false,
        placeholder: 'e.g., Short (1-2 sentences), Medium (3-5 sentences), Long (6+ sentences)'
      },
      {
        id: 'hashtags',
        question: 'Should we include hashtags? If yes, how many?',
        required: false,
        placeholder: 'e.g., 3-5 relevant hashtags, No hashtags'
      }
    ]
  },

  'email-campaign': {
    format: 'email-campaign',
    label: 'Email Campaign',
    description: 'Marketing email with compelling subject line and clear CTA',
    questions: [
      {
        id: 'campaign_goal',
        question: 'What is the goal of this email campaign?',
        required: false,
        placeholder: 'e.g., Product launch, Event invitation, Newsletter, Nurture sequence'
      },
      {
        id: 'recipient_segment',
        question: 'Who are the recipients?',
        required: false,
        placeholder: 'e.g., Existing customers, Trial users, Newsletter subscribers'
      },
      {
        id: 'subject_line_style',
        question: 'What style for the subject line?',
        required: false,
        placeholder: 'e.g., Curiosity-driven, Value-focused, Urgent, Personalized'
      },
      {
        id: 'email_cta',
        question: 'What is the primary call-to-action?',
        required: false,
        placeholder: 'e.g., Register now, Download guide, Schedule demo, Shop now'
      }
    ]
  },

  'press-release': {
    format: 'press-release',
    label: 'Press Release',
    description: 'Formal announcement following press release conventions',
    questions: [
      {
        id: 'announcement',
        question: 'What is being announced?',
        required: false,
        placeholder: 'e.g., Product launch, Partnership, Funding, Award, Milestone'
      },
      {
        id: 'dateline',
        question: 'Where should the dateline be set?',
        required: false,
        placeholder: 'e.g., Amsterdam, Netherlands, New York, USA'
      },
      {
        id: 'quotes',
        question: 'Who should be quoted? (Name and title)',
        required: false,
        placeholder: 'e.g., John Smith, CEO; Jane Doe, Head of Product'
      },
      {
        id: 'contact_info',
        question: 'Media contact information to include?',
        required: false,
        placeholder: 'e.g., press@company.com, Media Relations Team'
      }
    ]
  }
};

/**
 * Helper function to get questions for a specific format
 */
export function getQuestionsForFormat(format: string): FormatQuestion[] {
  const config = CONTENT_FORMAT_QUESTIONS[format];
  return config ? config.questions : [];
}

/**
 * Helper function to get format configuration
 */
export function getFormatConfig(format: string): ContentFormatConfig | null {
  return CONTENT_FORMAT_QUESTIONS[format] || null;
}
