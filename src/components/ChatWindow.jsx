import { useMessages } from "../hooks/useMessages";
import { useEffect, useRef, useState  } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, Phone, MoreHorizontal, Check, CheckCheck, Reply, Forward, Pin, Trash2  } from "lucide-react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { playMessageSound } from "../utils/sounds";

// TickIcon component for message status
function TickIcon({ status }) {
  if (status === "read") {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" className="tick tick-read">
        <path d="M11.071.653a.45.45 0 0 0-.637 0L4.982 6.105 2.566 3.689a.45.45 0 0 0-.636.636l2.734 2.734a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
        <path d="M15.071.653a.45.45 0 0 0-.637 0L8.982 6.105l-.9-.9a.45.45 0 0 0-.636.636l1.218 1.218a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" className="tick tick-delivered">
        <path d="M11.071.653a.45.45 0 0 0-.637 0L4.982 6.105 2.566 3.689a.45.45 0 0 0-.636.636l2.734 2.734a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
        <path d="M15.071.653a.45.45 0 0 0-.637 0L8.982 6.105l-.9-.9a.45.45 0 0 0-.636.636l1.218 1.218a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
      </svg>
    );
  }
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" className="tick tick-sent">
      <path d="M9.071.653a.45.45 0 0 0-.637 0L2.982 6.105.566 3.689a.45.45 0 0 0-.636.636l2.734 2.734a.45.45 0 0 0 .636 0L9.071 1.29a.45.45 0 0 0 0-.637z"/>
    </svg>
  );
}

// Refactored MessageStatus for High Visibility & Sharp Look
export function MessageStatus({ status }) {
  if (status === "sent") {
    // Single bright grey tick for sent
    return <Check size={14} className="text-gray-300 stroke-[2.5]" />;
  }
  
  if (status === "delivered") {
    // Double light grey ticks for delivered but unread
    return <CheckCheck size={14} className="text-gray-400 stroke-[2.5]" />;
  }
  
  if (status === "read") {
    // High-visibility crisp cyan color for read/seen messages
    return <CheckCheck size={14} className="text-cyan-400 dark:text-cyan-400 stroke-[2.5]" />;
  }

  // Fallback default look if status field is missing in old database records
  return <CheckCheck size={14} className="text-cyan-400 stroke-[2.5]" />;
}

function ChatWindow({ activeChat, setShowPanel, showPanel }) {
  const { messages, loading } = useMessages(activeChat?.id, activeChat?.type);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
// contextMenu = { msgId, x, y, isOwn }

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
    
    const previousEmoji = Object.keys(reactions).find(
      (e) => reactions[e]?.includes(user.uid)
    );

    const updates = {};

    if (previousEmoji && previousEmoji !== emoji) {
      updates[`reactions.${previousEmoji}`] = reactions[previousEmoji].filter(
        (uid) => uid !== user.uid
      );
    }

    const currentUsers = reactions[emoji] || [];
    const alreadyReacted = currentUsers.includes(user.uid);

    if (alreadyReacted) {
      updates[`reactions.${emoji}`] = currentUsers.filter(
        (uid) => uid !== user.uid
      );
    } else if (!previousEmoji || previousEmoji !== emoji) {
      updates[`reactions.${emoji}`] = [...currentUsers, user.uid];
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(msgRef, updates);
    }
  };

  // Right-click context menu for message actions
  const handleRightClick = (e, msg, isOwn) => {
  e.preventDefault();
  setContextMenu({
    msgId: msg.id,
    msg,
    x: e.clientX,
    y: e.clientY,
    isOwn,
  });
  };

  // Close context menu when clicking outside
  const closeContext = () => setContextMenu(null);

  // Delete message function
  const handleDelete = async (msgId) => {
    await deleteDoc(doc(db, activeChat.type, activeChat.id, "messages", msgId));
    closeContext();
  };

  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevCountRef.current && prevCountRef.current !== 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.uid !== user?.uid) {
        playMessageSound();
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, user?.uid]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="ch-av">
          {activeChat?.type === "dms" ? "💬" : "🌐"}
        </div>
        <div className="ch-info">
          <div className="ch-name">{activeChat?.name}</div>
          <div className="ch-sub">
            {activeChat?.type === "rooms" ? "Public Room" : "Direct Message"}
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
              <div key={msg.id} className={`msg ${isOwn ? "own" : "other"}`}
                 onContextMenu={(e) => handleRightClick(e, msg, isOwn)}>

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
                  
                  {/* Clean Flex Layout for Perfect Alignment */}
                  <div className="msg-footer">
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    {isOwn && (
                      <span className="msg-ticks">
                        <TickIcon status={msg.status || "sent"} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {contextMenu && (
          <>
            <div className="context-overlay" onClick={closeContext} />
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button className="ctx-item">
                <Reply size={14} /> Reply
              </button>
              <button className="ctx-item">
                <Forward size={14} /> Forward
              </button>
              <button className="ctx-item">
                <Pin size={14} /> Pin
              </button>
              {contextMenu.isOwn && (
                <button
                  className="ctx-item danger"
                  onClick={() => handleDelete(contextMenu.msgId)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </>
        )}
    </div>
  );
}

export default ChatWindow;
