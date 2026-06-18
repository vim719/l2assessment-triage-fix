const actionTemplates = {
  "Billing Issue": "Check billing portal and verify payment status — escalate to billing team if needed.",
  "Technical Problem": "Gather error details and reproduction steps — route to engineering if persistent.",
  "General Inquiry": "Respond with relevant FAQ or product documentation link.",
  "Feature Request": "Log in the product feedback tracker and acknowledge the suggestion.",
  "Unknown": "Flag for manual review — no category matched."
};

export function getRecommendedAction(category, urgency) {
  const base = actionTemplates[category] || actionTemplates["Unknown"];
  if (urgency === "High" || urgency === "Urgent") {
    return `[PRIORITY] ${base} — Respond within 1 hour.`;
  }
  return base;
}

export function getAvailableCategories() {
  return Object.keys(actionTemplates);
}

export function shouldEscalate(category, urgency, message) {
  return urgency === "High" || urgency === "Urgent" || message.length > 100;
}
