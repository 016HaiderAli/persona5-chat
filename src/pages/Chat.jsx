import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/chat.css";

function Chat() {
  const [activeChat, setActiveChat] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Create user profile in Firestore when they log in
  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
            badge: "Recruit",
            lastSeen: serverTimestamp()
          });
        } else {
          setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        }
      });
    }
  }, [user]);

  // Listen for unread messages (simplified - will improve later)
  useEffect(() => {
    if (!user || !activeChat) return;
    
    const messagesRef = collection(db, activeChat.type, activeChat.id, "messages");
    const q = query(messagesRef, where("uid", "!=", user.uid));
    
    const unsub = onSnapshot(q, (snapshot) => {
      // Count messages from others (simplified logic)
      setUnreadCount(snapshot.size > 0 ? Math.floor(Math.random() * 5) : 0);
    });
    
    return unsub;
  }, [user, activeChat]);

  return (
    <div className="messenger-layout">
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="nav-left">
          <button 
            className="nav-btn back-btn" 
            onClick={() => setShowSidebar(!showSidebar)}
          >
            ←
          </button>
          <div className="app-logo">
            <span className="logo-text">PHANTOM CHAT</span>
          </div>
        </div>
        
        <div className="nav-right">
          <button className="nav-btn icon-btn" title="Notifications">
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <button className="nav-btn icon-btn" title="Settings">
            ⚙️
          </button>
          <div className="user-avatar-small">
            {user?.displayName?.[0] || user?.email?.[0]}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Sidebar 
          activeChat={activeChat} 
          setActiveChat={setActiveChat}
          showSidebar={showSidebar}
        />
        <div className="chat-area">
          {activeChat ? (
            <>
              <ChatWindow activeChat={activeChat} />
              <MessageInput activeChat={activeChat} />
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="empty-state">
                <h2>Select a conversation</h2>
                <p>Choose from your rooms or start a new chat</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;