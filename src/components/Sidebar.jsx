import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useRooms } from "../hooks/useRooms";

function Sidebar({ activeChat, setActiveChat, showSidebar }) {
  const { rooms, loading } = useRooms();
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [users, setUsers] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== user?.uid)
      );
    });
    return unsub;
  }, [user]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    await addDoc(collection(db, "rooms"), {
      name: newRoomName.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      emoji: "💬",
    });
    setNewRoomName("");
    setShowCreateRoom(false);
  };

  const startDM = (otherUser) => {
    const dmId = [user.uid, otherUser.id].sort().join("_");
    setActiveChat({
      id: dmId,
      name: otherUser.displayName || otherUser.email?.split("@")[0],
      type: "dms",
    });
    setShowUserSearch(false);
    setUserSearch("");
  };

  const themes = [
    { id: "nightowl", label: "🌙" },
    { id: "lightaqua", label: "☀️" },
  ];

  const filteredRooms = rooms.filter((r) =>
    (r.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`chat-list ${showSidebar ? "show" : ""}`}>

      {/* Header */}
      <div className="cl-header">
        <div className="cl-top-row">
          <h2 className="cl-title">All Chats</h2>
          <div className="cl-theme-pills">
            {themes.map((t) => (
              <button
                key={t.id}
                className={`cl-theme-btn ${theme === t.id ? "active" : ""}`}
                onClick={() => changeTheme(t.id)}
                title={t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="cl-search-wrap">
          <span className="cl-search-icon">🔍</span>
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Rooms */}
      <div className="cl-section-header">
        <span className="cl-section-label">Public Rooms</span>
        <button
          className="cl-add-btn"
          onClick={() => setShowCreateRoom(true)}
          title="Create Room"
        >+</button>
      </div>

      <div className="cl-list">
        {loading ? (
          <div className="cl-empty">Loading...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="cl-empty">No rooms yet</div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`cl-item ${activeChat?.id === room.id ? "active" : ""}`}
              onClick={() => setActiveChat({ id: room.id, name: room.name, type: "rooms" })}
            >
              <div className="cl-av cl-av-room">
                {room.emoji || "#"}
              </div>
              <div className="cl-info">
                <div className="cl-name">{room.name || "Room"}</div>
                <div className="cl-preview">
                  {room.lastMessage || "Tap to join"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DMs */}
      <div className="cl-section-header">
        <span className="cl-section-label">Direct Messages</span>
        <button
          className="cl-add-btn"
          onClick={() => setShowUserSearch(!showUserSearch)}
          title="New DM"
        >✏️</button>
      </div>

      {showUserSearch && (
        <div className="cl-user-search">
          <input
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            autoFocus
          />
          {users
            .filter((u) =>
              (u.displayName || u.email || "")
                .toLowerCase()
                .includes(userSearch.toLowerCase())
            )
            .map((u) => (
              <div
                key={u.id}
                className="cl-user-item"
                onClick={() => startDM(u)}
              >
                <div className="cl-av">
                  {(u.displayName || u.email)?.[0]?.toUpperCase()}
                </div>
                <div className="cl-info">
                  <div className="cl-name">
                    {u.displayName || u.email?.split("@")[0]}
                  </div>
                  <div className="cl-preview">{u.email}</div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="cl-modal">
          <p>Room Name</p>
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
            placeholder="e.g. Gaming"
            autoFocus
          />
          <div className="cl-modal-btns">
            <button className="btn-confirm" onClick={handleCreateRoom}>Create</button>
            <button className="btn-cancel" onClick={() => setShowCreateRoom(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;