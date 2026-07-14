import { useState, useEffect } from "react";
import { pb, socket } from "../services/backend.js";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useRooms } from "../hooks/useRooms";
import { Send, UserPlus, Check, X, Ban, Radio, Wifi, WifiOff, Sparkles } from 'lucide-react';

function Sidebar({ activeChat, setActiveChat, showSidebar }) {
  const { rooms, loading: roomsLoading } = useRooms();
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();
  
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  
  const [users, setUsers] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState("");
  
  // Real-time presence & relationships
  const [relationships, setRelationships] = useState([]);
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  // Monitor WebSocket states
  useEffect(() => {
    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Sync users list and relationships
  useEffect(() => {
    if (!user) return;
    
    let mounted = true;
    let unsubUsers = null;
    let unsubRels = null;

    const loadUsers = async () => {
      try {
        const list = await pb.collection('users').getFullList({ requestKey: null });
        if (!mounted) return;
        setUsers(list.filter(u => u.id !== user.id));
      } catch (e) {
        console.error('Failed to load users from PocketBase', e);
      }
    };

    const loadRelationships = async () => {
      try {
        const list = await pb.collection('relationships').getFullList({
          filter: `user_id = "${user.id}" || target_id = "${user.id}"`,
          requestKey: null,
        });
        if (!mounted) return;
        setRelationships(list);
      } catch (err) {
        // Fallback: localStorage sync for local-first testing
        const saved = localStorage.getItem('local_relationships') || '[]';
        if (mounted) setRelationships(JSON.parse(saved));
      }
    };

    loadUsers();
    loadRelationships();

    // Subscribe to presence updates and relationship changes
    try {
      unsubUsers = pb.collection('users').subscribe('*', () => {
        loadUsers();
      });
      unsubRels = pb.collection('relationships').subscribe('*', () => {
        loadRelationships();
      });
    } catch (e) {}

    return () => {
      mounted = false;
      if (typeof unsubUsers === 'function') unsubUsers();
      else if (unsubUsers?.unsubscribe) unsubUsers.unsubscribe();
      if (typeof unsubRels === 'function') unsubRels();
      else if (unsubRels?.unsubscribe) unsubRels.unsubscribe();
    };
  }, [user]);

  // Secure user search with debounced backend matching
  useEffect(() => {
    if (!userSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const trimmedSearch = userSearch.trim();
      if (!trimmedSearch) {
        setSearchResults([]);
        return;
      }
      try {
        const escapedSearch = trimmedSearch.replace(/'/g, "\\'");
        const records = await pb.collection('users').getList(1, 20, {
          filter: `(username ~ '${escapedSearch}' || firstName ~ '${escapedSearch}' || lastName ~ '${escapedSearch}' || name ~ '${escapedSearch}') && id != '${user?.id}'`,
        });
        
        // SECURE SCHEMA: Map results carefully to hide email strings entirely
        const mapped = records.items.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.name || u.username,
        }));
        setSearchResults(mapped);
      } catch (err) {
        // Fallback local search
        const localMatches = users
          .filter(
            (u) =>
              (u.username || '').toLowerCase().includes(trimmedSearch.toLowerCase()) ||
              (u.firstName || '').toLowerCase().includes(trimmedSearch.toLowerCase()) ||
              (u.lastName || '').toLowerCase().includes(trimmedSearch.toLowerCase()) ||
              (u.name || '').toLowerCase().includes(trimmedSearch.toLowerCase())
          )
          .map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.name || u.username,
          }));
        setSearchResults(localMatches);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [userSearch, users, user]);

  // Handle relationship requests
  const sendFriendRequest = async (targetId) => {
    if (!user) return;
    
    // Prevent self-request or double send
    const alreadyExists = relationships.find(
      (r) => (r.user_id === user.id && r.target_id === targetId) || (r.user_id === targetId && r.target_id === user.id)
    );
    if (alreadyExists) return;

    const payload = {
      user_id: user.id,
      target_id: targetId,
      status: "pending",
    };

    try {
      const rec = await pb.collection('relationships').create(payload);
      setRelationships((prev) => [...prev, rec]);
    } catch (err) {
      // Local storage failover sync
      const saved = JSON.parse(localStorage.getItem('local_relationships') || '[]');
      const newRec = { id: 'rel_' + Math.random().toString(36).substr(2, 9), ...payload };
      saved.push(newRec);
      localStorage.setItem('local_relationships', JSON.stringify(saved));
      setRelationships(saved);
    }
  };

  const updateRequestStatus = async (relId, newStatus) => {
    try {
      const updated = await pb.collection('relationships').update(relId, { status: newStatus });
      setRelationships((prev) => prev.map((r) => (r.id === relId ? updated : r)));
    } catch (err) {
      // Local storage fallback sync
      const saved = JSON.parse(localStorage.getItem('local_relationships') || '[]');
      const next = saved.map((r) => (r.id === relId ? { ...r, status: newStatus } : r));
      localStorage.setItem('local_relationships', JSON.stringify(next));
      setRelationships(next);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      await pb.collection('rooms').create({
        name: newRoomName.trim(),
        createdBy: user?.id,
        emoji: "💬",
      });
    } catch (e) {
      console.error('Failed to create room', e);
    }
    setNewRoomName("");
    setShowCreateRoom(false);
  };

  const startDM = (otherUser) => {
    const dmId = [user.id, otherUser.id].sort().join("_");
    setActiveChat({
      id: dmId,
      name: otherUser.displayName || otherUser.username,
      type: "dms",
    });
    setShowUserSearch(false);
    setUserSearch("");
  };

  const themes = [
    { id: "nightowl", label: "🌙" },
    { id: "light", label: "☀️" },
  ];

  const filteredRooms = rooms.filter((r) =>
    (r.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Compute friend request inboxes
  const incomingRequests = relationships.filter(
    (r) => r.target_id === user?.id && r.status === "pending"
  );
  
  // Accept list mapped as valid DMs
  const activeFriends = users.filter((u) => {
    return relationships.some(
      (r) =>
        r.status === "accepted" &&
        ((r.user_id === user?.id && r.target_id === u.id) || (r.user_id === u.id && r.target_id === user?.id))
    );
  });

  return (
    <div className={`chat-list ${showSidebar ? "show" : ""} flex flex-col h-full bg-[#0B0E14] border-r border-white/5`}>

      {/* Dynamic Telemetry Connection Status Widget */}
      <div className={`p-2 flex items-center justify-between text-[11px] font-bold font-mono tracking-wider ${
        socketConnected ? 'bg-[#141921] text-emerald-400 border-b border-white/5' : 'bg-red-600 text-white animate-pulse'
      }`}>
        <div className="flex items-center gap-1.5">
          {socketConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{socketConnected ? "GRID SYNCHRONIZED" : "DE-SYNCHRONIZED - DISCONNECTED"}</span>
        </div>
        <span className="text-[9px] opacity-70">WS LINK</span>
      </div>

      {/* Header */}
      <div className="cl-header p-4 border-b border-white/5">
        <div className="cl-top-row flex justify-between items-center mb-3">
          <h2 className="cl-title text-base font-black italic text-white transform -skew-x-6 tracking-wide">PHANTOM NET</h2>
          <div className="cl-theme-pills flex gap-1 bg-[#1A1F26] p-1 rounded-lg border border-white/5">
            {themes.map((t) => (
              <button
                key={t.id}
                className={`cl-theme-btn text-xs px-2 py-1 rounded transition ${theme === t.id ? "bg-red-600 text-white font-bold" : "text-white/60 hover:text-white"}`}
                onClick={() => changeTheme(t.id)}
                title={t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="cl-search-wrap flex items-center bg-[#141921] border border-white/10 rounded-lg px-3 py-1.5">
          <span className="cl-search-icon text-xs mr-2">🔍</span>
          <input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-white placeholder-white/40 w-full"
          />
        </div>
      </div>

      {/* Incoming Friend Invites Panel (Pending Box) */}
      {incomingRequests.length > 0 && (
        <div className="p-3 bg-red-600/15 border-b border-red-600/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black tracking-widest text-red-500 font-mono uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
              Incoming Invites ({incomingRequests.length})
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto">
            {incomingRequests.map((req) => {
              const sender = users.find((u) => u.id === req.user_id) || { username: 'Unknown Thief' };
              return (
                <div key={req.id} className="flex items-center justify-between bg-[#141921] p-2 rounded-lg border border-white/5">
                  <span className="text-xs font-semibold truncate max-w-[120px] text-white/90">
                    @{sender.username}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateRequestStatus(req.id, 'accepted')}
                      className="bg-emerald-600 hover:bg-emerald-700 p-1 rounded text-white transition"
                      title="Accept Invite"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => updateRequestStatus(req.id, 'blocked')}
                      className="bg-red-600 hover:bg-red-700 p-1 rounded text-white transition"
                      title="Block / Decline"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Public Rooms */}
      <div className="cl-section-header px-4 py-2 mt-2 flex justify-between items-center">
        <span className="cl-section-label text-[10px] font-black text-white/50 tracking-wider">CHANNELS</span>
        <button
          className="cl-add-btn text-xs text-red-500 hover:text-white"
          onClick={() => setShowCreateRoom(true)}
          title="Create Channel"
        >+</button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px]">
        {roomsLoading ? (
          <div className="cl-empty text-xs text-center text-white/40 py-4">Scanning grid...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="cl-empty text-xs text-center text-white/40 py-4">No active channels</div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`cl-item flex items-center gap-3 px-4 py-2 cursor-pointer transition ${activeChat?.id === room.id ? "bg-[#1A1F26] border-l-4 border-red-600" : "hover:bg-[#141921]"}`}
              onClick={() => setActiveChat({ id: room.id, name: room.name, type: "rooms" })}
            >
              <div className="cl-av-room text-sm bg-[#1A1F26] w-8 h-8 rounded flex items-center justify-center border border-white/5">
                {room.emoji || "#"}
              </div>
              <div className="cl-info min-w-0 flex-1">
                <div className="cl-name text-xs font-bold text-white truncate">{room.name}</div>
                <div className="cl-preview text-[10px] text-white/40 truncate">
                  {room.lastMessage || "Establish connection"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Direct Messages Section */}
      <div className="cl-section-header px-4 py-2 border-t border-white/5 flex justify-between items-center">
        <span className="cl-section-label text-[10px] font-black text-white/50 tracking-wider">BUDDY DIRECTORIES</span>
        <button
          className="cl-add-btn text-xs text-red-500 hover:text-white"
          onClick={() => setShowUserSearch(!showUserSearch)}
          title="Add Friend"
        >✏️</button>
      </div>

      {showUserSearch && (
        <div className="cl-user-search px-4 py-2 bg-[#141921] border-b border-white/5 flex flex-col gap-2">
          <input
            placeholder="Search username..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-600"
            autoFocus
          />
          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-[10px] text-white/40 py-1 text-center">No thieves matched.</p>
            ) : (
              searchResults.map((u) => {
                const relation = relationships.find(
                  (r) => (r.user_id === user?.id && r.target_id === u.id) || (r.user_id === u.id && r.target_id === user?.id)
                );
                return (
                  <div key={u.id} className="flex items-center justify-between p-1 hover:bg-[#1A1F26] rounded">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white truncate">@{u.username}</span>
                      {u.displayName && <span className="text-[10px] text-white/50">{u.displayName}</span>}
                    </div>
                    {relation ? (
                      <span className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded font-mono uppercase">
                        {relation.status}
                      </span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(u.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition text-[12px] font-semibold"
                        title="Send Request"
                        aria-label="Send friend request"
                      >
                        Send Request
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Pinned Mona AI Chatbot permanent interface contact */}
      <div className="flex-1 overflow-y-auto">
        {/* Permanently Pinned Mona AI */}
        <div
          className={`cl-item flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${activeChat?.id === 'mona_ai' ? "bg-red-600/10 border-l-4 border-yellow-400" : "hover:bg-[#141921]"}`}
          onClick={() => setActiveChat({ id: "mona_ai", name: "Mona AI", type: "ai_bot" })}
        >
          <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black relative shadow-glow border border-yellow-300">
            🐱
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
          </div>
          <div className="cl-info min-w-0 flex-1">
            <div className="cl-name text-xs font-black text-yellow-400 flex items-center gap-1">
              <span>Mona AI</span>
              <Sparkles size={11} className="text-yellow-300 fill-yellow-300" />
            </div>
            <div className="cl-preview text-[10px] text-white/50 italic">"Sleep is important, Ren! Ask me anything."</div>
          </div>
        </div>

        {/* Real Live DMs List */}
        {activeFriends.length === 0 ? (
          <div className="cl-empty text-[11px] text-white/40 text-center py-6">
            Add friends using the edit icon above to begin direct messaging!
          </div>
        ) : (
          activeFriends.map((u) => {
            const hasAvatar = u.avatar;
            const fallbackChar = (u.name || u.username || 'A')[0].toUpperCase();
            return (
              <div
                key={u.id}
                className={`cl-item flex items-center gap-3 px-4 py-2 cursor-pointer transition ${activeChat?.id === [user?.id, u.id].sort().join("_") ? "bg-[#1A1F26] border-l-4 border-red-600" : "hover:bg-[#141921]"}`}
                onClick={() => startDM(u)}
              >
                <div className="w-8 h-8 rounded-full bg-[#1A1F26] border border-white/5 text-red-500 font-black flex items-center justify-center text-xs">
                  {hasAvatar ? (
                    <img src={`${pb.baseUrl}/api/files/users/${u.id}/${u.avatar}`} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    fallbackChar
                  )}
                </div>
                <div className="cl-info min-w-0 flex-1">
                  <div className="cl-name text-xs font-bold text-white truncate">
                    {u.name || `@${u.username}`}
                  </div>
                  <div className="cl-preview text-[10px] text-white/40 truncate">
                    {u.statusMode === 'offline' ? 'Offline' : 'Online'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="cl-modal bg-[#141921] border-2 border-red-600 p-4 rounded-xl shadow-2xl mx-3 my-2">
          <p className="text-xs font-black italic text-red-500 mb-2 font-mono uppercase transform -skew-x-6">CHANNEL TITLE</p>
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
            placeholder="e.g. general"
            className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-600 mb-3"
            autoFocus
          />
          <div className="cl-modal-btns flex gap-2">
            <button className="btn-confirm bg-red-600 hover:bg-red-700 text-white font-bold italic py-1.5 px-3 rounded text-xs" onClick={handleCreateRoom}>CONSTITUTE</button>
            <button className="btn-cancel bg-transparent text-white/60 hover:text-white py-1.5 px-3 border border-white/10 rounded text-xs" onClick={() => setShowCreateRoom(false)}>ABORT</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
