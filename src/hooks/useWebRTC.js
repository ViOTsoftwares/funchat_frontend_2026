import { useRef, useState, useCallback } from "react";
import { ICE_CONFIG } from "../lib/constants";

export function useWebRTC(socketRef) {
  const pcRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  // Keep a ref mirror of the stream and state so async callbacks always see fresh values
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // -----------------------------------------------------------------
  // ensureLocalStream
  //   Acquires the camera/mic once and caches it. Returns the stream.
  //   Uses ideal constraints for mobile with fallback.
  // -----------------------------------------------------------------
  const ensureLocalStream = useCallback(async (videoRef) => {
    if (localStreamRef.current) {
      if (videoRef?.current) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
        videoRef.current.srcObject = localStreamRef.current;
        videoRef.current.play?.().catch(() => {});
      }
      return localStreamRef.current;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
    } catch (err) {
      console.warn("[WebRTC] Constrained getUserMedia failed, falling back to simple constraints:", err);
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }

    // Synchronize acquired track state with current mute preferences
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMutedRef.current;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !isVideoOffRef.current;
    });

    localStreamRef.current = stream;
    setLocalStream(stream);

    if (videoRef?.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
    return stream;
  }, []);

  // -----------------------------------------------------------------
  // ICE candidate queue processing
  // -----------------------------------------------------------------
  const processIceQueue = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) return;
    if (iceCandidatesQueueRef.current.length > 0) {
      console.log(`[WebRTC] Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("[WebRTC] Error adding queued ICE candidate:", err);
        }
      }
    }
  }, []);

  const addOrQueueIceCandidate = useCallback(async (candidate) => {
    if (!candidate) return;
    const pc = pcRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[WebRTC] Error adding ICE candidate:", err);
      }
    } else {
      console.log("[WebRTC] Queuing ICE candidate until remote description is set");
      iceCandidatesQueueRef.current.push(candidate);
    }
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
      console.log("[WebRTC] ontrack received track:", event.track.kind);
      let stream = event.streams?.[0];
      if (!stream) {
        if (remoteStreamRef.current) {
          remoteStreamRef.current.addTrack(event.track);
          stream = remoteStreamRef.current;
        } else {
          stream = new MediaStream([event.track]);
        }
      }

      remoteStreamRef.current = stream;
      // Always instantiate a new MediaStream reference so React state update detects a change
      // and triggers VideoPage useEffect to re-bind video elements when video track arrives
      const freshStream = new MediaStream(stream.getTracks());
      setRemoteStream(freshStream);

      if (remoteVideoRef?.current) {
        remoteVideoRef.current.srcObject = freshStream;
        remoteVideoRef.current.play?.().catch((err) => {
          console.warn("[WebRTC] remoteVideoRef play error ontrack:", err);
        });
      }
    };

    // Ensure we have local tracks before creating the offer/answer
    const stream = await ensureLocalStream(localVideoRef);
    stream.getTracks().forEach((track) => {
      if (track.kind === "audio") {
        track.enabled = !isMutedRef.current;
      } else if (track.kind === "video") {
        track.enabled = !isVideoOffRef.current;
      }
      pc.addTrack(track, stream);
    });

    return pc;
  }, [ensureLocalStream, socketRef]);

  // -----------------------------------------------------------------
  // handleOffer & handleAnswer signaling handlers with queue flushing
  // -----------------------------------------------------------------
  const handleOffer = useCallback(async (sdp, localVideoRef, remoteVideoRef) => {
    await ensureLocalStream(localVideoRef);
    const pc = await ensurePeerConnection(localVideoRef, remoteVideoRef);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await processIceQueue();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }, [ensureLocalStream, ensurePeerConnection, processIceQueue]);

  const handleAnswer = useCallback(async (sdp) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await processIceQueue();
  }, [processIceQueue]);

  // -----------------------------------------------------------------
  // cleanupPeer — closes the peer connection, clears remote stream
  // -----------------------------------------------------------------
  const cleanupPeer = useCallback((remoteVideoRef) => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidatesQueueRef.current = [];
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
    isMutedRef.current = false;
    isVideoOffRef.current = false;
    setIsMuted(false);
    setIsVideoOff(false);
    cleanupPeer(remoteVideoRef);
  }, [cleanupPeer]);

  // -----------------------------------------------------------------
  // toggleMute / toggleVideo
  // -----------------------------------------------------------------
  const toggleMute = useCallback(() => {
    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);

    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = !nextMuted;
        }
      });
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const nextVideoOff = !isVideoOffRef.current;
    isVideoOffRef.current = nextVideoOff;
    setIsVideoOff(nextVideoOff);

    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.track.enabled = !nextVideoOff;
        }
      });
    }
  }, []);

  return {
    pcRef,
    localStream,
    remoteStream,
    ensureLocalStream,
    ensurePeerConnection,
    handleOffer,
    handleAnswer,
    addOrQueueIceCandidate,
    cleanupPeer,
    stopLocalVideo,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
  };
}
