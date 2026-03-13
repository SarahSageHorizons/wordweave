import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateWord } from "@/lib/wordRules";

const ROOM_ID = "global";
const COOLDOWN_SECONDS = 30;

export async function POST(req: Request) {
  try {
    const { authorId, word, nickname } = await req.json();

    if (!authorId || typeof authorId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing authorId" }, { status: 400 });
    }

    const checked = validateWord(String(word || ""));

    if (!checked.ok) {
      return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
    }

    const cleaned = checked.word;

    const { data: room, error: roomErr } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("id", ROOM_ID)
      .single();

    if (roomErr || !room) {
      console.error("Room fetch error:", roomErr);
      return NextResponse.json({ ok: false, error: "Room not found" }, { status: 500 });
    }

    const now = new Date();
    const lockExpiresAt = room.lock_expires_at ? new Date(room.lock_expires_at) : null;
    const lockActive = lockExpiresAt && lockExpiresAt.getTime() > now.getTime();

    if (!lockActive || room.active_lock_author_id !== authorId) {
      return NextResponse.json(
        { ok: false, error: "You don’t hold the thread right now." },
        { status: 403 }
      );
    }

    const { data: author } = await supabaseAdmin
      .from("authors")
      .select("last_post_at")
      .eq("id", authorId)
      .single();

    if (author?.last_post_at) {
      const last = new Date(author.last_post_at);
      const secondsSince = (now.getTime() - last.getTime()) / 1000;
      if (secondsSince < COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            ok: false,
            error: `Cooldown: wait ${Math.ceil(COOLDOWN_SECONDS - secondsSince)}s`,
            cooldown: true,
          },
          { status: 429 }
        );
      }
    }

    const nextTurn = Number(room.current_turn) + 1;

    const { error: insErr } = await supabaseAdmin.from("words").insert({
      room_id: ROOM_ID,
      turn_number: nextTurn,
      word: cleaned,
      author_id: authorId,
      nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim().slice(0, 24) : null,
    });

    if (insErr) {
      console.error("Insert error:", insErr);
      return NextResponse.json({ ok: false, error: "Failed to weave word." }, { status: 500 });
    }

    const { error: updErr } = await supabaseAdmin
      .from("rooms")
      .update({
        current_turn: nextTurn,
        active_lock_author_id: null,
        lock_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ROOM_ID);

    if (updErr) {
      console.error("Room update error:", updErr);
      return NextResponse.json({ ok: false, error: "Failed to update room." }, { status: 500 });
    }

    await supabaseAdmin.from("authors").upsert({
      id: authorId,
      nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim().slice(0, 24) : null,
      last_post_at: now.toISOString(),
    });

    return NextResponse.json({ ok: true, turn: nextTurn, word: cleaned });
  } catch (err) {
    console.error("Submit route unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}