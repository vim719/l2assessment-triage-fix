import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const CATEGORIES = ["billing", "technical_support", "sales", "account_management", "spam", "positive_feedback", "feature_request"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export async function categorizeMessage(message) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a triage classifier. Return ONLY valid JSON with these fields:
{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "priority": one of ${JSON.stringify(PRIORITIES)},
  "sentiment": "positive" | "negative" | "neutral",
  "summary": "one sentence summary",
  "action_required": boolean
}
Rules:
- "urgent" priority = payment failures, security issues, service outages, cancelation threats
- "spam" = unrelated promotions, gibberish, bots
- "positive_feedback" = thanks, praise, no issues raised`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3,
    });

    const raw = response.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const category = mapCategory(parsed.category || "unknown");
    const priority = PRIORITIES.includes(parsed.priority) ? parsed.priority : "medium";
    const sentiment = parsed.sentiment || "neutral";
    const summary = parsed.summary || raw.slice(0, 120);
    const actionRequired = parsed.action_required !== false;

    const reasoning = `Priority: ${priority} | Sentiment: ${sentiment} | ${summary}`;

    return { category, reasoning, priority, sentiment, actionRequired };
  } catch (error) {
    console.warn('Groq API failed, using keyword fallback:', error.message);
    return fallbackCategorize(message);
  }
}

function mapCategory(cat) {
  const map = {
    billing: "Billing Issue",
    technical_support: "Technical Problem",
    sales: "General Inquiry",
    account_management: "General Inquiry",
    spam: "General Inquiry",
    positive_feedback: "General Inquiry",
    feature_request: "Feature Request"
  };
  return map[cat] || "General Inquiry";
}

function fallbackCategorize(message) {
  const lower = message.toLowerCase();

  if (lower.includes('bill') || lower.includes('payment') || lower.includes('charge') ||
      lower.includes('invoice') || lower.includes('refund') || lower.includes('subscription') ||
      (lower.includes('cancel') && lower.includes('account'))) {
    return { category: "Billing Issue", reasoning: "Keywords indicate billing concern.", priority: "high", sentiment: "negative", actionRequired: true };
  }
  if (lower.includes('bug') || lower.includes('error') || lower.includes('broken') ||
      lower.includes('not working') || lower.includes('crash') || lower.includes('down') ||
      lower.includes('server') || lower.includes('loading') || lower.includes('slow') ||
      (lower.includes('problem') && !lower.includes('no problem'))) {
    return { category: "Technical Problem", reasoning: "Keywords indicate technical issue.", priority: "high", sentiment: "negative", actionRequired: true };
  }
  if (lower.includes('feature') || lower.includes('suggestion') || lower.includes('wish') ||
      lower.includes('would like to see') || lower.includes('could you add') || lower.includes('improve') ||
      lower.includes('enhancement')) {
    return { category: "Feature Request", reasoning: "Keywords indicate feature request.", priority: "low", sentiment: "neutral", actionRequired: false };
  }
  if ((lower.includes('thank') || lower.includes('appreciate') || lower.includes('love') || lower.includes('great')) &&
      !lower.includes('but') && !lower.includes('however')) {
    return { category: "General Inquiry", reasoning: "Positive sentiment feedback.", priority: "low", sentiment: "positive", actionRequired: false };
  }
  return { category: "General Inquiry", reasoning: "Unclear intent, manual review suggested.", priority: "medium", sentiment: "neutral", actionRequired: true };
}
