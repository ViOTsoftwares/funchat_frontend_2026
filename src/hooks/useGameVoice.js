import { useState, useEffect, useRef, useCallback } from "react";
import { ICE_CONFIG } from "../lib/constants.js";
import { toastMessage } from "../lib/toast.message.js";

export function useGameVoice(socketRef, roomId, players = [], socketId) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [remoteMutes, setRemoteMutes] = useState({}); // socketId -> boolean

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // targetSocketId -> RTCPeerConnection
  const remoteAudioElementsRef = useRef({}); // targetSocketId -> HTMLAudioElement
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Cleanup helper for all peer connections & streams
  const cleanupVoice = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((targetId) => {
      peerConnectionsRef.current[targetId]?.close();
    });
    peerConnectionsRef.current = {};

    Object.keys(remoteAudioElementsRef.current).forEach((targetId) => {
      const el = remoteAudioElementsRef.current[targetId];
      if (el) {
        el.pause();
        el.srcObject = null;
        el.remove();
      }
    });
    remoteAudioElementsRef.current = {};

    setIsMicOn(false);
    setIsMuted(false);
    setIsSpeaking(false);
  }, []);

  // Initialize peer connection with a specific target player
  const createPeerConnection = useCallback(
    async (targetSocketId, isInitiator) => {
      if (!socketRef.current || peerConnectionsRef.current[targetSocketId]) {
        return peerConnectionsRef.current[targetSocketId];
      }

      const pc = new RTCPeerConnection(ICE_CONFIG);
      peerConnectionsRef.current[targetSocketId] = pc;

      // Add local stream tracks if mic is active
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("coinRush_voice_signal", {
            targetSocketId,
            signalData: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        let audioEl = remoteAudioElementsRef.current[targetSocketId];
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          remoteAudioElementsRef.current[targetSocketId] = audioEl;
        }
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          pc.close();
          delete peerConnectionsRef.current[targetSocketId];
        }
      };

      if (isInitiator) {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          socketRef.current.emit("coinRush_voice_signal", {
            targetSocketId,
            signalData: { type: "offer", sdp: pc.localDescription },
          });
        } catch (err) {
          console.warn("[GameVoice] Error creating offer for", targetSocketId, err);
        }
      }

      return pc;
    },
    [socketRef]
  );

  // Setup Audio Volume Analyzer for live speaking indicator
  const setupVolumeAnalyzer = useCallback((stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // If average frequency level > 12 and not muted, mark as speaking
        const speakingNow = average > 12 && !isMutedRef.current;
        setIsSpeaking(speakingNow);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("[GameVoice] Volume analyzer failed:", err);
    }
  }, []);

  // Start / Request Microphone Stream
  const startMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toastMessage("Microphone access is not supported on this browser.", "error");
      setPermissionError("Unsupported");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setIsMicOn(true);
      setIsMuted(false);
      setPermissionError(null);

      setupVolumeAnalyzer(stream);
      toastMessage("🎙️ Microphone enabled! Voice chat active.", "success");

      // Notify room members
      socketRef.current?.emit("coinRush_voice_mute_toggle", { isMuted: false });

      // Connect with current players in room
      players.forEach((p) => {
        if (p.id !== socketId) {
          createPeerConnection(p.id, true);
        }
      });

      return true;
    } catch (err) {
      console.error("[GameVoice] getUserMedia error:", err);
      const msg = err.name === "NotAllowedError" ? "Microphone permission denied." : "Could not access microphone.";
      toastMessage(msg, "error");
      setPermissionError(err.name || "Denied");
      setIsMicOn(false);
      return false;
    }
  }, [socketRef, socketId, players, createPeerConnection, setupVolumeAnalyzer]);

  // Toggle Mute / Unmute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) {
      startMic();
      return;
    }

    const nextMute = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMute;
    });

    setIsMuted(nextMute);
    isMutedRef.current = nextMute;
    if (nextMute) setIsSpeaking(false);

    socketRef.current?.emit("coinRush_voice_mute_toggle", { isMuted: nextMute });

    if (nextMute) {
      toastMessage("🔇 Microphone muted", "info");
    } else {
      toastMessage("🎙️ Microphone unmuted", "success");
    }
  }, [isMuted, startMic, socketRef]);

  // Socket signaling listener
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleVoiceSignal = async ({ fromSocketId, signalData }) => {
      if (!fromSocketId || !signalData) return;

      let pc = peerConnectionsRef.current[fromSocketId];

      if (signalData.type === "offer") {
        if (!pc) {
          pc = await createPeerConnection(fromSocketId, false);
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("coinRush_voice_signal", {
            targetSocketId: fromSocketId,
            signalData: { type: "answer", sdp: pc.localDescription },
          });
        } catch (err) {
          console.warn("[GameVoice] Error handling offer from", fromSocketId, err);
        }
      } else if (signalData.type === "answer") {
        if (pc && pc.signalingState !== "stable") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          } catch (err) {
            console.warn("[GameVoice] Error handling answer from", fromSocketId, err);
          }
        }
      } else if (signalData.type === "candidate") {
        if (pc && signalData.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (err) {
            console.warn("[GameVoice] Error adding ICE candidate from", fromSocketId, err);
          }
        }
      }
    };

    const handleMuteChanged = ({ playerId, isMuted: remoteMuted }) => {
      setRemoteMutes((prev) => ({ ...prev, [playerId]: remoteMuted }));
    };

    socket.on("coinRush_voice_signal", handleVoiceSignal);
    socket.on("coinRush_voice_player_mute_changed", handleMuteChanged);

    return () => {
      socket.off("coinRush_voice_signal", handleVoiceSignal);
      socket.off("coinRush_voice_player_mute_changed", handleMuteChanged);
    };
  }, [socketRef, createPeerConnection]);

  // Clean up when room changes or unmount
  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, [roomId, cleanupVoice]);

  return {
    isMicOn,
    isMuted,
    isSpeaking,
    permissionError,
    remoteMutes,
    startMic,
    toggleMute,
    cleanupVoice,
  };
}
