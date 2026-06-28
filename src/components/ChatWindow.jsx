import { useMessages } from "../hooks/useMessages";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, Phone, MoreHorizontal, CheckCheck } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { playMessageSound } from "../utils/sounds";

function ChatWindow({ activeChat, setShowPanel, showPanel }) {
  const { messages, loading } = useMessages(activeChat?.id, activeChat?.type);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleReact = async (msgId, emoji) => {
  const msgRef = doc(db, activeChat.type, activeChat.id, "messages", msgId);
  const msgSnap = await getDoc(msgRef);
  if (!msgSnap.exists()) return;

  const reactions = msgSnap.data().reactions || {};
  
  // Find if user already reacted with ANY emoji
  const previousEmoji = Object.keys(reactions).find(
    (e) => reactions[e]?.includes(user.uid)
  );

  const updates = {};

  // Remove from previous emoji if different
  if (previousEmoji && previousEmoji !== emoji) {
    updates[`reactions.${previousEmoji}`] = reactions[previousEmoji].filter(
      (uid) => uid !== user.uid
    );
  }

  // Toggle current emoji
  const currentUsers = reactions[emoji] || [];
  const alreadyReacted = currentUsers.includes(user.uid);

  if (alreadyReacted) {
    // Remove reaction
    updates[`reactions.${emoji}`] = currentUsers.filter(
      (uid) => uid !== user.uid
    );
  } else if (!previousEmoji || previousEmoji !== emoji) {
    // Add reaction only if not switching to same
    updates[`reactions.${emoji}`] = [...currentUsers, user.uid];
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(msgRef, updates);
  }
  };

  // Track previous message count
  const prevCountRef = useRef(0);

  // Notify on new messages with sound
  useEffect(() => {
  if (messages.length > prevCountRef.current && prevCountRef.current !== 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.uid !== user?.uid) {
      playMessageSound();
    }
  }
  prevCountRef.current = messages.length;
  }, [messages]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="ch-av">
          {activeChat.type === "dms" ? "💬" : "🌐"}
        </div>
        <div className="ch-info">
          <div className="ch-name">{activeChat.name}</div>
          <div className="ch-sub">
            {activeChat.type === "rooms" ? "Public Room" : "Direct Message"}
          </div>
        </div>
        <div className="ch-actions">
          <button className="ch-btn" title="Search">
            <Search size={18} />
          </button>
          <button className="ch-btn" title="Call">
            <Phone size={18} />
          </button>
          <button
            className={`ch-btn ${showPanel ? "active" : ""}`}
            onClick={() => setShowPanel(!showPanel)}
            title="Info"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="msgs-container">
        {loading ? (
          <div className="msgs-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="msgs-empty">
            <span>👋</span>
            <p>No messages yet — say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.uid === user?.uid;
            const initial = (msg.authorName || "?")?.[0]?.toUpperCase();
            return (
                  <div key={msg.id} className={`msg ${isOwn ? "own" : "other"}`}>
                    <div className={`msg-av ${isOwn ? "own" : ""}`}>
                      {initial}
                    </div>
                    <div className="msg-body">
                      {!isOwn && (
                        <div className="msg-name">{msg.authorName}</div>
                      )}
                      <div className="bubble-wrap">
                        <div className={`bubble ${isOwn ? "own" : ""}`}>
                          {msg.text}
                        </div>
                        <div className="reaction-picker">
                          {["❤️","😂","👍","🔥","😮","😢"].map((emoji) => (
                            <button
                              key={emoji}
                              className="reaction-emoji-btn"
                              onClick={() => handleReact(msg.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="reactions-row">
                          {Object.entries(msg.reactions).map(([emoji, users]) =>
                            users.length > 0 ? (
                              <button
                                key={emoji}
                                className={`reaction-badge ${users.includes(user?.uid) ? "reacted" : ""}`}
                                onClick={() => handleReact(msg.id, emoji)}
                              >
                                {emoji} <span>{users.length}</span>
                              </button>
                            ) : null
                          )}
                        </div>
                      )}
                      <div className="msg-footer">
                        <span className="msg-time">{formatTime(msg.createdAt)}</span>
                        {isOwn && (
                          <CheckCheck size={14} className="msg-tick" strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                  </div>
                );
            })
          )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatWindow;