import { useRef, useState } from "react";
import { ICE_CONFIG } from "../lib/constants";

export function useWebRTC(socketRef) {
  const pcRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  async function ensureLocalStream(videoRef) {
    if (localStream) return localStream;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    if (videoRef?.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
    return stream;
  }

  async function ensurePeerConnection(localVideoRef, remoteVideoRef) {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      let [stream] = event.streams;
      if (!stream) {
        stream = new MediaStream();
        stream.addTrack(event.track);
      }
      setRemoteStream(stream);
      if (remoteVideoRef?.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };

    const stream = await ensureLocalStream(localVideoRef);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    return pc;
  }

  function cleanupPeer(remoteVideoRef) {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    if (remoteVideoRef?.current) remoteVideoRef.current.srcObject = null;
  }

  function stopLocalVideo(localVideoRef, remoteVideoRef) {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      if (localVideoRef?.current) localVideoRef.current.srcObject = null;
    }
    cleanupPeer(remoteVideoRef);
  }

  return {
    pcRef,
    localStream,
    remoteStream,
    ensureLocalStream,
    ensurePeerConnection,
    cleanupPeer,
    stopLocalVideo
  };
}
