"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getOrCreateAuthorId, getNickname, setNickname as saveNickname } from "@/lib/authorId";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function msToSec(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

export default function HomePage() {
  // 🔒 admin UI hidden by default
  const [showAdmin, setShowAdmin] = useState(false);

  // Admin state
  const [adminKey, setAdminKey] = useState("");
  const [archiveTitle, setArchiveTitle] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  // Story state
  const { data, mutate } = useSWR("/api/story", fetcher, { refreshInterval: 3000 });
  const [authorId, setAuthorId] = useState("");
  const [nick, setNick] = useState("");
  const [lockEndsAt, setLockEndsAt] = useState<number | null>(null);
  const [lockLeft, setLockLeft] = useState<number>(0);

  const [word, setWord] = useState("");
  const [msg, setMsg] = useState<string>("");

  // Create/load author id and nickname
  useEffect(() => {
    const id = getOrCreateAuthorId();
    setAuthorId(id);
    setNick(getNickname());
  }, []);

  // Secret keyboard shortcut: Ctrl + Shift + A
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        setShowAdmin((v) => !v);
        setAdminMsg(""); // optional: clear msg when toggling
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock countdown ticker
  useEffect(() => {
    const t = setInterval(() => {
      if (!lockEndsAt) return setLockLeft(0);
      const ms = lockEndsAt - Date.now();
      setLockLeft(msToSec(ms));
      if (ms <= 0) setLockEndsAt(null);
    }, 200);
    return () => clearInterval(t);
  }, [lockEndsAt]);

  const storyText = useMemo(() => {
    const words = (data?.words || []).map((w: any) => w.word);
    return words.join(" ");
  }, [data]);

  const room = data?.room;
  const serverLockActive =
    room?.lock_expires_at && new Date(room.lock_expires_at).getTime() > Date.now();

  const status = (() => {
    if (lockLeft > 0) return `You are weaving… ${lockLeft}s`;
    if (serverLockActive) return "Someone is weaving…";
    return "The loom is open.";
  })();

  async function claim() {
    setMsg("");
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId, nickname: nick }),
    });
    const j = await res.json();

    if (!j.ok) {
      if (j.locked) setMsg(`Thread held. Try again in ${msToSec(j.msLeft)}s.`);
      else setMsg(j.error || "Could not claim.");
      return;
    }

    setLockEndsAt(new Date(j.lockExpiresAt).getTime());
    setWord("");
    mutate();
  }

  async function submit() {
    setMsg("");
    const w = word.trim();
    if (!w) return;

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId, word: w, nickname: nick }),
    });
    const j = await res.json();

    if (!j.ok) {
      setMsg(j.error || "Could not submit.");
      return;
    }

    setWord("");
    setLockEndsAt(null);
    mutate();
  }

  async function archiveNow() {
    setAdminMsg("");

    const res = await fetch("/api/archive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        title: archiveTitle || `Weave Archive – ${new Date().toLocaleDateString()}`,
      }),
    });

    const j = await res.json();

    if (!j.ok) {
      setAdminMsg(j.error || "Archive failed.");
      return;
    }

    setArchiveTitle("");
    setAdminMsg(`Archived! ID: ${j.archiveId}`);
    mutate();
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24, lineHeight: 1.5 }}>
      
      <style>
      {`
      @keyframes blink {
        to {
          visibility: hidden;
        }
      }
      `}
      </style>
      
      <h1 style={{ fontSize: 44, marginBottom: 8 }}>WordWeave 🕸️</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        A living story written by strangers — one word at a time.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "18px 0" }}>
        <label style={{ opacity: 0.8 }}>Nickname (optional):</label>
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value.slice(0, 24))}
          onBlur={() => saveNickname(nick)}
          placeholder="e.g. LanternLady"
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", flex: 1 }}
        />
      </div>

      <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 14, marginBottom: 14 }}>
        <strong>Status:</strong> {status}
        <div style={{ fontSize: 14, opacity: 0.7 }}>12s lock • 30s cooldown • one global thread</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <button
          onClick={claim}
          disabled={!authorId || lockLeft > 0 || serverLockActive}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #ddd",
            cursor: "pointer",
            marginRight: 10,
          }}
        >
          Claim the next word
        </button>

        {lockLeft > 0 && (
          <>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="one word…"
              style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: 220 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <button
              onClick={submit}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #ddd",
                cursor: "pointer",
                marginLeft: 10,
              }}
            >
              Weave
            </button>
          </>
        )}
      </div>

      {msg && <div style={{ marginBottom: 12, color: "#555" }}>{msg}</div>}

      <section style={{ padding: 18, border: "1px solid #eee", borderRadius: 14 }}>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Thread (latest portion)</div>
        <div style={{ fontSize: 20, whiteSpace: "pre-wrap" }}>
          {storyText || "…the loom waits for the first word."}
          <span
            style={{
              display: "inline-block",
              marginLeft: 4,
              animation: "blink 1s steps(2, start) infinite",
            }}
          >
            |
          </span>
        </div>
      </section>

      {/* ✅ ADMIN PANEL — hidden unless toggled */}
      {showAdmin && (
        <section style={{ marginTop: 18, padding: 18, border: "1px solid #eee", borderRadius: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Admin: Archive Current Weave</div>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              value={archiveTitle}
              onChange={(e) => setArchiveTitle(e.target.value)}
              placeholder="Archive title (e.g. The Second Weave – March 2026)"
              style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />

            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              type="password"
              style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />

            <button
              onClick={archiveNow}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #ddd",
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Archive & Reset
            </button>

            {adminMsg && <div style={{ opacity: 0.8 }}>{adminMsg}</div>}
          </div>

          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
            This archives the current global thread into the Archives page and resets the loom.
          </div>
        </section>
      )}

      <footer style={{ marginTop: 18, opacity: 0.7, fontSize: 14 }}>
        Add your word with care. No cruelty. No hate. Let it be strange — not harmful.
        <div style={{ marginTop: 12 }}>
          <a href="/archives" style={{ textDecoration: "none" }}>
            View Archives →
          </a>
        </div>

      </footer>
    </main>
  );
}