import { supabaseAdmin } from "@/lib/supabaseAdmin";

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default async function ArchiveViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archiveId = Number(id);

  if (!Number.isFinite(archiveId)) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        Invalid archive id.
      </main>
    );
  }

  const { data: a, error } = await supabaseAdmin
    .from("archives")
    .select("id,title,content,created_at")
    .eq("id", archiveId)
    .single();

  if (error || !a) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        Could not load archive.
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24, lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 36, marginBottom: 6 }}>{a.title}</h1>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
        {formatDate(a.created_at)}
      </div>

      <section style={{ padding: 18, border: "1px solid #eee", borderRadius: 14 }}>
        <div style={{ fontSize: 18, whiteSpace: "pre-wrap" }}>{a.content}</div>
      </section>

      <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
        <a href="/archives" style={{ textDecoration: "none" }}>← Archives</a>
        <a href="/" style={{ textDecoration: "none" }}>Back to the loom</a>
      </div>
    </main>
  );
}