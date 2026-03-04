import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ROOM_ID = "global";
const LOCK_SECONDS = 12;

export async function POST(req: Request) {
  try {
    const { authorId, nickname } = await req.json();

    if (!authorId || typeof authorId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing authorId" }, { status: 400 });
    }

    const { data: room, error: roomErr } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", ROOM_ID)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ ok: false, error: "Room not found" }, { status: 500 });
    }

    const now = new Date();
    const lockExpiresAt = room.lock_expires_at ? new Date(room.lock_expires_at) : null;
    const lockActive = lockExpiresAt && lockExpiresAt.getTime() > now.getTime();

    if (lockActive && room.active_lock_author_id && room.active_lock_author_id !== authorId) {
      const msLeft = lockExpiresAt!.getTime() - now.getTime();
      return NextResponse.json({ ok: false, locked: true, msLeft });
    }

    const newExpiry = new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString();

    const { error: updErr } = await supabaseAdmin
      .from("rooms")
      .update({
        active_lock_author_id: authorId,
        lock_expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ROOM_ID);

    if (updErr) {
      return NextResponse.json({ ok: false, error: "Failed to set lock" }, { status: 500 });
    }

    // upsert author (nickname optional)
    await supabaseAdmin.from("authors").upsert({
      id: authorId,
      nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim().slice(0, 24) : null,
    });

    return NextResponse.json({ ok: true, lockSeconds: LOCK_SECONDS, lockExpiresAt: newExpiry });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}