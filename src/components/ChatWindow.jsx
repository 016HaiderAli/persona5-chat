import { useMessages } from "../hooks/useMessages";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, Phone, MoreHorizontal, Reply, Forward, Pin, Trash2, Mic, X, Play, Pause } from "lucide-react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { playMessageSound } from "../utils/sounds";

// TickIcon component for message status
function TickIcon({ status }) {
  if (status === "read") {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" className="tick tick-read">
        <path d="M11.071.653a.45.45 0 0 0-.637 0L4.982 6.105 2.566 3.689a.45.45 0 0 0-.636.636l2.734 2.734a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
        <path d="M15.071.653a.45.45 0 0 0-.637 0L8.982 6.105l-.9-.9a.45.45 0 0 0-.636.636l1.218 1.218a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" className="tick tick-delivered">
        <path d="M11.071.653a.45.45 0 0 0-.637 0L4.982 6.105 2.566 3.689a.45.45 0 0 0-.636.636l2.734 2.734a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
        <path d="M15.071.653a.45.45 0 0 0-.637 0L8.982 6.105l-.9-.9a.45.45 0 0 0-.636.636l1.218 1.218a.45.45 0 0 0 .636 0l5.771-5.77a.45.45 0 0 0 0-.636z"/>
      </svg>
    );
  }
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" className="tick tick-sent">
      <path d="M9.071.653a.45.45 0 0 0-.637 0L2.982 6.105.566 3.689a.45.45 0 0 0-.636.636l2.734 2.734a.45.45 0 0 0 .636 0L9.071 1.29a.45.45 0 0 0 0-.637z"/>
    </svg>
  );
}

// Refactored MessageStatus for High Visibility & Sharp Look
export function MessageStatus({ status }) {
  // Reuse local TickIcon SVGs for consistent tick visuals
  return <TickIcon status={status || "sent"} />;
}

function ChatWindow({ activeChat, setShowPanel, showPanel, setReplyTo }) {
  const { messages, loading } = useMessages(activeChat?.id, activeChat?.type);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
// contextMenu = { msgId, x, y, isOwn }
  // reply state is managed by parent `Chat` component; `setReplyTo` is passed in
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fullImage, setFullImage] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    let dateObj = null;
    if (timestamp?.toDate && typeof timestamp.toDate === "function") {
      dateObj = timestamp.toDate();
    } else if (typeof timestamp === "number") {
      dateObj = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      dateObj = timestamp;
    } else {
      return "";
    }

    return dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const total = Math.floor(seconds);
    const mm = Math.floor(total / 60).toString().padStart(1, "0");
    const ss = (total % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const SentVoiceMessage = ({ src }) => {
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const menuRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [waveform, setWaveform] = useState([]);
    const [seeking, setSeeking] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentView, setCurrentView] = useState("main");
    const presetRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5];

    useEffect(() => {
      if (!src) return;
      const loadWaveform = async () => {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const response = await fetch(src);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          const sampleCount = 48;
          const blockSize = Math.floor(channelData.length / sampleCount);
          const bars = Array.from({ length: sampleCount }, (_, idx) => {
            const start = idx * blockSize;
            let sum = 0;
            for (let i = start; i < start + blockSize && i < channelData.length; i += 1) {
              sum += Math.abs(channelData[i]);
            }
            return Math.min(1, sum / blockSize);
          });
          setWaveform(bars);
          audioContext.close();
        } catch (error) {
          console.error("Sent voice waveform decode error", error);
        }
      };

      loadWaveform();
    }, [src]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const totalBars = waveform.length || 32;
      const gap = 2;
      const barWidth = Math.max(2, Math.floor((rect.width - (totalBars - 1) * gap) / totalBars));
      const centerY = rect.height / 2;
      waveform.forEach((level, idx) => {
        const barHeight = Math.max(8, Math.round(level * (rect.height - 16)));
        const x = idx * (barWidth + gap);
        const y = centerY - barHeight / 2;
        const active = progress >= (idx + 1) / totalBars;
        ctx.fillStyle = active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.25)";
        ctx.shadowColor = active ? "rgba(255,255,255,0.22)" : "transparent";
        ctx.shadowBlur = active ? 6 : 0;
        ctx.fillRect(x, y, barWidth, barHeight);
      });
    }, [waveform, progress]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setMenuOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      if (!audioRef.current) return;
      audioRef.current.muted = muted;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
    }, [muted, playbackRate, volume]);

    const togglePlay = () => {
      if (!audioRef.current) return;
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current?.duration) {
        setDuration(audioRef.current.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!audioRef.current || !audioRef.current.duration) return;
      setCurrentTime(audioRef.current.currentTime);
      setProgress(audioRef.current.currentTime / audioRef.current.duration);
    };

    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(duration);
      setProgress(1);
    };

    const seekAudio = (clientX) => {
      const canvas = canvasRef.current;
      if (!canvas || !audioRef.current || !duration) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const percent = x / rect.width;
      audioRef.current.currentTime = percent * duration;
      setProgress(percent);
    };

    const downloadAudio = async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "voice-message.webm";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Download error:", error);
      }
    };

    const toggleMenu = () => setMenuOpen((open) => {
      const next = !open;
      if (next) setCurrentView("main");
      return next;
    });
    const toggleMute = () => setMuted((current) => !current);
    const openSpeedView = () => setCurrentView("speed");
    const setSpeedPreset = (rate) => {
      setPlaybackRate(rate);
    };

    return (
      <div className="sent-voice-player" ref={menuRef}>
        <button type="button" className="sent-voice-play-btn" onClick={togglePlay}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="sent-voice-duration">{formatDuration(currentTime)} / {formatDuration(duration)}</div>
        <canvas
          ref={canvasRef}
          className="sent-voice-waveform-canvas"
          onPointerDown={(e) => { setSeeking(true); seekAudio(e.clientX); }}
          onPointerMove={(e) => { if (seeking) seekAudio(e.clientX); }}
          onPointerUp={() => setSeeking(false)}
          onPointerLeave={() => setSeeking(false)}
        />
        <button type="button" className="sent-voice-mute-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="sent-voice-volume-slider"
          aria-label="Volume"
        />
        <div className="sent-voice-menu-wrap">
          <button type="button" className="sent-voice-menu-btn" onClick={toggleMenu}>
            ⋮
          </button>
          {menuOpen && (
            <div className="sent-voice-dropdown">
              {currentView === "main" ? (
                <>
                  <button type="button" className="sent-voice-dropdown-item" onClick={downloadAudio}>
                    Download
                  </button>
                  <button type="button" className="sent-voice-dropdown-item" onClick={openSpeedView}>
                    Playback Speed
                  </button>
                </>
              ) : (
                <div className="sent-voice-dropdown-speed-view">
                  <button
                    type="button"
                    className="sent-voice-dropdown-back"
                    onClick={() => setCurrentView("main")}
                  >
                    &lt; Playback speed
                  </button>
                  <div className="sent-voice-dropdown-speed-custom">
                    <div className="sent-voice-dropdown-speed-label">
                      ✓ Custom ({playbackRate.toFixed(2)})
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="2.0"
                      step="0.05"
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="sent-voice-dropdown-speed-slider"
                    />
                    <div className="sent-voice-dropdown-speed-value">
                      {playbackRate.toFixed(2)}x
                    </div>
                  </div>
                  <div className="sent-voice-dropdown-speed-presets">
                    {presetRates.map((rate) => (
                      <button
                        type="button"
                        key={rate}
                        className="sent-voice-dropdown-item"
                        onClick={() => setSpeedPreset(rate)}
                      >
                        {rate === 1 ? "Normal" : rate}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <audio
          ref={audioRef}
          className="sent-voice-audio"
          src={src}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          muted={muted}
          style={{ display: "none" }}
        />
      </div>
    );
  };

  {/* Filter messages based on search query */}
  const displayMessages = searchQuery
  ? messages.filter(m =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : messages;

  const handleReact = async (msgId, emoji) => {
    if (!activeChat?.id || !activeChat?.type || !user?.uid) return;
    const msgRef = doc(db, activeChat.type, activeChat.id, "messages", msgId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const reactions = msgSnap.data().reactions || {};
    
    const previousEmoji = Object.keys(reactions).find(
      (e) => reactions[e]?.includes(user.uid)
    );

    const updates = {};

    if (previousEmoji && previousEmoji !== emoji) {
      updates[`reactions.${previousEmoji}`] = reactions[previousEmoji].filter(
        (uid) => uid !== user.uid
      );
    }

    const currentUsers = reactions[emoji] || [];
    const alreadyReacted = currentUsers.includes(user.uid);

    if (alreadyReacted) {
      updates[`reactions.${emoji}`] = currentUsers.filter(
        (uid) => uid !== user.uid
      );
    } else if (!previousEmoji || previousEmoji !== emoji) {
      updates[`reactions.${emoji}`] = [...currentUsers, user.uid];
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(msgRef, updates);
    }
  };

  // Right-click context menu for message actions
  const handleRightClick = (e, msg, isOwn) => {
  e.preventDefault();
  setContextMenu({
    msgId: msg.id,
    msg,
    x: e.clientX,
    y: e.clientY,
    isOwn,
  });
  };

  // Close context menu when clicking outside
  const closeContext = () => setContextMenu(null);

  // Delete message function
  const handleDelete = async (msgId) => {
    if (!activeChat?.id || !activeChat?.type) return;
    await deleteDoc(doc(db, activeChat.type, activeChat.id, "messages", msgId));
    closeContext();
  };

  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevCountRef.current && prevCountRef.current !== 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.uid !== user?.uid) {
        playMessageSound();
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, user?.uid]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="ch-av">
          {activeChat?.type === "dms" ? "💬" : "🌐"}
        </div>
        <div className="ch-info">
          <div className="ch-name">{activeChat?.name}</div>
          <div className="ch-sub">
            {activeChat?.type === "rooms" ? "Public Room" : "Direct Message"}
          </div>
        </div>
        <div className="ch-actions">
          {/* Search Button */}
          <button
            className={`ch-btn ${showSearch ? "active" : ""}`}
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
          >
            <Search size={18} />
          </button>

          {/* Phone Button */}
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

      {/* Added Search bar */}
      {showSearch && (
        <div className="chat-search-bar">
          <Search size={14} />
          <input
            autoFocus
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="search-count">
              {messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())).length} results
            </span>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="msgs-container">
        {loading ? (
          <div className="msgs-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="msgs-empty">
            <span>👋</span>
            <p>No messages yet — say hello!</p>
          </div>
        ) : (

          
            displayMessages.map((msg) => {
              const isOwn = msg.uid === user?.uid;
              const initial = (msg.authorName || "?")?.[0]?.toUpperCase();
              return (
                <div key={msg.id} className={`msg ${isOwn ? "own" : "other"}`}
                  onContextMenu={(e) => handleRightClick(e, msg, isOwn)}>

                  <div className={`msg-av ${isOwn ? "own" : ""}`}>
                    {initial}
                  </div>
                  <div className="msg-body">
                    {!isOwn && (
                      <div className="msg-name">{msg.authorName}</div>
                    )}
                    <div className="bubble-wrap">

                      {/* Render voice message */}
                      <div className={`bubble ${isOwn ? "own" : ""}`}>
                        {msg.replyTo && (
                          <div className="reply-quote">
                            <div className="reply-quote-name">{msg.replyTo.authorName}</div>
                            <div className="reply-quote-text">{msg.replyTo.text}</div>
                          </div>
                        )}

                        {/* Renders images OR text, but handles captions if both exist */}
                        {msg.type === "image" ? (
                            <div className="msg-image-wrapper">
                              {/* Check if imageData exists specifically */}
                              {msg.imageData && (
                                <img
                                  src={msg.imageData}
                                  alt="Shared"
                                  className="msg-image"
                                  onClick={() => setFullImage(msg.imageData)}
                                />
                              )}
                              {msg.text && msg.text !== "📷 Image" && (
                                <div className="msg-caption">{msg.text}</div>
                              )}

                              {fullImage && (
                                <div className="image-modal-overlay" onClick={() => setFullImage(null)}>
                                  <img src={fullImage} alt="Full size" className="image-modal-content" />
                                </div>
                              )}
                            </div>
    
                          ) : msg.type === "voice" && (msg.audioData || msg.audioUrl) ? (
                            <div className="voice-msg-player sent-voice-container">
                              <Mic size={14} />
                              <SentVoiceMessage src={msg.audioData || msg.audioUrl} />
                            </div>
                          ) : (
                            msg.text
                          ) 
                        }
                      </div>
                      
                      {/** Reaction Picker */}
                      <div className="reaction-picker">
                        {["❤️","😂","👍","🔥","😮","😢"].map((emoji) => (
                          <button
                            key={emoji}
                            className="reaction-emoji-btn"
                            onClick={() => handleReact(msg.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                  </div>
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="reactions-row">
                      {Object.entries(msg.reactions).map(([emoji, users]) =>
                        users.length > 0 ? (
                          <button
                            key={emoji}
                            className={`reaction-badge ${users.includes(user?.uid) ? "reacted" : ""}`}
                            onClick={() => handleReact(msg.id, emoji)}
                          >
                            {emoji} <span>{users.length}</span>
                          </button>
                        ) : null
                      )}
                    </div>
                  )}
                  
                  {/* Clean Flex Layout for Perfect Alignment */}
                  <div className="msg-footer">
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    {isOwn && (
                      <span className="msg-ticks">
                        <TickIcon status={msg.status || "sent"} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {contextMenu && (
          <>
            <div className="context-overlay" onClick={closeContext} />
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button className="ctx-item" onClick={() => { setReplyTo && setReplyTo(contextMenu.msg); closeContext(); }}>
                <Reply size={14} /> Reply
              </button>
              <button className="ctx-item">
                <Forward size={14} /> Forward
              </button>
              <button className="ctx-item">
                <Pin size={14} /> Pin
              </button>
              {contextMenu.isOwn && (
                <button
                  className="ctx-item danger"
                  onClick={() => handleDelete(contextMenu.msgId)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </>
        )}
    </div>
  );
}

export default ChatWindow;
