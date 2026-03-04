export function getOrCreateAuthorId() {
  if (typeof window === "undefined") return "server";
  const key = "wordweave_author_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export function getNickname() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("wordweave_nickname") || "";
}

export function setNickname(nick: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("wordweave_nickname", nick.trim().slice(0, 24));
}