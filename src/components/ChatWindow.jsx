import { useMessages } from "../hooks/useMessages";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, Phone, MoreHorizontal, CheckCheck } from "lucide-react";

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
                  <div className={`bubble ${isOwn ? "own" : ""}`}>
                    {msg.text}
                  </div>
                  <div className="msg-footer">
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    {isOwn && (
                      <CheckCheck
                        size={14}
                        className="msg-tick"
                        strokeWidth={2.5}
                      />
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