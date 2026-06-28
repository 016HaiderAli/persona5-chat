import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import RightPanel from "../components/RightPanel";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "../styles/chat.css";
import { MessageSquare, Users, Archive, User, Edit, Power } from "lucide-react";

function Chat() {
  const [activeChat, setActiveChat] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
          });
        } else {
          setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        }
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="app-layout">

      {/* Icon Bar */}
      <div className="icon-bar">
        <div className="ib-logo">⚡</div>
        <div className="ib-items">
          <div className="ib-item active" title="All Chats">
            <MessageSquare size={22} />
            <span className="ib-label">Chats</span>
          </div>
          <div className="ib-item" title="Friends">
            <Users size={22} />
            <span className="ib-label">Friends</span>
          </div>
          <div className="ib-item" title="Archive">
            <Archive size={22} />
            <span className="ib-label">Archive</span>
          </div>
          <div className="ib-item" title="Profile">
            <User size={22} />
            <span className="ib-label">Profile</span>
          </div>
        </div>
        <div className="ib-bottom">
          <div className="ib-user">
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <button className="power-btn" onClick={handleLogout} title="Logout">
            <Power size={16} />
          </button>
        </div>
      </div>

      {/* Chat List */}
      <Sidebar
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        showSidebar={showSidebar}
      />

      {/* Main Chat */}
      <div className="chat-main">
        {activeChat ? (
          <>
            <ChatWindow
              activeChat={activeChat}
              setShowPanel={setShowPanel}
              showPanel={showPanel}
            />
            <MessageInput activeChat={activeChat} />
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <h2>Welcome to PhantomChat</h2>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      {activeChat && showPanel && (
        <RightPanel
          activeChat={activeChat}
          setShowPanel={setShowPanel}
        />
      )}

    </div>
  );
}

export default Chat;