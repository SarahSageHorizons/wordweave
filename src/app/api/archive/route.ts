import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const adminKey = req.headers.get("x-admin-key") || "";
  if (!process.env.WORDWEAVE_ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "Server admin key not set" }, { status: 500 });
  }
  if (adminKey !== process.env.WORDWEAVE_ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let title = "";
  try {
    const body = await req.json();
    title = String(body?.title || "").trim();
  } catch {}

  if (!title) {
    title = `Weave Archive – ${new Date().toISOString().slice(0, 10)}`;
  }
  if (title.length > 120) title = title.slice(0, 120);

  const { data, error } = await supabaseAdmin.rpc("archive_global_weave", {
    p_title: title,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, archiveId: data });
}