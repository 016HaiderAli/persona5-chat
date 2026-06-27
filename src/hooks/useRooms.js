import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore"; // Removed orderBy
import { db } from "../firebase/firebase";

export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple query without orderBy - no index needed!
    const q = query(collection(db, "rooms"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      setLoading(false);
    });

    return unsub;
  }, []);

  return { rooms, loading };
}