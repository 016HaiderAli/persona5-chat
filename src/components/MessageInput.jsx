import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../hooks/useMessages";
import { Send, Mic, Paperclip, Smile, X, Pause, Play, StopCircle, Trash2, Download, Volume2, SlidersHorizontal } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { playSentSound } from "../utils/sounds";

function MessageInput({ activeChat, replyTo, setReplyTo }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const { user } = useAuth();
  const { sendMessage, sendVoiceMessage: pbSendVoiceMessage } = useMessages(activeChat?.id, activeChat?.type);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [waveformData, setWaveformData] = useState([]);
  const [isSeeking, setIsSeeking] = useState(false);
  const [recordingStart, setRecordingStart] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [maxReached, setMaxReached] = useState(false);
  const recordingPausedRef = useRef(false);
  const timerRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const ignoreOnStopRef = useRef(false);
  const fileInputRef = useRef(null);


  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!text.trim() && !imagePreview && !audioBlob) return;

    try {
      if (audioBlob) {
        await pbSendVoiceMessage(audioBlob);
      } else {
        await sendMessage({
          text: text.trim() || (imagePreview ? "📷 Image" : ""),
          imageData: imagePreview || null,
          type: imagePreview ? "image" : "text",
          replyTo: replyTo ? { ...replyTo } : null,
        });
      }

      setText("");
      setReplyTo(null);
      setImagePreview(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioProgress(0);
      setAudioPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      playSentSound();
    } catch (error) {
      console.error("Error sending:", error);
    }
  };

  // Function to handle sending messages and images
  // const handleSend = async (e) => {
  //   e.preventDefault();
  //   // Stop if there is no text AND no image
  //   if ((!text.trim() && !imagePreview) || !activeChat) return; 

  //   try {
  //     await addDoc(collection(db, activeChat.type, activeChat.id, "messages"), {
  //       text: text.trim(),
  //       imageData: imagePreview || null, // Attach image if we have one
  //       uid: user.uid,
  //       authorName: user.displayName || user.email.split("@")[0],
  //       createdAt: serverTimestamp(),
  //       type: imagePreview ? "image" : "text",
  //       status: "delivered",
  //       replyTo: replyTo ? {
  //         id: replyTo.id,
  //         text: replyTo.text,
  //         authorName: replyTo.authorName,
  //       } : null,
  //     });
  //     setText("");
  //     setReplyTo(null);
  //     setImagePreview(null); // Clear image preview after sending
  //     playSentSound();
  //   } catch (error) {
  //     console.error("Error sending:", error);
  //   }
  // };

  // sendVoiceMessage will delegate to the PocketBase-backed hook

  const sendVoiceMessage = async () => {
    if (!audioBlob || !activeChat) return;
    await pbSendVoiceMessage(audioBlob);
    setAudioBlob(null);
    setAudioUrl(null);
    setText("");
    setReplyTo(null);
    setAudioProgress(0);
    setAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    playSentSound();
  };

  // Function to handle sending audio messages
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      ignoreOnStopRef.current = false;
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (ignoreOnStopRef.current) {
          ignoreOnStopRef.current = false;
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setAudioUrl(previewUrl);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingPaused(false);
      const startTs = Date.now();
      setRecordingStart(startTs);
      setElapsedMs(0);
      setMaxReached(false);
      recordingPausedRef.current = false;
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTs;
        if (elapsed >= 300000) {
          setElapsedMs(300000);
          setMaxReached(true);
          clearRecordingTimer();
          stopRecording();
          return;
        }
        if (!recordingPausedRef.current) {
          setElapsedMs(elapsed);
        }
      }, 200);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Please allow microphone access!");
    }
  };

  // Function to stop recording
  const clearRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setRecordingPaused(false);
    setRecordingStart(null);
    recordingPausedRef.current = false;
    clearRecordingTimer();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingPaused(true);
      recordingPausedRef.current = true;
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingPaused(false);
      recordingPausedRef.current = false;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      ignoreOnStopRef.current = true;
      mediaRecorderRef.current.stop();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setRecording(false);
    setRecordingPaused(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingStart(null);
    setElapsedMs(0);
    setMaxReached(false);
    recordingPausedRef.current = false;
    clearRecordingTimer();
  };

  const deleteAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioProgress(0);
    setAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };


  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl) {
      setWaveformData([]);
      setDuration(0);
      return;
    }

    const fetchAndDecode = async () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const sampleCount = 120;
        const blockSize = Math.floor(channelData.length / sampleCount);
        const waveform = Array.from({ length: sampleCount }, (_, idx) => {
          const start = idx * blockSize;
          let sum = 0;
          for (let i = start; i < start + blockSize && i < channelData.length; i += 1) {
            sum += Math.abs(channelData[i]);
          }
          return Math.min(1, sum / Math.max(1, blockSize));
        });
        setWaveformData(waveform);
        setDuration(audioBuffer.duration);
      } catch (error) {
        console.error("Waveform decode error:", error);
      } finally {
        audioContext.close();
      }
    };

    fetchAndDecode();
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barCount = waveformData.length || 20;
    const barWidth = Math.max(2, Math.floor(width / (barCount * 1.5)));
    const gap = Math.max(2, Math.floor((width - barWidth * barCount) / (barCount - 1)));

    waveformData.forEach((value, idx) => {
      const barHeight = Math.max(4, Math.round(value * (height - 12)));
      const x = idx * (barWidth + gap);
      const y = height - barHeight;
      const isActive = audioProgress >= (idx + 1) / barCount;
      ctx.fillStyle = isActive ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.18)";
      ctx.fillRect(x, y, barWidth, barHeight);
      if (isActive) {
        ctx.shadowColor = "rgba(255,255,255,0.4)";
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;
      }
    });
  }, [waveformData, audioProgress]);

  const handleAudioPlay = () => setAudioPlaying(true);
  const handleAudioPause = () => setAudioPlaying(false);
  const handleLoadedMetadata = () => {
    if (audioRef.current?.duration) {
      setDuration(audioRef.current.duration);
    }
  };
  const handleAudioTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setAudioProgress(audioRef.current.currentTime / audioRef.current.duration);
    }
  };
  const handleAudioEnded = () => {
    setAudioPlaying(false);
    setAudioProgress(0);
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const downloadUrl = URL.createObjectURL(audioBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "recording.webm";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "00:00";
    const total = Math.floor(seconds);
    const mm = Math.floor(total / 60).toString().padStart(2, "0");
    const ss = (total % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const seekAudio = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const percent = x / rect.width;
    audioRef.current.currentTime = percent * duration;
    setAudioProgress(percent);
  };

  const handleWavePointerDown = (e) => {
    setIsSeeking(true);
    seekAudio(e.clientX);
  };

  const handleWavePointerMove = (e) => {
    if (isSeeking) seekAudio(e.clientX);
  };

  const handleWavePointerUp = () => {
    if (isSeeking) setIsSeeking(false);
  };

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackRate;
  }, [volume, playbackRate]);

  // Uploads a selected image and shows a preview before sending
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImagePreview(reader.result); // Hold the image in preview state
    };
    e.target.value = "";
  };

  // Inserts the selected emoji into the input and closes the emoji picker.
  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const formatElapsed = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(total / 60).toString().padStart(2, "0");
    const ss = (total % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <div className="input-area-wrap">
      {/* 1. Added Reply Preview Bar */}
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <div className="reply-bar-name">{replyTo.authorName}</div>
            <div className="reply-bar-text">{replyTo.text}</div>
          </div>
          <button type="button" className="reply-bar-close" onClick={() => setReplyTo(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Added Voice Message Preview Bar */}
      {recording && (
        <div className="recording-overlay">
          <div className="recording-indicator">
            <div className="recording-left">
              <div className="recording-ring">
                <Mic size={18} />
              </div>
              <div className="recording-info">
                <span className="recording-timer">{formatElapsed(elapsedMs)}</span>
                <span className="recording-hint">Recording...</span>
              </div>
            </div>
            <div className="recording-progress-bar">
              <span style={{ width: `${Math.min(100, (elapsedMs / 300000) * 100)}%` }} />
            </div>
            <div className="recording-actions">
              {recordingPaused ? (
                <button type="button" className="recording-action-btn" onClick={resumeRecording}>
                  <Play size={16} />
                  Resume
                </button>
              ) : (
                <button type="button" className="recording-action-btn" onClick={pauseRecording}>
                  <Pause size={16} />
                  Pause
                </button>
              )}
              <button type="button" className="recording-action-btn" onClick={stopRecording}>
                <StopCircle size={16} />
                Stop
              </button>
              <button type="button" className="recording-action-btn delete-audio-btn" onClick={cancelRecording}>
                <Trash2 size={16} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {audioBlob && !recording && (
        <div className="voice-preview-bar">
          <div className="voice-msg-player">
            <div className="custom-audio-player">
              <div className="player-top-row">
                <button type="button" className="recording-action-btn" onClick={toggleAudioPlay}>
                  {audioPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {audioPlaying ? "Pause" : "Play"}
                </button>
                <div className="time-labels">
                  <span>{formatTime(audioRef.current?.currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <button type="button" className="recording-action-btn" onClick={downloadAudio} title="Download audio">
                  <Download size={16} />
                </button>
              </div>
              <div
                className="waveform-canvas-wrap"
                onPointerDown={handleWavePointerDown}
                onPointerMove={handleWavePointerMove}
                onPointerUp={handleWavePointerUp}
                onPointerLeave={handleWavePointerUp}
              >
                <canvas ref={canvasRef} className="waveform-canvas" />
              </div>
              <div className="player-controls-row">
                <div className="player-control-group">
                  <Volume2 size={14} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                  />
                </div>
                <div className="player-control-group">
                  <SlidersHorizontal size={14} />
                  <select value={playbackRate} onChange={(e) => setPlaybackRate(Number(e.target.value))}>
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handleAudioPlay}
              onPause={handleAudioPause}
              onTimeUpdate={handleAudioTimeUpdate}
              onEnded={handleAudioEnded}
              style={{ display: "none" }}
            />
          </div>
          <div className="voice-preview-actions">
            <button type="button" className="recording-action-btn delete-audio-btn" onClick={deleteAudio} title="Delete audio">
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Added Image Preview Bar */}
      {imagePreview && (
        <div className="voice-preview-bar" style={{ padding: '8px' }}>
          <img src={imagePreview} alt="Preview" style={{ height: '50px', borderRadius: '4px' }} />
          <button type="button" className="reply-bar-close" onClick={() => setImagePreview(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* 3. Added Emoji Picker */}
      {showEmoji && (
        <div className="emoji-picker-wrap">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme="dark"
            height={380}
            width={320}
            searchDisabled={false}
            skinTonesDisabled
          />
        </div>
      )}
      
      <form className="message-input-area" onSubmit={handleSend}>
        <div className="input-wrapper">
          <button
            type="button"
            className={`input-icon-btn ${showEmoji ? "active" : ""}`}
            title="Emoji"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <Smile size={20} />
          </button>
          <input
            type="text"
            // Dynamic placeholder
            placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : `Message ${activeChat?.name || ""}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
          />
          <button type="button" className="input-icon-btn" title="Attach" onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

        </div>
        {(text.trim() || imagePreview || audioBlob) ? (
            <button type="submit" className="send-btn">
              <Send size={18} />
            </button>
          ) : (
            <button
              type="button"
              className={`send-btn mic-btn ${recording ? "recording" : ""}`}
              onClick={startRecording}
            >
              <Mic size={18} />
            </button>
          )}
      </form>
    </div>
  );
}

export default MessageInput;