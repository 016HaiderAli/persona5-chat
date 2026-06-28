import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { X, Image, Video, FileText, Link, Mic, BellOff, LogOut } from "lucide-react";

function RightPanel({ activeChat, setShowPanel }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!activeChat) return;
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [activeChat]);

  const isRoom = activeChat?.type === "rooms";

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
          <div className="rp-action-btn">
            <BellOff size={14} /> Mute Room
          </div>
          <div className="rp-action-btn">
            <LogOut size={14} /> Leave Room
          </div>
        </div>
      )}
    </div>
  );
}

export default RightPanel;