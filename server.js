import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import httpProxy from 'http-proxy';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();
import cookieParser from 'cookie-parser';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  // Initialize standalone Socket.io server on port 3001
  const socketHttpServer = createServer();
  const io = new Server(socketHttpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket.io client connected on port 3001:', socket.id);

    // Dynamic user presence
    socket.on('user_status_changed', (data) => {
      socket.broadcast.emit('user_status_changed', data);
    });

    // Real-time typing indicators
    socket.on('typing_start', (data) => {
      socket.broadcast.emit('typing_start', data);
    });

    socket.on('typing_stop', (data) => {
      socket.broadcast.emit('typing_stop', data);
    });

    // Direct message / channel broadcast
    socket.on('send_message', (data) => {
      io.emit('receive_message', data);
    });

    // Message read receipts
    socket.on('message_read', (data) => {
      socket.broadcast.emit('message_read', data);
    });

    socket.on('disconnect', () => {
      console.log('Socket.io client disconnected:', socket.id);
    });
  });

  socketHttpServer.listen(3001, '0.0.0.0', () => {
    console.log('Standalone Socket.io server running on port 3001');
  });

  // Create Reverse Proxy for standardizing single-port architecture
  const proxy = httpProxy.createProxyServer({});
  proxy.on('error', (err, req, res) => {
    console.error('Proxy routing exception:', err);
    if (res && !res.headersSent && typeof res.writeHead === 'function') {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy communication failure: ' + err.message);
    }
  });

  // Cookie parsing middleware
  app.use(cookieParser());

  // Intercept Auth: login with password
  app.post('/pb_api/api/collections/users/auth-with-password', express.json(), async (req, res) => {
    try {
      const response = await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.cookie('pb_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      // Return a non-sensitive JWT format dummy token to avoid leaking actual JWT
      const dummyHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const dummyPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, id: data.record.id })).toString("base64url");
      const dummyToken = `${dummyHeader}.${dummyPayload}.`;
      res.json({ ...data, token: dummyToken });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Intercept Auth: token refresh
  app.post('/pb_api/api/collections/users/auth-refresh', express.json(), async (req, res) => {
    try {
      const token = req.cookies?.pb_token;
      const response = await fetch('http://127.0.0.1:8090/api/collections/users/auth-refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.cookie('pb_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      const dummyHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const dummyPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, id: data.record.id })).toString("base64url");
      const dummyToken = `${dummyHeader}.${dummyPayload}.`;
      res.json({ ...data, token: dummyToken });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Intercept Auth: login with oauth2
  app.post('/pb_api/api/collections/users/auth-with-oauth2', express.json(), async (req, res) => {
    try {
      const response = await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-oauth2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.cookie('pb_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      const dummyHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const dummyPayload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, id: data.record.id })).toString("base64url");
      const dummyToken = `${dummyHeader}.${dummyPayload}.`;
      res.json({ ...data, token: dummyToken });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Custom session verification route for page loads/refresh
  app.get('/api/auth/session', async (req, res) => {
    const token = req.cookies?.pb_token;
    if (!token) {
      return res.json({ authenticated: false });
    }
    try {
      const response = await fetch('http://127.0.0.1:8090/api/collections/users/auth-refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      const data = await response.json();
      if (!response.ok) {
        res.clearCookie('pb_token', { path: '/' });
        return res.json({ authenticated: false });
      }
      res.cookie('pb_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      res.json({ authenticated: true, record: data.record });
    } catch (err) {
      res.json({ authenticated: false });
    }
  });

  // Custom logout route to clear cookies
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('pb_token', { path: '/' });
    res.json({ success: true });
  });

  // Proxy Endpoint: Route pb_api requests to background PocketBase
  app.all('/pb_api/{*splat}', (req, res) => {
    const proxyToken = req.cookies?.pb_token;
    if (proxyToken) {
      req.headers.authorization = `Bearer ${proxyToken}`;
    }
    req.url = req.url.replace('/pb_api', '');
    proxy.web(req, res, { target: 'http://127.0.0.1:8090' });
  });

  // Proxy Endpoint: Route socket.io transport to standalone 3001 instance
  app.all('/socket.io/{*splat}', (req, res) => {
    proxy.web(req, res, { target: 'http://localhost:3001', ws: true });
  });

  // Middleware for parsing JSON requests in local Express routes
  app.use(express.json());

  // Google Gemini API Chatbot router
  app.post('/api/gemini/chat', async (req, res) => {
    const { message } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined in the workspace settings." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `
        You are Morgana (codenamed Mona), the mysterious cat-like phantom thief from Persona 5.
        You are highly helpful, energetic, sassy, and deeply passionate about justice, cafe coffee, steals, and your crew.
        Always answer in character as Morgana! Keep replies punchy, stylish, and witty. Show interest in treasure, palaces, and coffee.
      `;

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction,
          temperature: 0.9,
        }
      });

      const response = await chat.sendMessage({ message });
      const replyText = response && response.text ? String(response.text).trim() : "Ren, I'm having trouble replying right now — let's try again in a moment!";
      res.json({ reply: replyText });
    } catch (err) {
      console.error('Gemini processing error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Client Assets mounting & dev server lifecycle
  if (process.env.NODE_ENV !== "production") {
    console.log("Embedding Vite Developer environment into port 3000 ingress...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving pre-compiled production assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Establish single PORT listener and bind WebSocket Upgrade tunnels
  const mainServer = httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`PhantomChat Core Proxy Gateway active on port ${PORT}`);
  });

  mainServer.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/socket.io')) {
      proxy.ws(req, socket, head, { target: 'http://127.0.0.1:3001' });
    } else if (req.url.startsWith('/pb_api')) {
      req.url = req.url.replace('/pb_api', '');
      proxy.ws(req, socket, head, { target: 'http://127.0.0.1:8090' });
    }
  });
}

startServer().catch((err) => {
  console.error("Fatal startup error in core server:", err);
});
