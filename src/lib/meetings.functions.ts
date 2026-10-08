import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function liveKitConfig() {
  const url = process.env["LIVEKIT_URL"];
  const apiKey = process.env["LIVEKIT_API_KEY"];
  const apiSecret = process.env["LIVEKIT_API_SECRET"];
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret, httpUrl: url.replace(/^wss:/, "https:").replace(/^ws:/, "http:") };
}

/** Issues a LiveKit token whose publish rights come only from the database role. */
export const getMeetingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ meetingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const cfg = liveKitConfig();
    if (!cfg) return { ok: false as const, reason: "not_configured" as const };

    const { data: meeting, error } = await context.supabase
      .from("meetings")
      .select("id, status, room_name")
      .eq("id", data.meetingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!meeting) throw new Error("Meeting not found");
    if (meeting.status !== "live") return { ok: false as const, reason: "not_live" as const };

    const { data: me } = await context.supabase
      .from("meeting_participants")
      .select("role, is_muted, is_removed, display_name")
      .eq("meeting_id", data.meetingId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!me || me.is_removed) throw new Error("Not authorized: you are not in this meeting");

    const canPublish = ["creator", "admin", "speaker"].includes(me.role) && !me.is_muted;
    const { AccessToken } = await import("livekit-server-sdk");
    const token = new AccessToken(cfg.apiKey, cfg.apiSecret, {
      identity: context.userId,
      name: me.display_name || "Member",
      ttl: "2h",
      metadata: JSON.stringify({ role: me.role }),
    });
    token.addGrant({
      room: meeting.room_name,
      roomJoin: true,
      canSubscribe: true,
      canPublish,
      canPublishData: true,
    });
    return { ok: true as const, token: await token.toJwt(), serverUrl: cfg.url, canPublish };
  });

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), meetingId: z.string().uuid() }),
  z.object({ action: z.literal("end"), meetingId: z.string().uuid() }),
  z.object({ action: z.literal("respond"), meetingId: z.string().uuid(), requestId: z.string().uuid(), accept: z.boolean() }),
  z.object({
    action: z.enum(["mute", "unmute", "to_viewer", "remove"]),
    meetingId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
  z.object({ action: z.literal("set_admin"), meetingId: z.string().uuid(), userId: z.string().uuid(), isAdmin: z.boolean() }),
]);

/** Runs a moderation action in the database (which enforces permissions), then mirrors it to the live room. */
export const meetingAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => actionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    let affectedUser: string | null = null;

    if (data.action === "start") {
      const { error } = await sb.rpc("start_meeting", { _meeting_id: data.meetingId });
      if (error) throw new Error(error.message);
    } else if (data.action === "end") {
      const { error } = await sb.rpc("end_meeting", { _meeting_id: data.meetingId });
      if (error) throw new Error(error.message);
    } else if (data.action === "respond") {
      const { data: req } = await sb.from("meeting_speak_requests").select("user_id").eq("id", data.requestId).maybeSingle();
      const { error } = await sb.rpc("respond_speak_request", { _request_id: data.requestId, _accept: data.accept });
      if (error) throw new Error(error.message);
      if (data.accept) affectedUser = req?.user_id ?? null;
    } else if (data.action === "set_admin") {
      const { error } = await sb.rpc("set_meeting_admin", {
        _meeting_id: data.meetingId,
        _user_id: data.userId,
        _is_admin: data.isAdmin,
      });
      if (error) throw new Error(error.message);
      affectedUser = data.userId;
    } else {
      const { error } = await sb.rpc("moderate_participant", {
        _meeting_id: data.meetingId,
        _user_id: data.userId,
        _action: data.action,
      });
      if (error) throw new Error(error.message);
      affectedUser = data.userId;
    }

    // Best effort: mirror the new rights into the live room immediately.
    const cfg = liveKitConfig();
    if (!cfg) return { ok: true };
    try {
      const { data: meeting } = await sb.from("meetings").select("room_name, status").eq("id", data.meetingId).single();
      if (!meeting) return { ok: true };
      const { RoomServiceClient } = await import("livekit-server-sdk");
      const rooms = new RoomServiceClient(cfg.httpUrl, cfg.apiKey, cfg.apiSecret);
      if (data.action === "end") {
        await rooms.deleteRoom(meeting.room_name).catch(() => undefined);
      } else if (affectedUser) {
        const { data: p } = await sb
          .from("meeting_participants")
          .select("role, is_muted, is_removed")
          .eq("meeting_id", data.meetingId)
          .eq("user_id", affectedUser)
          .maybeSingle();
        if (p?.is_removed) {
          await rooms.removeParticipant(meeting.room_name, affectedUser);
        } else if (p) {
          await rooms.updateParticipant(meeting.room_name, affectedUser, {
            permission: {
              canSubscribe: true,
              canPublishData: true,
              canPublish: ["creator", "admin", "speaker"].includes(p.role) && !p.is_muted,
            },
          });
        }
      }
    } catch (err) {
      console.warn("LiveKit sync skipped", err);
    }
    return { ok: true };
  });
