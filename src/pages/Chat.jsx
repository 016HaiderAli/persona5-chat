import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import RightPanel from "../components/RightPanel";
import { pb } from "../services/backend.js";
import { useAuth } from "../context/AuthContext";
import "../styles/chat.css";
import { MessageSquare, Users, Settings, User, Power } from "lucide-react";

function Chat() {
  const [activeChat, setActiveChat] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [showPowerDrawer, setShowPowerDrawer] = useState(false);
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (user) {
      pb.collection("users").update(user.id, {
        displayName: user.displayName || user.email?.split("@")[0] || "",
        photoURL: user.photoURL || "",
        lastSeen: new Date().toISOString(),
      }).catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    setShowPowerDrawer(false);
    pb.authStore.clear();
  };

  const handleSwitchAccount = async () => {
    setShowPowerDrawer(false);
    pb.authStore.clear();
  };

  const handlePowerClick = () => {
    setShowPowerDrawer((prev) => !prev);
  };

  return (
    <div className="app-layout">

      {/* Icon Bar */}
      <div className="icon-bar">
        <div className="ib-logo">⚡</div>
        <div className="ib-items">
          <div className="ib-item active" data-tooltip="Chats" aria-label="Chats">
            <MessageSquare size={22} />
          </div>
          <div className="ib-item" data-tooltip="Groups" aria-label="Groups">
            <Users size={22} />
          </div>
          <div className="ib-item" data-tooltip="App Settings" aria-label="App Settings" onClick={() => setShowPanel((prev) => !prev)}>
            <Settings size={22} />
          </div>
          <div className="ib-item" data-tooltip="Profile" aria-label="Profile">
            <User size={22} />
          </div>
        </div>
        <div className="ib-bottom">
          <div className="ib-user">
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <button
            className={`power-btn ${showPowerDrawer ? "power-alert" : ""}`}
            onClick={handlePowerClick}
            title="Power"
          >
            <Power size={16} />
          </button>
          {showPowerDrawer && (
            <div className="power-drawer">
              <button type="button" className="power-drawer-item" onClick={handleSwitchAccount}>
                Switch Account
              </button>
              <button type="button" className="power-drawer-item danger" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          )}
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
              setReplyTo={setReplyTo}
            />
            <MessageInput activeChat={activeChat} replyTo={replyTo} setReplyTo={setReplyTo} />
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