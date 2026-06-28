import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "rooms"));
    const unsub = onSnapshot(q, async (snapshot) => {
      const roomsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const room = { id: doc.id, ...doc.data() };
          try {
            const msgsQ = query(
              collection(db, "rooms", doc.id, "messages"),
              orderBy("createdAt", "desc"),
              limit(1)
            );
            const msgsSnap = await getDocs(msgsQ);
            if (!msgsSnap.empty) {
              const lastMsg = msgsSnap.docs[0].data();
              room.lastMessage = lastMsg.text || "Voice message 🎤";
              room.lastMessageTime = lastMsg.createdAt;
            }
          } catch (e) {
            room.lastMessage = "Tap to join";
          }
          return room;
        })
      );
      setRooms(roomsData);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { rooms, loading };
}