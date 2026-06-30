import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc  } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { X, Image, Video, FileText, Link, Mic, BellOff, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function RightPanel({ activeChat, setShowPanel }) {
  const [members, setMembers] = useState([]);
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);

  {/* Function to handle leaving the room */}
  const handleLeaveRoom = async () => {
    if (!window.confirm("Leave this room?")) return;
    // For now just close the panel — full leave logic needs room members tracking
    setShowPanel(false);
  };

  {/* Mute/Unmute functionality */}
  const handleMute = () => {
    setMuted(!muted);
    // Store mute preference locally for now
    localStorage.setItem(`muted_${activeChat.id}`, !muted);
  };

  {/* Load mute state on mount */}
  useEffect(() => {
    if (!activeChat) return;
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeChat]);

  {/* Determine if the active chat is a room or a direct message */}
  const isRoom = activeChat?.type === "rooms";

  {/* Define the file types to display in the right panel */}
  const files = [
    { icon: <Image size={16} />, label: "Photos" },
    { icon: <Video size={16} />, label: "Videos" },
    { icon: <FileText size={16} />, label: "Files" },
    { icon: <Link size={16} />, label: "Shared Links" },
    { icon: <Mic size={16} />, label: "Voice Messages" },
  ];

  return (
    <div className="right-panel">
      <div className="rp-header">
        <h3>{isRoom ? "Group Info" : "Contact Info"}</h3>
        <button className="rp-close" onClick={() => setShowPanel(false)}>
          <X size={16} />
        </button>
      </div>

      <div className="rp-section">
        <div className="rp-section-title">Files</div>
        {files.map((f) => (
          <div key={f.label} className="rp-file-item">
            <span className="rp-file-icon">{f.icon}</span>
            <span className="rp-file-label">{f.label}</span>
            <span className="rp-file-arrow">›</span>
          </div>
        ))}
      </div>

      <div className="rp-section">
        <div className="rp-section-title">{members.length} Members</div>
        {members.map((m) => (
          <div key={m.id} className="rp-member">
            <div className="rp-member-av">
              {(m.displayName || m.email)?.[0]?.toUpperCase()}
            </div>
            <div className="rp-member-info">
              <div className="rp-member-name">
                {m.displayName || m.email?.split("@")[0]}
              </div>
              <div className={`rp-member-status ${m.online ? "online" : ""}`}>
                {m.online ? "● Online" : "○ Offline"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isRoom && (
        <div className="rp-section">
          
          <div className="rp-action-btn" onClick={handleMute}>
            <BellOff size={14} /> {muted ? "Unmute Room" : "Mute Room"}
          </div>
          
          <div className="rp-action-btn danger" onClick={handleLeaveRoom}>
            <LogOut size={14} /> Leave Room
          </div>
        </div>
      )}
    </div>
  );
}

export default RightPanel;