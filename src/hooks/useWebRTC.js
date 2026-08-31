import { useRef, useState, useCallback } from "react";
import { ICE_CONFIG } from "../lib/constants";
import { toastMessage } from "../lib/toast.message";

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

    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      console.warn("[WebRTC] Non-secure context (HTTP) detected on LAN IP. Camera access may be blocked by browser.");
      toastMessage("Mobile browser requires HTTPS or localhost for camera access. Please use an HTTPS tunnel or localhost.", "warning");
    }

    let stream;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("navigator.mediaDevices.getUserMedia is unavailable (HTTP non-secure context or unsupported browser)");
      }
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
      if (navigator?.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else {
        toastMessage("Camera access blocked or unsupported on this browser.", "error");
        throw err;
      }
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

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.warn("[WebRTC] ICE connection failed/disconnected. Attempting ICE restart...");
        if (typeof pc.restartIce === "function") {
          pc.restartIce();
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Peer Connection State:", pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack received track:", event.track.kind, "id:", event.track.id);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      const existingTrack = remoteStreamRef.current.getTracks().find((t) => t.id === event.track.id);
      if (!existingTrack) {
        remoteStreamRef.current.addTrack(event.track);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!remoteStreamRef.current.getTracks().some((t) => t.id === track.id)) {
            remoteStreamRef.current.addTrack(track);
          }
        });
      }

      const freshStream = new MediaStream(remoteStreamRef.current.getTracks());
      console.log("[WebRTC] Remote stream updated. Total tracks:", freshStream.getTracks().length);
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
