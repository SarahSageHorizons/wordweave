const BANNED_WORDS = [
  // Add obvious slurs / hate terms / abusive words here.
  // Keep this list private in your codebase, not shown in UI.
  "fuckwit",
  "shit",
  "pussy",
  "dick",
  "twat",
  "bollocks",
  "fuck",
  "cunt",
  "nigger",
  "faggot",
  "retard",
  "kike",
  "spic",
  "chink",
];

function normalizeWord(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`.,!?;:()[\]{}<>_-]+|[\s"'`.,!?;:()[\]{}<>_-]+$/g, "");
}

export function validateWord(input: string): { ok: true; word: string } | { ok: false; error: string } {
  const cleaned = normalizeWord(input);

  if (!cleaned) {
    return { ok: false, error: "Please enter your word." };
  }

  // Reject anything with internal spaces after cleaning
  if (/\s/.test(cleaned)) {
    return { ok: false, error: "Slow down... One word at a time, please." };
  }

  // Reject obvious URLs / domains
  if (/https?:\/\//i.test(cleaned) || /www\./i.test(cleaned) || /\.[a-z]{2,}$/i.test(cleaned)) {
    return { ok: false, error: "No-no, links are not allowed here. Go advertise elsewhere." };
  }

  // Length guard
  if (cleaned.length > 24) {
    return { ok: false, error: "That word is way too long, joker." };
  }

  // Allow letters, numbers, apostrophes, and hyphens inside a word
  if (!/^[a-zA-Z0-9'-]+$/u.test(cleaned)) {
    return { ok: false, error: "Please use a simple single word." };
  }

  const lowered = cleaned.toLowerCase();

  if (BANNED_WORDS.some(b => lowered.includes(b))) {
    return { ok: false, error: "That word cannot be used here, naughty-naughty." };
  }

  return { ok: true, word: cleaned };
}