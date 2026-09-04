"use client";

let screenShareStream: MediaStream | null = null;

export function getScreenShareStream() {
  return screenShareStream;
}

export function setScreenShareStream(stream: MediaStream) {
  screenShareStream = stream;
}

export function clearScreenShareStream(stream?: MediaStream) {
  if (!stream || screenShareStream === stream) {
    screenShareStream = null;
  }
}
