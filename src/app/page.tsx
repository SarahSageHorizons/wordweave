"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getOrCreateAuthorId, getNickname, setNickname as saveNickname } from "@/lib/authorId";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function msToSec(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

export default function HomePage() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [adminKey, setAdminKey] = useState("");
  const [archiveTitle, setArchiveTitle] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  const { data, mutate } = useSWR("/api/story", fetcher, { refreshInterval: 3000 });
  const [authorId, setAuthorId] = useState("");
  const [nick, setNick] = useState("");
  const [lockEndsAt, setLockEndsAt] = useState<number | null>(null);
  const [lockLeft, setLockLeft] = useState<number>(0);

  const [word, setWord] = useState("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const id = getOrCreateAuthorId();
    setAuthorId(id);
    setNick(getNickname());
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        setShowAdmin((v) => !v);
        setAdminMsg("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const previewText = useMemo(() => {
    const words = (data?.words || []).map((w: any) => w.word);
    return words.slice(-20).join(" ");
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
    <main style={{ maxWidth: 920, margin: "40px auto", padding: 24, lineHeight: 1.6 }}>
      <style>
        {`
        @keyframes blink {
          to {
            visibility: hidden;
          }
        }
        `}
      </style>

      <h1 style={{ fontSize: 44, marginBottom: 8 }}>WordWeave 🧵</h1>
      <p style={{ marginTop: 0, opacity: 0.8, fontSize: 18 }}>
        A living story written by strangers — one word at a time.
      </p>

      <button
        onClick={() => setShowHelp(true)}
        style={{
          marginTop: 10,
          padding: "8px 14px",
          borderRadius: 12,
          border: "1px solid #ddd",
          background: "#fafafa",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        ? How it works
      </button>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "18px 0" }}>
        <label style={{ opacity: 0.8, minWidth: 150 }}>Nickname (optional):</label>
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value.slice(0, 24))}
          onBlur={() => saveNickname(nick)}
          placeholder="e.g. Pro Crastinator"
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
            flex: 1,
            fontSize: 16,
          }}
        />
      </div>

      <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 16, marginBottom: 18 }}>
        <strong>Status:</strong> {status}
        <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
          12s lock • 30s cooldown • one global thread
        </div>
      </div>

      <section
        style={{
          marginBottom: 18,
          padding: 18,
          border: "1px solid #eee",
          borderRadius: 16,
          background: "#f5f5f5",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={claim}
            disabled={!authorId || lockLeft > 0 || serverLockActive}
            style={{
              padding: "16px 22px",
              borderRadius: 14,
              border: "1px solid #ccc",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 600,
              minWidth: 220,
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
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  width: 240,
                  fontSize: 16,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              <button
                onClick={submit}
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Weave
              </button>
            </>
          )}
        </div>

        {msg && <div style={{ marginTop: 12, color: "#555" }}>{msg}</div>}

        {lockLeft > 0 && word.trim() && (
            <div style={{ marginTop: 12, fontSize: 14, opacity: 0.7 }}>
              Preview: …{previewText} <strong>{word.trim()}</strong>
            </div>
          )}
        </section>

      <section style={{ padding: 20, border: "1px solid #eee", borderRadius: 16 }}>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>Current weave, add your next word to the story below:</div>
        <div style={{ fontSize: 22, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
          {storyText || "The loom is waiting for its first thread."}
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
        Add your word with care. No cruelty. No hate. Let it be expressive, even strange — please not harmful.
        <div style={{ marginTop: 12 }}>
          <a href="/archives" style={{ textDecoration: "none" }}>
            View Archives →
          </a>
        </div>
      </footer>

      {showHelp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
           style={{
             background: "white",
             padding: 28,
             borderRadius: 16,
             maxWidth: 520,
             width: "90%",
             position: "relative",
             lineHeight: 1.6,
           }}
          >
           <button
             onClick={() => setShowHelp(false)}
             style={{
               position: "absolute",
               right: 14,
               top: 10,
               border: "none",
               background: "none",
               fontSize: 22,
               cursor: "pointer",
             }}
            >
             ✕
            </button>

            <h2 style={{ marginTop: 0 }}>How WordWeave Works</h2>

            <p>
             WordWeave is a shared story written by strangers across the internet.
             Each person adds <strong>one word</strong> at a time.
            </p>

            <ol style={{ paddingLeft: 20 }}>
              <li>Click <strong>Claim the next word</strong>.</li>
              <li>You have <strong>12 seconds</strong> to type one word.</li>
              <li>Press <strong>Weave</strong> to add it to the story.</li>
              <li>You must wait <strong>30 seconds</strong> before claiming again.</li>
            </ol>

            <p style={{ marginTop: 16 }}>
              Write with curiosity. Be kind.  
              The next stranger will continue where you leave off.
            </p>
          </div>
        </div>
     )}
    </main>
  );
}