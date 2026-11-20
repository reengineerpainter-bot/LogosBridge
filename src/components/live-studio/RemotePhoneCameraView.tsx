import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Zap, ZapOff, Wifi, WifiOff, Radio, ShieldCheck, Mic, MicOff } from 'lucide-react';

interface RemotePhoneCameraViewProps {
  roomId: string;
}

const getIceServers = (): RTCIceServer[] => {
  try {
    // 1. Check window global override (e.g. from index.html)
    if (typeof window !== 'undefined' && Array.isArray((window as any).LOGOSBRIDGE_ICE_SERVERS)) {
      return (window as any).LOGOSBRIDGE_ICE_SERVERS;
    }
    // 2. Check localStorage (for browser-level or runtime settings)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('logosbridge_ice_servers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    // 3. Check Vite environment variable from .env (e.g. VITE_ICE_SERVERS)
    const envIce = (import.meta as any).env?.VITE_ICE_SERVERS;
    if (envIce) {
      const parsed = typeof envIce === 'string' ? JSON.parse(envIce) : envIce;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[WebRTC] Error parsing custom ICE/TURN servers:', err);
  }

  // Default fallback: Google public STUN servers
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
};

export const RemotePhoneCameraView: React.FC<RemotePhoneCameraViewProps> = ({ roomId }) => {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wakeLockRef = useRef<any>(null);

  // UI & Device States
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [targetQuality, setTargetQuality] = useState<'1080p' | '4k' | '720p'>('1080p');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING_WS' | 'WAITING_STUDIO' | 'STREAMING_LIVE' | 'DISCONNECTED'>('CONNECTING_WS');
  const [fps, setFps] = useState<number>(60);
  const [phoneDeviceName] = useState<string>(() => {
    if (typeof navigator === 'undefined') return 'Smartphone Camera';
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone Camera';
    if (/SM-F|SM-S|Samsung/i.test(ua)) return 'Samsung Galaxy Camera';
    if (/Pixel/i.test(ua)) return 'Google Pixel Camera';
    if (/Android/i.test(ua)) return 'Android HD Camera';
    return 'Smartphone Camera';
  });
  const [phoneId] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('logosbridge_phone_id');
      if (saved) return saved;
      const newId = `phone-${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('logosbridge_phone_id', newId);
      return newId;
    } catch {
      return `phone-${Math.random().toString(36).slice(2, 7)}`;
    }
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Screen Wake Lock & Foreground Restore Engine (Auto-recovers when un-minimizing)
  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[Remote Phone] Screen Wake Lock acquired.');
      }
    } catch (err) {
      console.warn('[Remote Phone] Wake lock error:', err);
    }
  }, []);


  // ── Acquire High-Definition Camera Stream ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          window.isSecureContext === false
            ? 'Secure HTTPS required for mobile camera access.'
            : 'Camera API not supported in this browser.'
        );
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const qualityConstraints: Record<string, { width: number; height: number; fps: number }> = {
        '4k': { width: 3840, height: 2160, fps: 30 },
        '1080p': { width: 1920, height: 1080, fps: 60 },
        '720p': { width: 1280, height: 720, fps: 60 }
      };

      const target = qualityConstraints[targetQuality] || qualityConstraints['1080p'];

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: target.width },
            height: { ideal: target.height },
            frameRate: { ideal: target.fps }
          },
          audio: isAudioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        });
      } catch (highResErr) {
        console.warn('[Remote Phone] High-res constraint failed, falling back to basic:', highResErr);
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: isAudioEnabled
          });
        } catch (audioFallbackErr) {
          console.warn('[Remote Phone] Video+Audio failed, falling back to video-only:', audioFallbackErr);
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode },
              audio: false
            });
          } catch {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }
      }

      streamRef.current = newStream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
        await videoPreviewRef.current.play().catch(() => {});
      }

      // Check for torch/flashlight support on rear camera
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setIsTorchSupported(!!capabilities.torch);
      }

      // If WebRTC connection is already active, replace sender tracks seamlessly or add if missing
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        newStream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(() => {});
          } else {
            peerConnectionRef.current?.addTrack(track, newStream);
          }
        });
      }

      return newStream;
    } catch (camErr: any) {
      console.error('[Remote Phone] Camera acquisition failed:', camErr);
      const msg =
        camErr?.name === 'NotAllowedError' || camErr?.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera in settings.'
          : (camErr?.message || 'Unable to access device camera.');
      setCameraError(msg);
      return null;
    }
  }, [facingMode, targetQuality, isAudioEnabled]);

  // Listen for Tab Visibility & Window Focus to Auto-Recover from Minimizing
  useEffect(() => {
    acquireWakeLock();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Remote Phone] App returned to foreground. Re-checking camera stream & wake lock...');
        await acquireWakeLock();

        // Notify studio host that phone is active in foreground
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'WEBRTC_PHONE_STANDBY',
            room: roomId,
            phoneId,
            isStandby: false
          }));
        }

        const videoTrack = streamRef.current?.getVideoTracks()[0];
        const isTrackSuspended = !videoTrack || videoTrack.readyState === 'ended' || videoTrack.muted;
        if (isTrackSuspended) {
          console.log('[Remote Phone] Camera track suspended by mobile OS in background. Restoring camera...');
          await startCamera();
        }
      } else if (document.visibilityState === 'hidden') {
        console.log('[Remote Phone] App minimized to background. Notifying studio host...');
        // Notify studio host that phone is minimized
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'WEBRTC_PHONE_STANDBY',
            room: roomId,
            phoneId,
            isStandby: true
          }));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [acquireWakeLock, startCamera, roomId, phoneId]);

  // Flip Camera (Rear ↔ Front) with immediate live WebRTC track hot-swapping
  const toggleFlipCamera = useCallback(async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setIsTorchOn(false);

    try {
      console.log(`[Remote Phone] Flipping camera to: ${nextMode}`);
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(t => t.stop());
      }

      const qualityConstraints: Record<string, { width: number; height: number; fps: number }> = {
        '4k': { width: 3840, height: 2160, fps: 30 },
        '1080p': { width: 1920, height: 1080, fps: 60 },
        '720p': { width: 1280, height: 720, fps: 60 }
      };
      const target = qualityConstraints[targetQuality] || qualityConstraints['1080p'];

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: nextMode,
            width: { ideal: target.width },
            height: { ideal: target.height },
            frameRate: { ideal: target.fps }
          },
          audio: isAudioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: false
        });
      }

      streamRef.current = newStream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
        await videoPreviewRef.current.play().catch(() => {});
      }

      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setIsTorchSupported(!!capabilities.torch);
      }

      if (peerConnectionRef.current && videoTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
          console.log('[Remote Phone] Live WebRTC video track replaced seamlessly on flip.');
        } else {
          peerConnectionRef.current.addTrack(videoTrack, newStream);
        }
      }
    } catch (err: any) {
      console.error('[Remote Phone] Error flipping camera:', err);
    }
  }, [facingMode, targetQuality, isAudioEnabled]);

  const toggleFlipCameraRef = useRef(toggleFlipCamera);
  useEffect(() => {
    toggleFlipCameraRef.current = toggleFlipCamera;
  }, [toggleFlipCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setIsTorchOn(nextTorch);
      } catch (torchErr) {
        console.warn('[Remote Phone] Torch toggle failed:', torchErr);
      }
    }
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  // ── WebRTC Signaling & Peer Connection ──
  const rejoinIntervalRef = useRef<any>(null);
  const reconnectTimerRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;
    let ws: WebSocket | null = null;

    const connectSignaling = async () => {
      if (isCancelled) return;

      // 1. Acquire camera stream first if not already running
      const activeStream = streamRef.current && streamRef.current.active ? streamRef.current : await startCamera();
      if (isCancelled) return;

      const wsHost = window.location.hostname || 'localhost';
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      // When on standard HTTPS (e.g. Railway public domain with no port), connect directly to root WSS
      const portPart = window.location.port ? `:${window.location.port}` : (isHttps ? '' : ':8080');
      const wsUrl = `${wsProtocol}//${wsHost}${portPart}`;

      console.log(`[Remote Phone] Connecting to signaling server at ${wsUrl} for room ${roomId}`);
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const createPeerConnection = () => {
        pendingIceCandidatesRef.current = [];
        if (peerConnectionRef.current) {
          try { peerConnectionRef.current.close(); } catch {}
        }

        const pc = new RTCPeerConnection({
          iceServers: getIceServers()
        });

        peerConnectionRef.current = pc;

        // Add local tracks to WebRTC (guaranteed to be active)
        const currentStream = streamRef.current || activeStream;
        if (currentStream) {
          currentStream.getTracks().forEach(track => {
            pc.addTrack(track, currentStream);
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'WEBRTC_ICE',
              room: roomId,
              phoneId,
              candidate: event.candidate
            }));
          }
        };

        pc.onconnectionstatechange = () => {
          console.log(`[Remote Phone] Peer connection state: ${pc.connectionState}`);
          if (pc.connectionState === 'connected') {
            setConnectionStatus('STREAMING_LIVE');
            if (rejoinIntervalRef.current) {
              clearInterval(rejoinIntervalRef.current);
              rejoinIntervalRef.current = null;
            }
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setConnectionStatus('WAITING_STUDIO');
          }
        };

        return pc;
      };

      ws.onopen = () => {
        console.log(`[Remote Phone ${phoneId}] WebSocket connected. Joining room: ${roomId}`);
        setConnectionStatus('WAITING_STUDIO');
        ws?.send(JSON.stringify({
          type: 'WEBRTC_JOIN',
          room: roomId,
          role: 'phone',
          phoneId,
          deviceName: phoneDeviceName
        }));

        // Send device info to studio host
        ws?.send(JSON.stringify({
          type: 'WEBRTC_PHONE_INFO',
          room: roomId,
          phoneId,
          info: {
            deviceName: phoneDeviceName,
            resolution: targetQuality.toUpperCase(),
            fps: 60
          }
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'WEBRTC_OFFER') {
            if (data.phoneId && data.phoneId !== phoneId) return;
            console.log(`[Remote Phone ${phoneId}] Received WebRTC offer from studio host`);
            if (rejoinIntervalRef.current) {
              clearInterval(rejoinIntervalRef.current);
              rejoinIntervalRef.current = null;
            }
            const pc = createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            for (const cand of pendingIceCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pendingIceCandidatesRef.current = [];
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws?.send(JSON.stringify({
              type: 'WEBRTC_ANSWER',
              room: roomId,
              phoneId,
              sdp: answer
            }));
          } else if (data.type === 'WEBRTC_ICE' && data.candidate) {
            if (data.phoneId && data.phoneId !== phoneId) return;
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
            } else {
              pendingIceCandidatesRef.current.push(data.candidate);
            }
          } else if (data.type === 'WEBRTC_FLIP_CAMERA') {
            if (data.phoneId && data.phoneId !== phoneId) return;
            console.log(`[Remote Phone ${phoneId}] Received remote flip camera command from studio`);
            toggleFlipCameraRef.current();
          } else if (data.type === 'WEBRTC_HOST_DISCONNECTED') {
            console.log(`[Remote Phone ${phoneId}] Host disconnected, waiting and re-announcing presence...`);
            setConnectionStatus('WAITING_STUDIO');
            if (rejoinIntervalRef.current) clearInterval(rejoinIntervalRef.current);
            rejoinIntervalRef.current = setInterval(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                console.log(`[Remote Phone ${phoneId}] Periodic WEBRTC_JOIN re-announcement to host...`);
                ws.send(JSON.stringify({
                  type: 'WEBRTC_JOIN',
                  room: roomId,
                  role: 'phone',
                  phoneId,
                  deviceName: phoneDeviceName
                }));
              }
            }, 2500);
          }
        } catch (msgErr) {
          console.warn('[Remote Phone] Signaling message error:', msgErr);
        }
      };

      ws.onclose = () => {
        console.log('[Remote Phone] WebSocket signaling closed, reconnecting in 2s...');
        setConnectionStatus('DISCONNECTED');
        if (!isCancelled) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(connectSignaling, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[Remote Phone] WebSocket error:', err);
        try { ws?.close(); } catch {}
      };
    };

    connectSignaling();

    return () => {
      isCancelled = true;
      if (rejoinIntervalRef.current) clearInterval(rejoinIntervalRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try { ws?.close(); } catch {}
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [roomId, phoneId, phoneDeviceName, targetQuality]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col justify-between select-none overflow-hidden touch-none font-sans text-white">
      {/* Full-Screen Camera Viewfinder */}
      <video
        ref={videoPreviewRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Camera Permission / Error Alert Overlay */}
      {cameraError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl">
          <div className="max-w-xs w-full p-6 rounded-3xl bg-[#111622] border border-white/10 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#faf6f0]">Camera Access</h3>
              <p className="text-xs text-zinc-300 leading-normal">
                {cameraError}
              </p>
            </div>
            {window.location.protocol === 'http:' && (
              <button
                type="button"
                onClick={() => {
                  const httpsPort = '3443';
                  window.location.href = `https://${window.location.hostname}:${httpsPort}${window.location.pathname}${window.location.search}`;
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Switch to Secure HTTPS</span>
              </button>
            )}
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[#faf6f0] font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Glassmorphic HUD Bar */}
      <div className="relative z-10 w-full flex items-center justify-between p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          {connectionStatus === 'STREAMING_LIVE' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white shadow-lg border border-rose-400/40 backdrop-blur-xl">
              <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-[10px] font-black tracking-widest uppercase">LIVE</span>
            </div>
          ) : connectionStatus === 'WAITING_STUDIO' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 text-black shadow-lg backdrop-blur-xl">
              <Wifi className="w-3.5 h-3.5 animate-pulse text-black" />
              <span className="text-[10px] font-black tracking-wider uppercase">SYNC</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 text-zinc-300 shadow-lg border border-zinc-700/50 backdrop-blur-xl">
              <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          )}
        </div>

        {/* Quality Selector Segmented Pill */}
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl rounded-full p-1 border border-white/15">
          {(['720p', '1080p', '4k'] as const).map(q => (
            <button
              key={q}
              onClick={() => setTargetQuality(q)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase transition-all ${
                targetQuality === q ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {q === '1080p' ? 'HD' : q.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Center Viewfinder Optical Focus Reticle - Zero Narratives */}
      <div className="relative z-0 pointer-events-none self-center my-auto flex items-center justify-center w-40 h-40 opacity-40">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/80 rounded-br-sm" />
        <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
      </div>

      {/* Bottom Floating Control Deck - Pure Icon-Driven */}
      <div className="relative z-10 w-full p-4 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center gap-2.5">
        {/* Broadcast Tip */}
        <div className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-zinc-300 font-sans tracking-wide text-center flex items-center gap-1.5 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>Keep tab active during broadcast (minimizing pauses camera)</span>
        </div>
        <div className="flex items-center gap-4 p-2 rounded-full bg-black/45 backdrop-blur-2xl border border-white/20 shadow-2xl">
          {/* Flip Camera */}
          <button
            type="button"
            onClick={toggleFlipCamera}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-[#faf6f0] flex items-center justify-center transition-all shadow-md cursor-pointer"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Torch / Flashlight (if supported) */}
          <button
            type="button"
            disabled={!isTorchSupported || facingMode === 'user'}
            onClick={toggleTorch}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-md cursor-pointer active:scale-95 ${
              isTorchOn
                ? 'bg-amber-400 text-black border-amber-300 shadow-amber-400/40'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-[#faf6f0] disabled:opacity-25 disabled:cursor-not-allowed'
            }`}
            title="Flashlight"
          >
            {isTorchOn ? <Zap className="w-5 h-5 fill-black" /> : <ZapOff className="w-5 h-5" />}
          </button>

          {/* Audio Mic Mute */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-md cursor-pointer active:scale-95 ${
              !isAudioEnabled
                ? 'bg-rose-600/90 text-white border-rose-400 shadow-rose-600/30'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-emerald-400'
            }`}
            title="Microphone"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
