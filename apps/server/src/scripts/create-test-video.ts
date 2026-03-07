#!/usr/bin/env npx tsx
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";

console.log("Creating test video...");
try {
  execSync(`"${ffmpegInstaller.path}" -y -f lavfi -i testsrc=duration=2:size=512x512:rate=30 test_video.mp4`);
  console.log("Successfully created test_video.mp4");
} catch (e) {
  console.error("Error creating test video:", e);
}
