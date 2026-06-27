import { useMessages } from "../hooks/useMessages";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

function ChatWindow({ activeChat }) {
  const { messages, loading } = useMessages(activeChat?.id, activeChat?.type);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: false 
    });
  };

  if (!activeChat) {
    return (
      <div className="chat-window empty">
        <h2>SELECT A ROOM TO START TAKING A HEIST...</h2>
      </div>
    );
  }

  return (
    <div className="chat-window p5-style">
      <div className="chat-header">
        <h3>{activeChat.type === "dms" ? "💬" : "#"} {activeChat.name}</h3>
      </div>
      
      <div className="messages-container">
        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="no-messages">No messages yet. Say hello!</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message-p5 ${msg.uid === user?.uid ? 'own' : ''}`}>
              <div className="message-avatar">
                {msg.authorName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="message-content">
                <div className="message-bubble-p5">
                  <div className="message-author-p5">{msg.authorName || 'Anonymous'}</div>
                  <div className="message-text-p5">{msg.text}</div>
                </div>
                <div className="timestamp-p5">{formatTime(msg.createdAt)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatWindow;