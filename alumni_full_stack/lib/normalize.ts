import { multiValueFields, suggestions, type ProfileField } from "./profile-fields";

/** Preserve spelling and acronyms while removing incidental spacing. */
export function normalizeText(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function answerKey(value: string) {
  return normalizeText(value).toLowerCase();
}

export function normalizeAnswer(field: string, value: string) {
  const cleaned = normalizeText(value);
  return suggestions[field as ProfileField]?.find(
    (choice) => answerKey(choice) === answerKey(cleaned),
  ) ?? cleaned;
}

export function uniqueAnswers(field: string, values: string[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const answer = normalizeAnswer(field, value);
    const key = answerKey(answer);
    if (key && !unique.has(key)) unique.set(key, answer);
  }
  return [...unique.values()];
}

export function normalizeField(field: string, value: string) {
  if (multiValueFields.includes(field))
    return uniqueAnswers(field, value.split(";")).join("; ");
  // Comments may contain intentional paragraphs, and JSON is normalized after validation.
  if (["additional_comments", "education_history"].includes(field)) return value.trim();
  if (field === "email") return normalizeText(value).toLowerCase();
  return normalizeAnswer(field, value);
}
