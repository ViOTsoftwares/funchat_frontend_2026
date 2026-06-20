import { useRef, useState, useCallback } from "react";
import { ICE_CONFIG } from "../lib/constants";

export function useWebRTC(socketRef) {
  const pcRef = useRef(null);
  // Keep a ref mirror of the stream so async callbacks always see fresh values
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // -----------------------------------------------------------------
  // ensureLocalStream
  //   Acquires the camera/mic once and caches it. Returns the stream.
  //   Also directly writes to the provided video element if given.
  // -----------------------------------------------------------------
  const ensureLocalStream = useCallback(async (videoRef) => {
    // Re-use existing stream if we already have one
    if (localStreamRef.current) {
      // Rebind to element in case we switched ref targets
      if (videoRef?.current) {
        videoRef.current.srcObject = localStreamRef.current;
        videoRef.current.play?.().catch(() => {});
      }
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);

    if (videoRef?.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
    return stream;
  }, []);

  // -----------------------------------------------------------------
  // ensurePeerConnection
  //   Creates the RTCPeerConnection once, adds local tracks, and sets
  //   up ontrack to write the remote stream into state + the video el.
  // -----------------------------------------------------------------
  const ensurePeerConnection = useCallback(async (localVideoRef, remoteVideoRef) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      let stream = event.streams?.[0];
      if (!stream) {
        // Build a MediaStream manually if no stream was attached
        if (remoteStreamRef.current) {
          remoteStreamRef.current.addTrack(event.track);
          stream = remoteStreamRef.current;
        } else {
          stream = new MediaStream([event.track]);
        }
      }

      remoteStreamRef.current = stream;
      setRemoteStream(stream);

      // Also write directly to the element for speed (the useEffect in
      // VideoPage will do the same, but this fires first)
      if (remoteVideoRef?.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };

    // Ensure we have local tracks before creating the offer/answer
    const stream = await ensureLocalStream(localVideoRef);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    return pc;
  }, [ensureLocalStream, socketRef]);

  // -----------------------------------------------------------------
  // cleanupPeer — closes the peer connection, clears remote stream
  // -----------------------------------------------------------------
  const cleanupPeer = useCallback((remoteVideoRef) => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);
    if (remoteVideoRef?.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // -----------------------------------------------------------------
  // stopLocalVideo — stops all tracks and tears down everything
  // -----------------------------------------------------------------
  const stopLocalVideo = useCallback((localVideoRef, remoteVideoRef) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      if (localVideoRef?.current) localVideoRef.current.srcObject = null;
    }
    setIsMuted(false);
    setIsVideoOff(false);
    cleanupPeer(remoteVideoRef);
  }, [cleanupPeer]);

  // -----------------------------------------------------------------
  // toggleMute / toggleVideo
  // -----------------------------------------------------------------
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  }, []);

  return {
    pcRef,
    localStream,
    remoteStream,
    ensureLocalStream,
    ensurePeerConnection,
    cleanupPeer,
    stopLocalVideo,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
  };
}
