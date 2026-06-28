import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { Send, Mic, Paperclip, Smile } from "lucide-react";

function MessageInput({ activeChat }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const { user } = useAuth();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    try {
      await addDoc(collection(db, activeChat.type, activeChat.id, "messages"), {
        text: text.trim(),
        uid: user.uid,
        authorName: user.displayName || user.email.split("@")[0],
        createdAt: serverTimestamp(),
        type: "text",
      });
      setText("");
    } catch (error) {
      console.error("Error sending:", error);
    }
  };

  return (
    <form className="message-input-area" onSubmit={handleSend}>
      <div className="input-wrapper">
        <button type="button" className="input-icon-btn" title="Emoji">
          <Smile size={20} />
        </button>
        <input
          type="text"
          placeholder={`Message ${activeChat?.name || ""}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
        />
        <button type="button" className="input-icon-btn" title="Attach">
          <Paperclip size={20} />
        </button>
      </div>
      {text.trim() ? (
        <button type="submit" className="send-btn" title="Send">
          <Send size={18} />
        </button>
      ) : (
        <button
          type="button"
          className={`send-btn mic-btn ${recording ? "recording" : ""}`}
          title="Voice message"
          onMouseDown={() => setRecording(true)}
          onMouseUp={() => setRecording(false)}
        >
          <Mic size={18} />
        </button>
      )}
    </form>
  );
}

export default MessageInput;