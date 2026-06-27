import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useRooms } from "../hooks/useRooms";

function Sidebar({ activeChat, setActiveChat, showSidebar }) {
  const { rooms, loading } = useRooms();
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();
  // Create Room
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  // Adding DM Section
  const [users, setUsers] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Create Room
  const handleCreateRoom = async () => {
  if (!newRoomName.trim()) return;
  try {
    await addDoc(collection(db, "rooms"), {
      name: newRoomName.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      emoji: "💬"
    });
    setNewRoomName("");
    setShowCreateRoom(false);
    } catch (err) {
      console.error(err);
    }
  };

  // User Search
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user?.uid);
      setUsers(usersData);
    });
    return unsub;
  }, [user]);

  // Start Direct Message
  const startDM = async (otherUser) => {
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
    { id: "persona5", color: "#e61e14", label: "P5" },
    { id: "p5yellow", color: "#f5d407", label: "YLW" },
    { id: "dark", color: "#333333", label: "DRK" },
    { id: "midnight", color: "#3333aa", label: "MID" },
    { id: "light", color: "#dddddd", label: "LGT" },
  ];

  return (
    <div className={`sidebar ${showSidebar ? "show" : ""}`}>

      {/* User Profile Header */}
      <div className="sidebar-profile">
        <div className="profile-avatar">
          {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
        </div>
        <div className="profile-info">
          <div className="profile-name">
            {user?.displayName || user?.email?.split("@")[0]}
          </div>
          <div className="profile-status">● Online</div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          ⏻
        </button>
      </div>

      {/* Theme Switcher */}
      <div className="sidebar-themes">
        {themes.map((t) => (
          <button
            key={t.id}
            className={`theme-pill ${theme === t.id ? "active" : ""}`}
            style={{ background: t.color }}
            onClick={() => changeTheme(t.id)}
            title={t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="sidebar-search">
        <input type="text" placeholder="🔍  Search rooms..." />
      </div>

      {/* Rooms List */}
      <div className="rooms-list">
        <div className="rooms-header">
          <h3>PUBLIC ROOMS</h3>
          <button className="create-room-btn" onClick={() => setShowCreateRoom(true)}>
            +
          </button>
        </div>
        {loading ? (
          <p style={{ padding: "20px", color: "var(--text-secondary)" }}>
            Loading...
          </p>
        ) : rooms.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--text-secondary)" }}>
            No rooms yet
          </p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className={`room-item ${activeChat?.id === room.id ? "active" : ""}`}
              onClick={() =>
                setActiveChat({
                  id: room.id,
                  name: room.name || "Room",
                  type: "rooms",
                })
              }
            >
              <div className="room-icon">{room.emoji || "#"}</div>
              <div className="room-info">
                <div className="room-name">{room.name || "Unnamed Room"}</div>
                <div className="room-preview">Tap to join</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DM Section */}
      <div className="rooms-header" style={{ marginTop: "10px" }}>
        <h3>DIRECT MESSAGES</h3>
        <button
          className="create-room-btn"
          onClick={() => setShowUserSearch(!showUserSearch)}
        >
          ✏️
        </button>
      </div>

      {/* User Search */}
      {showUserSearch && (
        <div className="user-search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            autoFocus
          />
          <div className="user-search-results">
            {users
              .filter(u =>
                (u.displayName || u.email)
                  .toLowerCase()
                  .includes(userSearch.toLowerCase())
              )
              .map(u => (
                <div
                  key={u.id}
                  className="user-result-item"
                  onClick={() => startDM(u)}
                >
                  <div className="user-result-avatar">
                    {(u.displayName || u.email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="user-result-name">
                      {u.displayName || u.email?.split("@")[0]}
                    </div>
                    <div className="user-result-email">{u.email}</div>
                  </div>
                </div>
              ))}
            {users.filter(u =>
              (u.displayName || u.email)
                .toLowerCase()
                .includes(userSearch.toLowerCase())
            ).length === 0 && (
              <p className="no-users">No users found</p>
            )}
          </div>
        </div>
      )}

      {/* Create Room */}
      {showCreateRoom && 
        (
          <div className="create-room-modal">
            <p>ROOM NAME</p>
            <input
              type="text"
              placeholder="e.g. Study Hall"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="btn-confirm" onClick={handleCreateRoom}>CREATE</button>
              <button className="btn-cancel" onClick={() => setShowCreateRoom(false)}>CANCEL</button>
            </div>
          </div>
        )
      }

    </div>
  );
}

export default Sidebar;