import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ROOM_ID = "global";

export async function GET() {
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id,name,active_lock_author_id,lock_expires_at,current_turn,updated_at")
    .eq("id", ROOM_ID)
    .single();

  const { data: words } = await supabaseAdmin
    .from("words")
    .select("turn_number,word,nickname,created_at")
    .eq("room_id", ROOM_ID)
    .order("turn_number", { ascending: true });

  return NextResponse.json({
    room,
    words: words || [],
  });
}