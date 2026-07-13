import { useEffect, useState, useRef } from "react";
import { pb, socket } from "../services/backend.js";
import { useAuth } from "../context/AuthContext";

export function useMessages(activeChatId, chatType) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const msgsRef = useRef([]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    if (!pb) {
      console.warn('PocketBase client not available');
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    const loadMessages = async () => {
      try {
        const filter = `roomId = \"${activeChatId}\"`;
        // getFullList is fine for small chats; switch to getList/pagination if needed
        const list = await pb.collection('messages').getFullList({ filter, sort: 'created', requestKey: null });
        if (!mounted) return;
        // Map PocketBase records to a consistent shape
        const mapped = list.map((r) => ({
          id: r.id,
          text: r.text || '',
          imageData: r.imageData || null,
          audioData: r.audioData || null,
          senderId: r.senderId || null,
          senderName: r.senderName || null,
          createdAt: r.created,
          type: r.type || 'text',
          replyTo: r.replyTo || null,
        }));
        msgsRef.current = mapped;
        setMessages(mapped);
      } catch (err) {
        console.error('Failed to load messages from PocketBase', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMessages();

    // PocketBase realtime subscription — update local list on create/update/delete
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
            senderId: rec.senderId || null,
            senderName: rec.senderName || null,
            roomId: rec.roomId || null,
            createdAt: rec.created,
            type: rec.type || 'text',
            replyTo: rec.replyTo || null,
          };
          // avoid duplicates
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

    // Socket.io live updates (hybrid): listen for instant messages
    const socketHandler = (data) => {
      try {
        if (!data) return;
        if (data.roomId !== activeChatId) return;
        // Avoid duplicate if already present
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

  // sendMessage: save to PocketBase and emit via socket for instant delivery
  const sendMessage = async ({ text, imageData = null, audioData = null, type = 'text', replyTo = null }) => {
    if (!activeChatId || !pb) return null;
    try {
      const payload = {
        roomId: activeChatId,
        text: text || (imageData ? '📷 Image' : audioData ? '🎤 Voice message' : ''),
        senderId: user?.id || user?.uid || null,
        senderName: user?.displayName || user?.name || user?.email || null,
        imageData: imageData || null,
        audioData: audioData || null,
        type,
        replyTo: replyTo || null,
      };

      // create in PocketBase
      const created = await pb.collection('messages').create(payload);

      const msg = {
        id: created.id,
        text: created.text,
        imageData: created.imageData || null,
        audioData: created.audioData || null,
        senderId: created.senderId || null,
        senderName: created.senderName || null,
        roomId: created.roomId || null,
        createdAt: created.created,
        type: created.type || type,
        replyTo: created.replyTo || null,
      };

      // emit via socket for immediate broadcast
      try {
        if (socket && socket.emit) socket.emit('send_message', msg);
      } catch (err) {
        console.warn('Socket emit failed', err);
      }

      // update local state optimistically
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
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return await sendMessage({ text: textFallback, audioData: dataUrl, type: 'voice' });
    } catch (err) {
      console.error('Failed to send voice message', err);
      throw err;
    }
  };

  return { messages, loading, sendMessage, sendVoiceMessage };
}