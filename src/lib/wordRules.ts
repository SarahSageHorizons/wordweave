export function normalizeWord(input: string) {
  const w = input.trim();

  if (!w || /\s/.test(w)) return null;
  if (w.length > 20) return null;

  // blocks pure punctuation like "!!!"
  if (/^[^a-zA-Z0-9]+$/.test(w)) return null;

  return w;
}

// tiny MVP starter list (expand later)
const banned = ["nigger", "faggot", "cunt"];

export function passesBasicFilter(word: string) {
  const lower = word.toLowerCase();
  return !banned.some((b) => lower.includes(b));
}