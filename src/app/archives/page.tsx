"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function ArchivesPage() {
  const { data, error, isLoading } = useSWR("/api/archives", fetcher);

  if (isLoading) return <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>Loading…</main>;
  if (error) return <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>Error loading archives.</main>;

  const archives = data?.archives || [];

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24, lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 40, marginBottom: 6 }}>Archives 📜</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Past weaves, preserved as they were.
      </p>

      <div style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
        {archives.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No archives yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {archives.map((a: any) => (
              <li key={a.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <a href={`/archives/${a.id}`} style={{ fontSize: 18, fontWeight: 600, textDecoration: "none" }}>
                  {a.title}
                </a>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                  {formatDate(a.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <a href="/" style={{ textDecoration: "none" }}>← Back to the loom</a>
      </div>
    </main>
  );
}