/**
 * AuthBackgroundVideo — the single, persistent looping video background for
 * the entire (auth) stack. Rendered once at the layout level (outside the
 * Stack navigator) so navigating welcome → login → otp → register never
 * remounts/restarts the video — screens fade in on top of it instead of
 * sliding a whole new video-playing screen in from the side.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

const BG_VIDEO = require("../../../assets/backgorund_white.mp4");

export default function AuthBackgroundVideo() {
  const player = useVideoPlayer(BG_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}
