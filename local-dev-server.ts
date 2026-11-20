import app from './server.ts';
import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import selfsigned from 'selfsigned';
import { startRtmpBridge } from './src/utils/rtmpBridge.ts';
import { WebSocket as WsBridgeClient, WebSocketServer as WsBridgeServer } from 'ws';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HTTPS_PORT = 3443;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const viteModule = await import('vite');
    const vite = await viteModule.createServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/android/**', '**/dist/**', '**/dist-electron/**', '**/release/**', '**/.git/**']
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    // Serve public and root static assets directly
    app.use(express.static(path.resolve(process.cwd(), 'public')));
    app.use(express.static(process.cwd()));

    // Dynamic Vite HTML transform middleware
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl.split('?')[0];
      if (url.startsWith('/api')) {
        return next();
      }
      // If a specific HTML file exists in public/ or root, serve it directly
      const publicHtml = path.resolve(process.cwd(), 'public', url.replace(/^\//, ''));
      if (fs.existsSync(publicHtml) && fs.statSync(publicHtml).isFile()) {
        return res.sendFile(publicHtml);
      }
      const rootHtml = path.resolve(process.cwd(), url.replace(/^\//, ''));
      if (fs.existsSync(rootHtml) && fs.statSync(rootHtml).isFile()) {
        return res.sendFile(rootHtml);
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const appServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LogosBridge Server] Running on http://0.0.0.0:${PORT} (IPv4 & IPv6) and http://127.0.0.1:${PORT}`);
  });
  appServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[LogosBridge Server] Port ${PORT} is already in use by another instance or service.`);
    } else {
      console.error('[LogosBridge Server] Server error:', err.message);
    }
  });

  // Attach unified root WebSocket server directly to main HTTP server (for Cloud proxies like Railway/Render)
  const unifiedBridgeWss = new WsBridgeServer({ server: appServer });
  unifiedBridgeWss.on('connection', (clientWs: InstanceType<typeof WsBridgeClient>) => {
    const upstream = new WsBridgeClient('ws://127.0.0.1:8080');
    let upstreamReady = false;
    const buffered: { data: any; isBinary: boolean }[] = [];

    upstream.on('open', () => {
      upstreamReady = true;
      for (const msg of buffered) {
        upstream.send(msg.data, { binary: msg.isBinary });
      }
      buffered.length = 0;
    });

    clientWs.on('message', (data: any, isBinary: boolean) => {
      if (upstreamReady && upstream.readyState === WsBridgeClient.OPEN) {
        upstream.send(data, { binary: isBinary });
      } else {
        buffered.push({ data, isBinary });
      }
    });

    upstream.on('message', (data: any, isBinary: boolean) => {
      if (clientWs.readyState === WsBridgeClient.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    const cleanup = () => {
      try { upstream.close(); } catch {}
      try { clientWs.close(); } catch {}
    };
    clientWs.on('close', cleanup);
    upstream.on('close', cleanup);
    clientWs.on('error', cleanup);
    upstream.on('error', cleanup);
  });

  // Generate local network SSL certificate for secure mobile camera access
  let sslCert: { key: string; cert: string } | null = null;
  try {
    const pems = await selfsigned.generate([{ name: 'commonName', value: 'LogosBridge Local' }], { keySize: 2048, algorithm: 'sha256' });
    sslCert = { key: pems.private, cert: pems.cert };
    const secureHttpsServer = https.createServer(sslCert, app);
    secureHttpsServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[LogosBridge Server] HTTPS Port ${HTTPS_PORT} is already in use.`);
      } else {
        console.warn('[LogosBridge Server] HTTPS server error:', err.message);
      }
    });
    secureHttpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`[LogosBridge Server] Secure HTTPS Running on https://localhost:${HTTPS_PORT} and https://127.0.0.1:${HTTPS_PORT}`);
    });

    // WebSocket proxy: phone cameras connect via trusted WSS on same HTTPS port (3443),
    // transparently proxied to the RTMP bridge on WS:8080 — avoids self-signed cert rejection on port 8443
    const bridgeProxyWss = new WsBridgeServer({ server: secureHttpsServer });
    bridgeProxyWss.on('connection', (clientWs: InstanceType<typeof WsBridgeClient>) => {
      const upstream = new WsBridgeClient('ws://127.0.0.1:8080');
      let upstreamReady = false;
      const buffered: { data: any; isBinary: boolean }[] = [];

      upstream.on('open', () => {
        upstreamReady = true;
        for (const msg of buffered) {
          upstream.send(msg.data, { binary: msg.isBinary });
        }
        buffered.length = 0;
      });

      clientWs.on('message', (data: any, isBinary: boolean) => {
        if (upstreamReady && upstream.readyState === WsBridgeClient.OPEN) {
          upstream.send(data, { binary: isBinary });
        } else {
          buffered.push({ data, isBinary });
        }
      });

      upstream.on('message', (data: any, isBinary: boolean) => {
        if (clientWs.readyState === WsBridgeClient.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      });

      const cleanup = () => {
        try { upstream.close(); } catch {}
        try { clientWs.close(); } catch {}
      };
      clientWs.on('close', cleanup);
      upstream.on('close', cleanup);
      clientWs.on('error', cleanup);
      upstream.on('error', cleanup);
    });
  } catch (sslErr: any) {
    console.warn('[LogosBridge Server] Local SSL certificate initialization error:', sslErr.message);
  }

  // Also support Vite default port 5173 by redirecting to PORT 3000
  try {
    const http = await import('http');
    const helperServer = http.createServer((req, res) => {
      res.writeHead(302, { Location: `http://localhost:${PORT}${req.url || ''}` });
      res.end();
    });
    helperServer.on('error', () => {
      // Optional helper port, silently continue if 5173 is already taken
    });
    helperServer.listen(5173, () => {
      console.log(`[LogosBridge Helper] Port 5173 redirecting to http://localhost:${PORT}`);
    });
  } catch (e: any) {
    // Optional helper port
  }

  // Start integrated WebSocket RTMP bridge for Live Studio with WSS support
  try {
    startRtmpBridge(8080, sslCert ? { key: sslCert.key, cert: sslCert.cert } : undefined, 8443);
  } catch (bridgeErr: any) {
    console.warn('[LogosBridge Server] RTMP bridge initialization:', bridgeErr.message);
  }
}

startServer();
