import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  TrackToggle,
  useTracks,
  GridLayout,
} from "@livekit/components-react";
import { Track } from "livekit-client";

function Stage({ canPublish }: { canPublish: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <div className="flex h-full flex-col">
      {tracks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-primary-foreground/70">
          Waiting for a speaker to turn on their camera…
        </div>
      ) : (
        <GridLayout tracks={tracks} className="flex-1">
          <ParticipantTile />
        </GridLayout>
      )}
      <RoomAudioRenderer />
      {canPublish ? (
        <div className="flex items-center justify-center gap-2 border-t border-primary-foreground/10 p-2">
          <TrackToggle source={Track.Source.Microphone}>Mic</TrackToggle>
          <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
        </div>
      ) : null}
    </div>
  );
}

export default function MeetingStage({
  token,
  serverUrl,
  canPublish,
  onDisconnected,
}: {
  token: string;
  serverUrl: string;
  canPublish: boolean;
  onDisconnected?: () => void;
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={canPublish}
      video={false}
      data-lk-theme="default"
      onDisconnected={() => onDisconnected?.()}
      className="surface-navy aspect-video w-full overflow-hidden rounded-2xl"
    >
      <Stage canPublish={canPublish} />
    </LiveKitRoom>
  );
}
