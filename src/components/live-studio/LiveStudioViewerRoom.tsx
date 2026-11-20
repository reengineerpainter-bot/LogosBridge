import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Eye,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Shield,
  Heart,
  Send,
  Lock,
  Unlock,
  Download,
  Square,
  Sparkles,
  Users,
  MessageSquare,
  Flame,
  BookOpen,
  RefreshCw,
  Sliders,
  ChevronDown,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getOrGenerateSystemUserId,
  getSystemUserHandle,
  setSystemUserHandle,
  isFellowshipCovenantAccepted,
  acceptFellowshipCovenant,
  FELLOWSHIP_COVENANT_TERMS
} from '../../utils/deviceIdentity';
import {
  FellowshipMessage,
  FellowshipInteractionType,
  FellowshipParticipant
} from '../../types/fellowship';
import {
  useStudioDeckTheme,
  getTactileBtnClass,
  getTactileLedClass,
  playHardwareClick,
  getStudioThemeTokens,
  StudioDeckTheme
} from './tactileTheme';

export interface LiveStudioViewerRoomProps {
  onSwitchToBroadcast: () => void;
  onBackToHome?: () => void;
  defaultRoomKey?: string;
  wsUrl?: string;
  deckTheme?: StudioDeckTheme;
}

export const LiveStudioViewerRoom: React.FC<LiveStudioViewerRoomProps> = ({
  onSwitchToBroadcast,
  onBackToHome,
  defaultRoomKey,
  wsUrl,
  deckTheme: propDeckTheme
}) => {
  const [hookDeckTheme] = useStudioDeckTheme();
  const deckTheme: StudioDeckTheme = propDeckTheme && (propDeckTheme === 'obsidian' || propDeckTheme === 'stealth' || propDeckTheme === 'crimson')
    ? propDeckTheme
    : hookDeckTheme;
  // ── Persistent User Identity & Covenant ──
  const [systemUserId] = useState<string>(() => getOrGenerateSystemUserId());
  const [userHandle, setUserHandleState] = useState<string>(() => getSystemUserHandle());
  const [isEditingHandle, setIsEditingHandle] = useState<boolean>(false);
  const [tempHandle, setTempHandle] = useState<string>(userHandle);

  const [hasAcceptedCovenant, setHasAcceptedCovenant] = useState<boolean>(() =>
    isFellowshipCovenantAccepted()
  );
  const [showCovenantModal, setShowCovenantModal] = useState<boolean>(!hasAcceptedCovenant);

  // ── Room & Connection State ──
  const [roomKey, setRoomKey] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryRoom = urlParams.get('watch') || urlParams.get('room');
      if (queryRoom && queryRoom.trim().length > 0) return queryRoom.trim();
      const saved = sessionStorage.getItem('logosbridge_viewer_room');
      if (saved && saved.trim().length > 0) return saved.trim();
    } catch {}
    return defaultRoomKey || 'fellowship-sanctuary';
  });

  const [isRoomInputOpen, setIsRoomInputOpen] = useState<boolean>(false);
  const [tempRoomKey, setTempRoomKey] = useState<string>(roomKey);
  const [connectionStatus, setConnectionStatus] = useState<
    'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'STREAM_ACTIVE' | 'HOST_OFFLINE'
  >('CONNECTING');
  const [viewerCount, setViewerCount] = useState<number>(1);
  const [isChatEnabled, setIsChatEnabled] = useState<boolean>(true);
  const [isCopiedTicket, setIsCopiedTicket] = useState<boolean>(false);

  // ── Host Permission & Local Recording ──
  const [canRecord, setCanRecord] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ── WebRTC & Media State ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // ── Fellowship Spiritual Interaction & Chat ──
  const [messages, setMessages] = useState<FellowshipMessage[]>([
    {
      id: 'welcome-1',
      senderId: 'SYSTEM',
      senderName: 'Fellowship Center',
      room: roomKey,
      type: 'prophetic_word',
      text: 'Welcome to the Live Fellowship Broadcast. Stand in agreement in the Spirit!',
      scriptureRef: 'Ephesians 4:3',
      timestamp: Date.now() - 60000
    }
  ]);
  const [activeTab, setActiveTab] = useState<'all' | 'prayer' | 'confession'>('all');
  const [chatInputText, setChatInputText] = useState<string>('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const themeTokens = getStudioThemeTokens(deckTheme);

  // ── WebRTC ICE Servers ──
  const getIceServers = (): RTCIceServer[] => [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  // ── WebRTC Viewer Connection Lifecycle ──
  const connectToBroadcast = useCallback(() => {
    if (!roomKey) return;
    setConnectionStatus('CONNECTING');

    // Close previous connection
    try {
      if (wsRef.current) wsRef.current.close();
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    } catch {}

    const wsHost = window.location.hostname || 'localhost';
    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const portPart = window.location.port ? `:${window.location.port}` : (isHttps ? '' : ':8080');
    const signalingUrl = wsUrl || `${wsProtocol}//${wsHost}${portPart}`;

    console.log(`[Fellowship Viewer] Connecting to ${signalingUrl} for room ${roomKey}`);
    const ws = new WebSocket(signalingUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[Fellowship Viewer] WebSocket connected. Joining room: ${roomKey}`);
      ws.send(JSON.stringify({
        type: 'WEBRTC_JOIN',
        room: roomKey,
        role: 'viewer',
        userId: systemUserId,
        displayName: userHandle,
        isFaithAligned: hasAcceptedCovenant
      }));
      setConnectionStatus('CONNECTED');
    };

    ws.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data);

        // 1. Room Status Sync
        if (data.type === 'FELLOWSHIP_ROOM_SYNC') {
          setViewerCount(data.viewerCount || 1);
          setIsChatEnabled(data.isChatEnabled !== false);
          setCanRecord(!!data.canRecord);
          if (!data.hostActive) {
            setConnectionStatus('HOST_OFFLINE');
          }
        }

        // 2. Audience Updates
        if (data.type === 'FELLOWSHIP_VIEWER_JOINED' || data.type === 'FELLOWSHIP_VIEWER_LEFT') {
          if (data.viewerCount !== undefined) {
            setViewerCount(data.viewerCount);
          }
        }

        // 3. WebRTC Offer from Host
        if (data.type === 'WEBRTC_VIEWER_OFFER' && data.sdp) {
          console.log('[Fellowship Viewer] Received WebRTC offer from host');
          const pc = new RTCPeerConnection({ iceServers: getIceServers() });
          peerConnectionRef.current = pc;

          const incomingStream = new MediaStream();
          remoteStreamRef.current = incomingStream;

          pc.ontrack = (event) => {
            console.log('[Fellowship Viewer] Incoming track kind:', event.track.kind);
            incomingStream.addTrack(event.track);
            if (videoRef.current) {
              videoRef.current.srcObject = incomingStream;
              videoRef.current.play().catch(() => {});
            }
            setConnectionStatus('STREAM_ACTIVE');
          };

          pc.onicecandidate = (event) => {
            if (event.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'WEBRTC_VIEWER_ICE',
                room: roomKey,
                viewerId: systemUserId,
                candidate: event.candidate
              }));
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Flush any queued ICE candidates
          for (const cand of pendingIceCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingIceCandidatesRef.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          ws.send(JSON.stringify({
            type: 'WEBRTC_VIEWER_ANSWER',
            room: roomKey,
            viewerId: systemUserId,
            sdp: answer
          }));
        }

        // 4. WebRTC ICE from Host
        if (data.type === 'WEBRTC_VIEWER_ICE' && data.candidate) {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          } else {
            pendingIceCandidatesRef.current.push(data.candidate);
          }
        }

        // 5. Host Disconnected
        if (data.type === 'WEBRTC_HOST_DISCONNECTED') {
          setConnectionStatus('HOST_OFFLINE');
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }

        // 6. Recording Permission Granted/Revoked by Host
        if (data.type === 'FELLOWSHIP_RECORDING_PERMISSION_UPDATED') {
          setCanRecord(!!data.canRecord);
          if (!data.canRecord && isRecording) {
            stopRecording();
          }
        }

        // 7. Chat Status Update from Host
        if (data.type === 'FELLOWSHIP_CHAT_STATUS') {
          setIsChatEnabled(!!data.isChatEnabled);
        }

        // 8. Fellowship Chat & Spiritual Interactions
        if (data.type === 'FELLOWSHIP_CHAT_MSG' && data.message) {
          setMessages(prev => [...prev.slice(-100), data.message]);
        }
      } catch (err) {
        console.warn('[Fellowship Viewer] Message parsing error:', err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('DISCONNECTED');
    };

    ws.onerror = () => {
      setConnectionStatus('DISCONNECTED');
    };
  }, [roomKey, systemUserId, userHandle, hasAcceptedCovenant, wsUrl, isRecording]);

  useEffect(() => {
    connectToBroadcast();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [connectToBroadcast]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Send Fellowship Chat / Prayer / Confession ──
  const handleSendMessage = (type: FellowshipInteractionType = 'comment', customText?: string) => {
    const textToSend = (customText || chatInputText).trim();
    if (!textToSend || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const newMsg: FellowshipMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: systemUserId,
      senderName: userHandle,
      room: roomKey,
      type,
      text: textToSend,
      timestamp: Date.now()
    };

    wsRef.current.send(JSON.stringify({
      type: 'FELLOWSHIP_CHAT_MSG',
      room: roomKey,
      message: newMsg
    }));

    if (!customText) {
      setChatInputText('');
    }
  };

  // ── Recording Handlers (Host Permission Gated) ──
  const startRecording = () => {
    if (!canRecord) return;
    if (!remoteStreamRef.current || remoteStreamRef.current.getTracks().length === 0) {
      alert('Cannot record: Live stream is not currently playing.');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const mr = new MediaRecorder(remoteStreamRef.current, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LogosBridge-Broadcast-${roomKey}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      mr.start(1000);
      setIsRecording(true);
      setRecordedSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordedSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Fellowship Viewer] Failed to start recording:', err);
      alert(`Recording error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleCopyTicket = () => {
    try {
      navigator.clipboard.writeText(roomKey);
      setIsCopiedTicket(true);
      setTimeout(() => setIsCopiedTicket(false), 2000);
    } catch {}
  };

  const handleSaveHandle = () => {
    if (tempHandle.trim().length > 0) {
      setSystemUserHandle(tempHandle.trim());
      setUserHandleState(tempHandle.trim());
    }
    setIsEditingHandle(false);
  };

  const handleAcceptCovenant = () => {
    acceptFellowshipCovenant();
    setHasAcceptedCovenant(true);
    setShowCovenantModal(false);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter messages by tab
  const filteredMessages = messages.filter(m => {
    if (activeTab === 'prayer') return m.type === 'prayer_amen';
    if (activeTab === 'confession') return m.type === 'word_confession' || m.type === 'prophetic_word';
    return true;
  });

  return (
    <div className={`w-full min-h-screen ${themeTokens.chassisBg} text-[#faf6f0] flex flex-col font-sans pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1.25rem))] no-scrollbar`}>
      {/* ── Top Bar: Switcher & Room Header ── */}
      <header className={`w-full px-3 py-2.5 ${themeTokens.containerBg} border-b flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-30 shadow-md backdrop-blur-md`}>
        {/* Left: Return & Switcher */}
        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button
              type="button"
              onClick={() => {
                playHardwareClick(240, false);
                onBackToHome();
              }}
              className={`p-2 rounded-xl flex items-center justify-center cursor-pointer ${getTactileBtnClass(deckTheme, false)}`}
              title="Return to Main App"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* 🎥 Broadcast Deck ↔ 👁️ Watch Live Tactile Switcher */}
          <div className={`flex items-center p-1 rounded-xl border ${themeTokens.stripBg} shadow-inner`}>
            <button
              type="button"
              onClick={() => {
                playHardwareClick(280, false);
                onSwitchToBroadcast();
              }}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${getTactileBtnClass(deckTheme, false, 'default')}`}
            >
              <Radio className="w-3.5 h-3.5 text-zinc-400" />
              <span>Broadcast</span>
            </button>
            <button
              type="button"
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${getTactileBtnClass(deckTheme, true, 'amber')}`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="text-amber-200">Watch Live</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Room Ticket Key Pill & Live Count */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Room Ticket Badge */}
          <button
            type="button"
            onClick={() => setIsRoomInputOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${themeTokens.stripBg} hover:border-amber-500/50`}
            title="Change Room Key"
          >
            <span className="font-bold text-amber-300 max-w-[120px] truncate">{roomKey}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {/* Copy Ticket Button */}
          <button
            type="button"
            onClick={handleCopyTicket}
            className={`p-1.5 rounded-lg border text-xs flex items-center justify-center cursor-pointer transition-all ${themeTokens.stripBg}`}
            title="Copy Fellowship Key"
          >
            {isCopiedTicket ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
          </button>

          {/* Live Audience Count */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${themeTokens.stripBg}`}>
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'STREAM_ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <Users className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[#faf6f0]">{viewerCount}</span>
          </div>

          {/* User Covenant Badge */}
          <button
            type="button"
            onClick={() => setShowCovenantModal(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              hasAcceptedCovenant
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300 animate-pulse'
            }`}
            title="Spiritual Covenant Status"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasAcceptedCovenant ? 'Covenant Aligned' : 'Review Covenant'}</span>
          </button>
        </div>
      </header>

      {/* ── Main Responsive Content: Mobile Stacked -> Desktop 2-Column ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0">
        {/* ── Left / Top: Master Live Broadcast Player Stage ── */}
        <section className="lg:col-span-7 flex flex-col gap-2.5">
          <div
            ref={playerContainerRef}
            className={`w-full relative aspect-video rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden bg-black flex items-center justify-center`}
          >
            {/* HTML5 WebRTC Video Element */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted={isMuted}
              className={`w-full h-full object-contain ${connectionStatus === 'STREAM_ACTIVE' ? 'block' : 'hidden'}`}
            />

            {/* Offline / Waiting for Host Standby Display */}
            {connectionStatus !== 'STREAM_ACTIVE' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0d0a08]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'CONNECTING' ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-zinc-300">
                    {connectionStatus === 'HOST_OFFLINE' ? 'Host Offline' : 'Connecting...'}
                  </h3>
                </div>
                <span className="text-xs text-amber-400/80 font-mono mb-4">
                  Ticket: {roomKey}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={connectToBroadcast}
                    className={`py-1.5 px-3.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${getTactileBtnClass(deckTheme, false, 'default')}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Reconnect</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRoomInputOpen(true)}
                    className={`py-1.5 px-3.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${getTactileBtnClass(deckTheme, false, 'accent')}`}
                  >
                    <span>Switch Ticket</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video Player Floating Overlay Controls (Bottom Gradient) */}
            {connectionStatus === 'STREAM_ACTIVE' && (
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-xs font-mono gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-bold text-white tracking-wider">LIVE COMMUNION</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMuted(prev => !prev)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white transition-all"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white transition-all"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Host-Gated Broadcast Recording Toolbar ── */}
          <div className={`w-full p-3 rounded-2xl border ${themeTokens.containerBg} flex flex-wrap items-center justify-between gap-2.5 shadow-lg`}>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl border ${canRecord ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                {canRecord ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-wide">
                  {canRecord ? 'Broadcast Archival Permitted' : 'Host Permission Required to Save'}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {canRecord
                    ? 'The host has granted you spiritual stewardship to record this broadcast.'
                    : 'Only authorized disciples permitted by the host can record this live stream.'}
                </span>
              </div>
            </div>

            {/* Save / Record Action Button */}
            {canRecord ? (
              isRecording ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-mono font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>REC {formatTimer(recordedSeconds)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="py-2 px-4 rounded-xl text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop & Save</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={connectionStatus !== 'STREAM_ACTIVE'}
                  className="py-2 px-4 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Live Broadcast</span>
                </button>
              )
            ) : (
              <button
                type="button"
                disabled
                className="py-2 px-4 rounded-xl text-xs font-mono font-bold bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 flex items-center gap-1.5 cursor-not-allowed"
                title="Ask the host to grant you recording permission in their studio audience panel."
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Restricted</span>
              </button>
            )}
          </div>
        </section>

        {/* ── Right / Bottom: Fellowship Center Communion & Prayer Band Dock ── */}
        <section className={`lg:col-span-5 flex flex-col rounded-2xl sm:rounded-3xl border ${themeTokens.containerBg} shadow-2xl overflow-hidden min-h-[460px] max-h-[640px]`}>
          {/* Fellowship Center Header */}
          <div className={`p-3 border-b ${themeTokens.stripBg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm font-bold tracking-wide">Fellowship Center</span>
            </div>

            {/* Quick User Identity */}
            <div className="flex items-center gap-1.5">
              {isEditingHandle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempHandle}
                    onChange={(e) => setTempHandle(e.target.value)}
                    className="w-24 px-1.5 py-0.5 rounded text-xs bg-black/60 border border-zinc-700 text-[#faf6f0]"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={handleSaveHandle}
                    className="p-1 rounded bg-amber-600 text-white text-[10px]"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingHandle(true)}
                  className="text-xs font-bold text-amber-300 hover:underline max-w-[110px] truncate"
                  title="Click to change your display handle"
                >
                  {userHandle}
                </button>
              )}
            </div>
          </div>

          {/* Spiritual Category Tabs */}
          <div className="flex items-center p-1.5 border-b border-zinc-800/60 bg-black/30 text-xs font-mono gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all ${
                activeTab === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prayer')}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'prayer' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Heart className="w-3 h-3" />
              <span>Prayer Band</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('confession')}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'confession' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Confessions</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs no-scrollbar bg-black/20"
          >
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <Heart className="w-8 h-8 mb-2 opacity-30" />
                <p>No messages yet in this category.</p>
                <p className="text-[11px] text-zinc-600 mt-1">Be the first to stand in agreement or make a confession!</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isAmen = msg.type === 'prayer_amen';
                const isConfession = msg.type === 'word_confession' || msg.type === 'prophetic_word';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className={`p-2.5 rounded-xl border ${
                      isAmen
                        ? 'bg-emerald-950/30 border-emerald-900/50'
                        : isConfession
                        ? 'bg-sky-950/30 border-sky-900/50'
                        : 'bg-zinc-900/60 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#faf6f0]">{msg.senderName}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {msg.senderId === 'SYSTEM' ? '' : msg.senderId.slice(-4)}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isAmen
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : isConfession
                          ? 'bg-sky-900/50 text-sky-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isAmen ? '🙏 Amen' : isConfession ? '⚔️ Confession' : 'Comment'}
                      </span>
                    </div>

                    <p className="text-zinc-200 text-xs leading-relaxed font-sans">{msg.text}</p>
                    {msg.scriptureRef && (
                      <span className="inline-block mt-1 text-[11px] font-serif text-amber-300 italic">
                        — {msg.scriptureRef}
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Quick-Tap Spiritual Agreement Chips */}
          <div className="p-2 border-t border-zinc-800/80 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSendMessage('prayer_amen', 'Amen! Standing in holy agreement!')}
              className="py-1 px-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all"
            >
              <Heart className="w-3 h-3" />
              <span>Amen! In Agreement</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('word_confession', 'By His stripes we are healed! (1 Peter 2:24)')}
              className="py-1 px-2.5 rounded-lg border border-sky-800/60 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all"
            >
              <BookOpen className="w-3 h-3" />
              <span>By His Stripes!</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('prophetic_word', 'Hallelujah! The glory of the Lord fills this house!')}
              className="py-1 px-2.5 rounded-lg border border-amber-800/60 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3 h-3" />
              <span>Hallelujah!</span>
            </button>
          </div>

          {/* Input Area */}
          <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/80">
            {isChatEnabled ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage('comment');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Share a confession or prayer agreement..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-[#faf6f0] placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  maxLength={280}
                />
                <button
                  type="submit"
                  disabled={!chatInputText.trim()}
                  className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="py-2 px-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-center text-xs">
                The host has temporarily paused fellowship comments for ministering.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Modal: Christian Fellowship Covenant Terms ── */}
      <AnimatePresence>
        {showCovenantModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowCovenantModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-4 sm:p-5 rounded-3xl bg-[#171310] border border-zinc-800 shadow-2xl text-[#faf6f0] space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <button
                  type="button"
                  onClick={() => setShowCovenantModal(false)}
                  className="p-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Return"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm sm:text-base font-bold text-[#faf6f0]">
                  Fellowship Covenant
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCovenantModal(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Identity Display */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Device ID</span>
                  <span className="font-bold text-amber-300">{systemUserId}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block text-[10px]">Handle</span>
                  <span className="font-bold text-[#faf6f0]">{userHandle}</span>
                </div>
              </div>

              {/* Pillars without redundant narrative paragraphs */}
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {FELLOWSHIP_COVENANT_TERMS.map((term, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-200">{term.pillar}</span>
                    <span className="text-[10px] font-mono text-zinc-400 font-serif italic">{term.scripture}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleAcceptCovenant}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enter in Agreement</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Switch Fellowship Ticket / Room Key ── */}
      <AnimatePresence>
        {isRoomInputOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsRoomInputOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-4 sm:p-5 rounded-3xl bg-[#171310] border border-zinc-800 shadow-2xl text-[#faf6f0] space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <button
                  type="button"
                  onClick={() => setIsRoomInputOpen(false)}
                  className="p-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Return"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm sm:text-base font-bold text-[#faf6f0]">
                  Fellowship Ticket
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRoomInputOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                value={tempRoomKey}
                onChange={(e) => setTempRoomKey(e.target.value)}
                placeholder="Enter Ticket Key (e.g. fellowship-sanctuary)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-zinc-700 text-xs font-mono text-[#faf6f0] placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (tempRoomKey.trim().length > 0) {
                      setRoomKey(tempRoomKey.trim());
                      sessionStorage.setItem('logosbridge_viewer_room', tempRoomKey.trim());
                    }
                    setIsRoomInputOpen(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
                >
                  Join Room
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
