import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";

export function useMessages(activeChatId, chatType) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // chatType is either 'rooms' or 'dms'
    const messagesRef = collection(db, chatType, activeChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    setLoading(true);
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return unsub;
  }, [activeChatId, chatType]);

  return { messages, loading };
}