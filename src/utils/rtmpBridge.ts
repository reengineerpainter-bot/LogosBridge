import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'child_process';
import http from 'http';
import https from 'https';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const FFMPEG_PATH = (ffmpegInstaller && (ffmpegInstaller as any).path) || 'ffmpeg';

// Active WebRTC Signaling Rooms for Wireless Remote Phone Cameras
interface PhoneClient {
  id: string;
  ws: WebSocket;
  deviceName?: string;
  phoneInfo?: { deviceName: string; resolution: string; fps: number };
}

interface ViewerClient {
  userId: string;
  ws: WebSocket;
  displayName: string;
  canRecord: boolean;
  joinedAt: number;
}

interface WebRtcRoom {
  hostWs?: WebSocket;
  phoneWs?: WebSocket;
  phones: Map<string, PhoneClient>;
  phoneInfo?: { deviceName: string; resolution: string; fps: number };
  viewers: Map<string, ViewerClient>;
  isChatEnabled?: boolean;
}
const webRtcRooms = new Map<string, WebRtcRoom>();

export function startRtmpBridge(wsPort = 8080, sslOptions?: { key: string; cert: string }, wssPort = 8443) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'logosbridge-live-studio-bridge', port: wsPort }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wss = new WebSocketServer({ server });
  console.log(`[RTMP Bridge] Initializing WebSocket server on ws://localhost:${wsPort} using FFmpeg: ${FFMPEG_PATH}`);

  let wssSecure: WebSocketServer | null = null;
  let secureServer: https.Server | null = null;

  if (sslOptions) {
    try {
      secureServer = https.createServer(sslOptions, (req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'logosbridge-live-studio-bridge-secure', port: wssPort }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      wssSecure = new WebSocketServer({ server: secureServer });
      secureServer.listen(wssPort, '0.0.0.0', () => {
        console.log(`[LogosBridge RTMP Bridge] Secure WSS running on wss://localhost:${wssPort}`);
      });
      secureServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[RTMP Bridge] Secure Port ${wssPort} is already in use.`);
        } else {
          console.warn(`[RTMP Bridge] Secure server error:`, err.message);
        }
      });
    } catch (e: any) {
      console.warn('[RTMP Bridge] Failed to initialize secure WSS:', e.message);
    }
  }

  const handleConnection = (ws: WebSocket, req: any) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[RTMP Bridge] Client connected from ${clientIp}`);

    let ffmpegProcess: any = null;
    let activeConfig: { rtmpUrl: string; streamKey: string; platform: string; fps: number; bitrate: string } | null = null;
    let isStreaming = false;
    let hasSentIngestingStatus = false;

    const sendStatus = (status: string, payload: Record<string, any> = {}) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'STATUS', status, ...payload, timestamp: Date.now() }));
      }
    };

    let isSocketPaused = false;
    let lastBinaryLogTime = 0;
    let totalBinaryBytes = 0;

    const cleanupFfmpeg = () => {
      hasSentIngestingStatus = false;
      if (isSocketPaused) {
        try {
          ws.resume();
        } catch {}
        isSocketPaused = false;
      }
      if (ffmpegProcess) {
        try {
          if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
            ffmpegProcess.stdin.removeAllListeners('drain');
            ffmpegProcess.stdin.end();
          }
        } catch {}
        try {
          ffmpegProcess.kill('SIGINT');
        } catch {}
        ffmpegProcess = null;
      }
    };

    const spawnFfmpeg = () => {
      if (ffmpegProcess || !activeConfig) return;
      const { rtmpUrl, streamKey, platform = 'custom', fps = 30, bitrate = '6000k' } = activeConfig;

      if ((platform === 'youtube' || platform === 'facebook' || platform === 'tiktok') && !streamKey?.trim()) {
        sendStatus('ERROR', {
          message: `Please enter your ${platform.toUpperCase()} Stream Key in the Broadcast tab before starting the stream.`
        });
        isStreaming = false;
        return;
      }

      // Sanitize streamKey: strip any redundant URL prefixes or whitespace
      let cleanKey = (streamKey || '').trim();
      cleanKey = cleanKey.replace(/^rtmps?:\/\/[^\/]+\/(?:live2|live-push|live)\//i, '');
      const fullRtmpDestination = cleanKey ? `${rtmpUrl.replace(/\/$/, '')}/${cleanKey}` : rtmpUrl;

      const ffmpegArgs = [
        // Input: live WebM stream from browser MediaRecorder
        '-f', 'matroska',
        '-i', 'pipe:0',
        '-map', '0:v:0',
        '-map', '0:a?',
        // VIDEO: libx264 zerolatency transcode guarantees 100% YouTube & RTMP FLV compatibility
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-pix_fmt', 'yuv420p',
        // Lightweight profile (720p adaptive scaling for landscape & portrait)
        '-vf', "scale='if(gt(iw,ih),1280,720)':'if(gt(iw,ih),720,1280)':force_original_aspect_ratio=decrease,pad='if(gt(iw,ih),1280,720)':'if(gt(iw,ih),720,1280)':(ow-iw)/2:(oh-ih)/2",
        '-r', '24',
        '-g', '48',
        '-keyint_min', '48',
        '-sc_threshold', '0',
        '-b:v', '2200k',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        // AUDIO: Transcode Opus → AAC (FLV/RTMP requires AAC)
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        // Output: low-latency FLV to YouTube RTMP with global headers
        '-flags', '+global_header',
        '-fflags', '+nobuffer+flush_packets',
        '-flags', '+low_delay',
        '-flvflags', 'no_duration_filesize',
        '-f', 'flv',
        fullRtmpDestination
      ];

      try {
        console.log(`[RTMP Bridge] Spawning real-time FFmpeg pipeline for ${platform.toUpperCase()} -> ${fullRtmpDestination.replace(/(live2\/|live-push\/)[^/]+/, '$1***')}`);
        ffmpegProcess = spawn(FFMPEG_PATH, ffmpegArgs);
        hasSentIngestingStatus = false;

        // 15-second connection timeout — clear user feedback if FFmpeg can't reach the RTMP server
        const connectionTimeoutId = setTimeout(() => {
          if (!hasSentIngestingStatus && isStreaming && ffmpegProcess) {
            console.warn(`[RTMP Bridge] No frames produced in 15s — connection timeout for ${platform.toUpperCase()}.`);
            sendStatus('ERROR', {
              message: `Unable to connect to ${platform.toUpperCase()} within 15 seconds. Please verify: (1) Your Stream Key is fresh - copy a new one from YouTube Studio. (2) Internet connection is active. (3) Port 1935 (RTMP) is not blocked by firewall.`
            });
            cleanupFfmpeg();
            isStreaming = false;
          }
        }, 15000);

        ffmpegProcess.stdin.on('error', (stdinErr: any) => {
          console.warn('[FFmpeg stdin]:', stdinErr.code || stdinErr.message);
        });

        let lastStderrLog = '';
        let lastTelemetryTime = 0;

        ffmpegProcess.stderr.on('data', (stderrData: any) => {
          const logMsg = stderrData.toString();
          lastStderrLog = logMsg.trim();
          console.log('[FFmpeg]:', lastStderrLog);

          if (logMsg.includes('frame=') || logMsg.includes('bitrate=')) {
            const frameMatch = logMsg.match(/frame=\s*(\d+)/);
            const fpsMatch = logMsg.match(/fps=\s*([\d.]+)/);
            const bitrateMatch = logMsg.match(/bitrate=\s*([\d.]+\s*\w+\/s)/);
            const speedMatch = logMsg.match(/speed=\s*([\d.]+x)/);

            const frames = frameMatch ? parseInt(frameMatch[1], 10) : 0;
            const currentFps = fpsMatch ? parseFloat(fpsMatch[1]) : 30;
            const currentBitrate = bitrateMatch ? bitrateMatch[1] : '4.5 Mbps';
            const speed = speedMatch ? speedMatch[1] : '1.0x';

            if (!hasSentIngestingStatus) {
              hasSentIngestingStatus = true;
              clearTimeout(connectionTimeoutId);
              sendStatus('INGESTING', {
                message: `${platform.toUpperCase()} is actively receiving live stream data!`,
                platform,
                rtmpActive: true,
                frames,
                fps: currentFps,
                bitrate: currentBitrate,
                speed
              });
            }

            const now = Date.now();
            if (now - lastTelemetryTime >= 1000) {
              lastTelemetryTime = now;
              sendStatus('TELEMETRY', {
                rtmpActive: true,
                platform,
                frames,
                fps: currentFps,
                bitrate: currentBitrate,
                speed,
                log: lastStderrLog
              });
            }
          }
        });

        ffmpegProcess.on('close', (code: number, signal: string) => {
          clearTimeout(connectionTimeoutId);
          console.log(`[FFmpeg Closed] Code ${code}, Signal ${signal}`);
          const wasStreaming = isStreaming;
          isStreaming = false;
          cleanupFfmpeg();
          if (wasStreaming && code !== 0 && signal !== 'SIGINT') {
            let diagnostic = `Stream closed by ${platform.toUpperCase()} (code ${code}). Please verify your Stream Key in YouTube Studio.`;
            const lowerLog = (lastStderrLog || '').toLowerCase();
            if (lowerLog.includes('connection reset') || lowerLog.includes('10054') || lowerLog.includes('handshake failed') || lowerLog.includes('broken pipe')) {
              diagnostic = `${platform.toUpperCase()} rejected the stream key. Please verify and paste a fresh Stream Key from YouTube Studio.`;
            } else if (lowerLog.includes('connection refused') || lowerLog.includes('timed out') || lowerLog.includes('host unreachable') || lowerLog.includes('getaddrinfo')) {
              diagnostic = `Unable to reach ${platform.toUpperCase()} RTMP server. Check internet connection and outbound port 1935.`;
            } else if (lowerLog.includes('server error')) {
              diagnostic = `${platform.toUpperCase()} broadcast server error. Please verify the live stream event is active in YouTube Studio.`;
            }
            sendStatus('ERROR', {
              code,
              message: diagnostic,
              rawLog: lastStderrLog
            });
          } else {
            sendStatus('STOPPED', { code, message: `Stream session ended.` });
          }
        });

        ffmpegProcess.on('error', (err: any) => {
          clearTimeout(connectionTimeoutId);
          console.warn(`[FFmpeg Execution Error]`, err.message);
          cleanupFfmpeg();
          isStreaming = false;
          sendStatus('ERROR', { message: `FFmpeg execution error: ${err.message}` });
        });
      } catch (spawnErr: any) {
        console.warn(`[RTMP Bridge] Spawn error:`, spawnErr.message);
        cleanupFfmpeg();
        isStreaming = false;
        sendStatus('ERROR', { message: `Failed to spawn FFmpeg: ${spawnErr.message}` });
      }
    };

    sendStatus('READY', { message: 'Connected to RTMP Node Bridge. Awaiting stream configuration.' });

    ws.on('message', (data: any, isBinary: boolean) => {
      if (!isBinary) {
        try {
          const message = JSON.parse(data.toString());

          // ── WebRTC Wireless Phone Camera Signaling Handlers ──
          if (message.type === 'WEBRTC_JOIN') {
            const { room, role, phoneId = 'phone-1', deviceName = 'Wireless Phone' } = message;
            let r = webRtcRooms.get(room);
            if (!r) {
              r = { phones: new Map(), viewers: new Map(), isChatEnabled: true };
              webRtcRooms.set(room, r);
            }
            if (!r.phones) {
              r.phones = new Map();
            }
            if (!r.viewers) {
              r.viewers = new Map();
            }
            if (role === 'host') {
              r.hostWs = ws;
              console.log(`[WebRTC Signaling] Host registered for room "${room}". Active phones: ${r.phones.size}, Active viewers: ${r.viewers.size}`);
              // Immediately announce all currently active phones to the host
              for (const phone of r.phones.values()) {
                if (phone.ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'WEBRTC_PHONE_JOINED',
                    room,
                    phoneId: phone.id,
                    deviceName: phone.deviceName
                  }));
                }
              }
              // Send audience roster to host
              const viewerList = Array.from(r.viewers.values()).map(v => ({
                userId: v.userId,
                displayName: v.displayName,
                canRecord: v.canRecord,
                joinedAt: v.joinedAt
              }));
              ws.send(JSON.stringify({
                type: 'FELLOWSHIP_HOST_ROSTER_SYNC',
                room,
                viewers: viewerList,
                viewerCount: r.viewers.size,
                isChatEnabled: r.isChatEnabled !== false
              }));
            } else if (role === 'phone') {
              r.phoneWs = ws;
              r.phones.set(phoneId, { id: phoneId, ws, deviceName });
              console.log(`[WebRTC Signaling] Phone [${phoneId}] (${deviceName}) joined room "${room}". Total: ${r.phones.size}`);
              if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                r.hostWs.send(JSON.stringify({ type: 'WEBRTC_PHONE_JOINED', room, phoneId, deviceName }));
              }
            } else if (role === 'viewer') {
              const viewerId = message.userId || `LB-VIEWER-${Date.now().toString(36).toUpperCase()}`;
              const displayName = message.displayName || 'Fellow Believer';
              r.viewers.set(viewerId, {
                userId: viewerId,
                ws,
                displayName,
                canRecord: false,
                joinedAt: Date.now()
              });
              console.log(`[WebRTC Signaling] Viewer [${viewerId}] (${displayName}) joined room "${room}". Total viewers: ${r.viewers.size}`);
              
              // Sync room status to newly joined viewer
              ws.send(JSON.stringify({
                type: 'FELLOWSHIP_ROOM_SYNC',
                room,
                hostActive: !!r.hostWs,
                isChatEnabled: r.isChatEnabled !== false,
                viewerCount: r.viewers.size,
                canRecord: false
              }));

              // Notify host of new viewer
              if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                r.hostWs.send(JSON.stringify({
                  type: 'FELLOWSHIP_VIEWER_JOINED',
                  room,
                  userId: viewerId,
                  displayName,
                  viewerCount: r.viewers.size
                }));
              }
            }
            return;
          }

          if (message.type === 'WEBRTC_OFFER' || message.type === 'WEBRTC_ANSWER' || message.type === 'WEBRTC_ICE' || message.type === 'WEBRTC_PHONE_INFO' || message.type === 'WEBRTC_FLIP_CAMERA' || message.type === 'WEBRTC_PHONE_STANDBY') {
            const r = webRtcRooms.get(message.room);
            if (r) {
              if (ws === r.hostWs) {
                // Sent from host to phone
                if (message.phoneId && r.phones && r.phones.has(message.phoneId)) {
                  const targetPhone = r.phones.get(message.phoneId);
                  if (targetPhone && targetPhone.ws.readyState === WebSocket.OPEN) {
                    targetPhone.ws.send(JSON.stringify(message));
                  }
                } else if (r.phoneWs && r.phoneWs.readyState === WebSocket.OPEN) {
                  r.phoneWs.send(JSON.stringify(message));
                }
              } else {
                // Sent from phone to host
                if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                  r.hostWs.send(JSON.stringify(message));
                }
              }
            }
            return;
          }

          // ── WebRTC Broadcast to Viewers Signaling Handlers ──
          if (message.type === 'WEBRTC_VIEWER_OFFER' || message.type === 'WEBRTC_VIEWER_ANSWER' || message.type === 'WEBRTC_VIEWER_ICE') {
            const r = webRtcRooms.get(message.room);
            if (r) {
              if (ws === r.hostWs) {
                // Sent from host to a specific viewer
                if (message.viewerId && r.viewers && r.viewers.has(message.viewerId)) {
                  const targetViewer = r.viewers.get(message.viewerId);
                  if (targetViewer && targetViewer.ws.readyState === WebSocket.OPEN) {
                    targetViewer.ws.send(JSON.stringify(message));
                  }
                }
              } else {
                // Sent from viewer to host
                if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                  r.hostWs.send(JSON.stringify(message));
                }
              }
            }
            return;
          }

          // ── Fellowship Spiritual Interactions & Chat Relay ──
          if (message.type === 'FELLOWSHIP_CHAT_MSG') {
            const r = webRtcRooms.get(message.room);
            if (r) {
              // If chat is disabled and sender is not host, reject
              if (r.isChatEnabled === false && ws !== r.hostWs) {
                ws.send(JSON.stringify({ type: 'FELLOWSHIP_ERROR', message: 'The host has temporarily paused fellowship comments.' }));
                return;
              }
              const payload = JSON.stringify(message);
              // Send to host
              if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                r.hostWs.send(payload);
              }
              // Send to all viewers in room
              if (r.viewers) {
                for (const v of r.viewers.values()) {
                  if (v.ws.readyState === WebSocket.OPEN) {
                    v.ws.send(payload);
                  }
                }
              }
            }
            return;
          }

          // ── Host Moderation: Grant/Revoke Recording Permission ──
          if (message.type === 'FELLOWSHIP_PERMIT_RECORD') {
            const r = webRtcRooms.get(message.room);
            if (r && ws === r.hostWs) {
              const { targetUserId, canRecord } = message;
              if (r.viewers && r.viewers.has(targetUserId)) {
                const target = r.viewers.get(targetUserId)!;
                target.canRecord = !!canRecord;
                if (target.ws.readyState === WebSocket.OPEN) {
                  target.ws.send(JSON.stringify({
                    type: 'FELLOWSHIP_RECORDING_PERMISSION_UPDATED',
                    room: message.room,
                    canRecord: !!canRecord
                  }));
                }
                // Send updated roster to host
                const viewerList = Array.from(r.viewers.values()).map(v => ({
                  userId: v.userId,
                  displayName: v.displayName,
                  canRecord: v.canRecord,
                  joinedAt: v.joinedAt
                }));
                ws.send(JSON.stringify({
                  type: 'FELLOWSHIP_HOST_ROSTER_SYNC',
                  room: message.room,
                  viewers: viewerList,
                  viewerCount: r.viewers.size
                }));
              }
            }
            return;
          }

          // ── Host Moderation: Toggle Chat On/Off ──
          if (message.type === 'FELLOWSHIP_TOGGLE_CHAT') {
            const r = webRtcRooms.get(message.room);
            if (r && ws === r.hostWs) {
              r.isChatEnabled = !!message.isChatEnabled;
              const broadcast = JSON.stringify({
                type: 'FELLOWSHIP_CHAT_STATUS',
                room: message.room,
                isChatEnabled: r.isChatEnabled
              });
              if (r.viewers) {
                for (const v of r.viewers.values()) {
                  if (v.ws.readyState === WebSocket.OPEN) {
                    v.ws.send(broadcast);
                  }
                }
              }
            }
            return;
          }

          // ── Client-side diagnostic telemetry ──
          if (message.type === 'CLIENT_TELEMETRY') {
            console.log(`[RTMP Bridge Client Telemetry]:`, JSON.stringify(message));
            return;
          }

          // ── RTMP Broadcast Handlers ──
          if (message.type === 'START_STREAM') {
            const { rtmpUrl, streamKey, platform = 'custom', fps = 30, bitrate = '6000k' } = message;

            cleanupFfmpeg();
            activeConfig = { rtmpUrl, streamKey, platform, fps, bitrate };
            isStreaming = true;

            spawnFfmpeg();

            sendStatus('CONNECTING', {
              message: `Connecting to ${platform.toUpperCase()} RTMP ingestion endpoint...`,
              platform
            });
          } else if (message.type === 'STOP_STREAM') {
            activeConfig = null;
            isStreaming = false;
            cleanupFfmpeg();
            sendStatus('STOPPED', { message: 'Stream stopped by user.' });
          }
        } catch (jsonErr: any) {
          console.warn(`[RTMP Bridge] Message error:`, jsonErr.message);
        }
      } else {
        // Binary WebM chunk from browser MediaRecorder — pass directly to FFmpeg stdin with backpressure protection
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        totalBinaryBytes += buffer.length;

        const now = Date.now();
        if (now - lastBinaryLogTime >= 5000) {
          lastBinaryLogTime = now;
          console.log(`[RTMP Bridge] Ingestion heartbeat: chunk size ${buffer.length} bytes (total ~${(totalBinaryBytes / (1024 * 1024)).toFixed(2)} MB) | streaming=${isStreaming} | paused=${isSocketPaused}`);
        }

        if (isStreaming && ffmpegProcess && ffmpegProcess.stdin && ffmpegProcess.stdin.writable) {
          try {
            if (buffer.length > 0) {
              const ok = ffmpegProcess.stdin.write(buffer);
              if (!ok && !isSocketPaused) {
                // Backpressure protection: FFmpeg stdin pipe buffer is full!
                // Pause receiving from the client at the TCP level so Node.js memory does not accumulate unwritten chunks.
                isSocketPaused = true;
                console.warn('[RTMP Bridge] Backpressure detected — pausing WebSocket ingestion until FFmpeg stdin drains');
                try {
                  ws.pause();
                } catch {}

                ffmpegProcess.stdin.once('drain', () => {
                  isSocketPaused = false;
                  console.log('[RTMP Bridge] FFmpeg stdin drained — resuming WebSocket ingestion');
                  try {
                    ws.resume();
                  } catch {}
                });
              }
            }
          } catch (bufErr: any) {
            console.warn('[RTMP Bridge] Binary write catch:', bufErr.message);
          }
        }
      }
    });

    ws.on('close', () => {
      activeConfig = null;
      isStreaming = false;
      cleanupFfmpeg();

      // Clean up WebRTC signaling registration
      for (const [roomId, r] of webRtcRooms.entries()) {
        if (r.hostWs === ws) {
          r.hostWs = undefined;
          if (r.phones) {
            for (const phone of r.phones.values()) {
              if (phone.ws.readyState === WebSocket.OPEN) {
                phone.ws.send(JSON.stringify({ type: 'WEBRTC_HOST_DISCONNECTED', room: roomId }));
              }
            }
          }
          if (r.viewers) {
            for (const viewer of r.viewers.values()) {
              if (viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({ type: 'WEBRTC_HOST_DISCONNECTED', room: roomId }));
              }
            }
          }
          if (r.phoneWs && r.phoneWs.readyState === WebSocket.OPEN) {
            r.phoneWs.send(JSON.stringify({ type: 'WEBRTC_HOST_DISCONNECTED', room: roomId }));
          }
        } else {
          // Check if this ws belongs to a registered phone in r.phones
          if (r.phones) {
            for (const [phoneId, phone] of r.phones.entries()) {
              if (phone.ws === ws) {
                r.phones.delete(phoneId);
                console.log(`[WebRTC Signaling] Phone [${phoneId}] disconnected from room "${roomId}". Remaining: ${r.phones.size}`);
                if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                  r.hostWs.send(JSON.stringify({ type: 'WEBRTC_PHONE_DISCONNECTED', room: roomId, phoneId }));
                }
                break;
              }
            }
          }
          // Check if this ws belongs to a registered viewer in r.viewers
          if (r.viewers) {
            for (const [viewerId, viewer] of r.viewers.entries()) {
              if (viewer.ws === ws) {
                r.viewers.delete(viewerId);
                console.log(`[WebRTC Signaling] Viewer [${viewerId}] disconnected from room "${roomId}". Remaining viewers: ${r.viewers.size}`);
                if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
                  r.hostWs.send(JSON.stringify({
                    type: 'FELLOWSHIP_VIEWER_LEFT',
                    room: roomId,
                    userId: viewerId,
                    viewerCount: r.viewers.size
                  }));
                }
                break;
              }
            }
          }
          if (r.phoneWs === ws) {
            r.phoneWs = undefined;
            if (r.hostWs && r.hostWs.readyState === WebSocket.OPEN) {
              r.hostWs.send(JSON.stringify({ type: 'WEBRTC_PHONE_DISCONNECTED', room: roomId }));
            }
          }
        }
        if (!r.hostWs && (!r.phones || r.phones.size === 0) && (!r.viewers || r.viewers.size === 0) && !r.phoneWs) {
          webRtcRooms.delete(roomId);
        }
      }
    });
  };

  wss.on('connection', handleConnection);
  if (wssSecure) {
    wssSecure.on('connection', handleConnection);
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[RTMP Bridge] Port ${wsPort} is already in use (bridge active).`);
    } else {
      console.warn(`[RTMP Bridge] Server error:`, err.message);
    }
  });

  server.listen(wsPort, '0.0.0.0', () => {
    console.log(`[LogosBridge RTMP Bridge] Running on ws://localhost:${wsPort}`);
  });

  return { server, wss };
}
