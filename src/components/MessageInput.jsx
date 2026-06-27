import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";

function MessageInput({ activeChat }) {
  const [text, setText] = useState("");
  const { user } = useAuth();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;

    try {
      const messagesRef = collection(db, activeChat.type, activeChat.id, "messages");
      await addDoc(messagesRef, {
        text: text.trim(),
        uid: user.uid,
        authorName: user.displayName || user.email.split('@')[0],
        createdAt: serverTimestamp()
      });
      setText("");
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <form className="message-input-p5" onSubmit={handleSend}>
      <div className="input-wrapper-p5">
        <input
          type="text"
          placeholder="Enter message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!activeChat}
          maxLength={500}
        />
      </div>
      <button type="submit" disabled={!text.trim() || !activeChat}>
        Send
      </button>
    </form>
  );
}

export default MessageInput;