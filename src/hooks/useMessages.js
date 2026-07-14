import { useEffect, useState, useRef } from "react";
import { pb, socket } from "../services/backend.js";
import { useAuth } from "../context/AuthContext";

export function useMessages(activeChatId, chatType) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useAuth();
  const msgsRef = useRef([]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    const loadMessages = async () => {
      // 1. Check if AI Chatbot context
      if (activeChatId === 'mona_ai') {
        const saved = localStorage.getItem('messages_mona_ai');
        const list = saved ? JSON.parse(saved) : [
          {
            id: 'mona_welcome',
            text: "Hey there! I'm Morgana (Mona), the core helper of PhantomChat! Ask me anything about Palaces, calling cards, brewing coffee at LeBlanc, or getting answers directly from the Gemini API!",
            senderId: 'mona_ai',
            senderName: 'Mona AI',
            createdAt: new Date().toISOString(),
            type: 'text',
          }
        ];
        msgsRef.current = list;
        setMessages(list);
        setLoading(false);
        return;
      }

      if (!pb) {
        console.warn('PocketBase client not available');
        setLoading(false);
        return;
      }

      try {
        const filter = `roomId = "${activeChatId}"`;
        // Fetch page 1 (50 latest messages) sorted in descending order of creation (newest first)
        const result = await pb.collection('messages').getList(1, 50, { filter, sort: '-created', requestKey: null });
        if (!mounted) return;
        
        // Reverse them so they render chronologically
        const mapped = [...result.items].reverse().map((r) => ({
          id: r.id,
          text: r.text || '',
          imageData: r.imageData || null,
          audioData: r.audioData || null,
          audioUrl: r.audioData ? `${pb.baseUrl}/api/files/${r.collectionId || 'messages'}/${r.id}/${r.audioData}` : null,
          senderId: r.senderId || null,
          senderName: r.senderName || null,
          createdAt: r.created,
          type: r.type || 'text',
          replyTo: r.replyTo || null,
        }));
        msgsRef.current = mapped;
        setMessages(mapped);
        setPage(1);
        setHasMore(1 < result.totalPages);
      } catch (err) {
        console.error('Failed to load messages from PocketBase', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMessages();

    if (activeChatId === 'mona_ai') return; // Skip PocketBase subscription for AI

    // PocketBase realtime subscription
    let pbUnsub = null;
    try {
      pbUnsub = pb.collection('messages').subscribe('*', (e) => {
        const rec = e.record;
        if (!rec) return;
        if (rec.roomId !== activeChatId) return;

        if (e.action === 'create') {
          const newMsg = {
            id: rec.id,
            text: rec.text || '',
            imageData: rec.imageData || null,
            audioData: rec.audioData || null,
            audioUrl: rec.audioData ? `${pb.baseUrl}/api/files/${rec.collectionId || 'messages'}/${rec.id}/${rec.audioData}` : null,
            senderId: rec.senderId || null,
            senderName: rec.senderName || null,
            roomId: rec.roomId || null,
            createdAt: rec.created,
            type: rec.type || 'text',
            replyTo: rec.replyTo || null,
          };
          if (!msgsRef.current.find((m) => m.id === newMsg.id)) {
            msgsRef.current = [...msgsRef.current, newMsg];
            setMessages(msgsRef.current.slice());
          }
        } else if (e.action === 'update') {
          msgsRef.current = msgsRef.current.map((m) => (m.id === rec.id ? { ...m, ...rec } : m));
          setMessages(msgsRef.current.slice());
        } else if (e.action === 'delete') {
          msgsRef.current = msgsRef.current.filter((m) => m.id !== rec.id);
          setMessages(msgsRef.current.slice());
        }
      });
    } catch (err) {
      console.warn('PocketBase subscribe failed', err);
    }

    // Socket.io live updates
    const socketHandler = (data) => {
      try {
        if (!data) return;
        if (data.roomId !== activeChatId) return;
        if (msgsRef.current.find((m) => m.id === data.id)) return;
        msgsRef.current = [...msgsRef.current, data];
        setMessages(msgsRef.current.slice());
      } catch (err) {
        console.error('socket message handler error', err);
      }
    };

    try {
      if (socket && socket.on) socket.on('receive_message', socketHandler);
    } catch (err) {
      console.warn('Socket attach failed', err);
    }

    return () => {
      mounted = false;
      try {
        if (pbUnsub) {
          if (typeof pbUnsub === 'function') pbUnsub();
          else if (pbUnsub.unsubscribe) pbUnsub.unsubscribe();
        }
      } catch (e) {}
      try {
        if (socket && socket.off) socket.off('receive_message', socketHandler);
      } catch (e) {}
    };
  }, [activeChatId, chatType]);

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || activeChatId === 'mona_ai') return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const filter = `roomId = "${activeChatId}"`;
      const result = await pb.collection('messages').getList(nextPage, 50, { filter, sort: '-created', requestKey: null });
      
      const mapped = [...result.items].reverse().map((r) => ({
        id: r.id,
        text: r.text || '',
        imageData: r.imageData || null,
        audioData: r.audioData || null,
        audioUrl: r.audioData ? `${pb.baseUrl}/api/files/${r.collectionId || 'messages'}/${r.id}/${r.audioData}` : null,
        senderId: r.senderId || null,
        senderName: r.senderName || null,
        createdAt: r.created,
        type: r.type || 'text',
        replyTo: r.replyTo || null,
      }));

      msgsRef.current = [...mapped, ...msgsRef.current];
      setMessages(msgsRef.current.slice());
      setPage(nextPage);
      setHasMore(nextPage < result.totalPages);
    } catch (err) {
      console.error('Failed to load more messages', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const sendMessage = async ({ text, imageData = null, audioFile = null, type = 'text', replyTo = null }) => {
    if (!activeChatId) return null;

    // AI Agent handler
    if (activeChatId === 'mona_ai') {
      const userMsg = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        text,
        senderId: user?.id || 'ren_user',
        senderName: user?.username || 'Ren',
        createdAt: new Date().toISOString(),
        type: 'text',
      };

      const withUser = [...msgsRef.current, userMsg];
      msgsRef.current = withUser;
      setMessages(withUser);
      localStorage.setItem('messages_mona_ai', JSON.stringify(withUser));

      // Mock typewriter status
      if (socket && socket.emit) {
        socket.emit('typing_start', { roomId: 'mona_ai', userId: 'mona_ai', username: 'Mona' });
      }

      try {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await response.json();

        const botMsg = {
          id: 'mona_' + Math.random().toString(36).substr(2, 9),
          text: data.reply || "Ren, I had some network interference. Let's try again!",
          senderId: 'mona_ai',
          senderName: 'Mona AI',
          createdAt: new Date().toISOString(),
          type: 'text',
        };

        const withBot = [...msgsRef.current, botMsg];
        msgsRef.current = withBot;
        setMessages(withBot);
        localStorage.setItem('messages_mona_ai', JSON.stringify(withBot));
      } catch (err) {
        console.error('AI response failure:', err);
      } finally {
        if (socket && socket.emit) {
          socket.emit('typing_stop', { roomId: 'mona_ai', userId: 'mona_ai' });
        }
      }
      return userMsg;
    }

    if (!pb) return null;

    try {
      const formData = new FormData();
      formData.append('roomId', activeChatId);
      formData.append('text', text || (imageData ? '📷 Image' : audioFile ? '🎤 Voice message' : ''));
      formData.append('senderId', user?.id || user?.uid || '');
      formData.append('senderName', user?.displayName || user?.name || user?.email || '');
      formData.append('type', type);
      if (replyTo) {
        formData.append('replyTo', JSON.stringify(replyTo));
      }
      if (imageData) {
        formData.append('imageData', imageData);
      }
      if (audioFile) {
        formData.append('audioData', audioFile, 'voice-message.webm');
      }

      const created = await pb.collection('messages').create(formData);

      const msg = {
        id: created.id,
        text: created.text,
        imageData: created.imageData || null,
        audioData: created.audioData || null,
        audioUrl: created.audioData ? `${pb.baseUrl}/api/files/${created.collectionId || 'messages'}/${created.id}/${created.audioData}` : null,
        senderId: created.senderId || null,
        senderName: created.senderName || null,
        roomId: created.roomId || null,
        createdAt: created.created,
        type: created.type || type,
        replyTo: created.replyTo || null,
      };

      try {
        if (socket && socket.emit) socket.emit('send_message', msg);
      } catch (err) {
        console.warn('Socket emit failed', err);
      }

      if (!msgsRef.current.find((m) => m.id === msg.id)) {
        msgsRef.current = [...msgsRef.current, msg];
        setMessages(msgsRef.current.slice());
      }

      return msg;
    } catch (err) {
      console.error('Failed to send message', err);
      throw err;
    }
  };

  const sendVoiceMessage = async (blob, textFallback = '🎤 Voice message') => {
    if (!blob) return null;
    return await sendMessage({ text: textFallback, audioFile: blob, type: 'voice' });
  };

  return { messages, loading, sendMessage, sendVoiceMessage, loadMoreMessages, hasMore, loadingMore };
}
