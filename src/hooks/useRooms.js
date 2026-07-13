import { useEffect, useState } from "react";
import { pb } from "../services/backend.js";

export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pb) {
      console.warn('PocketBase client not available');
      setLoading(false);
      return;
    }

    let mounted = true;
    let unsub = null;

    async function loadRooms() {
      setLoading(true);
      try {
        // Fetch all rooms (small apps). Switch to paginated getList if needed.
        const list = await pb.collection('rooms').getFullList({ sort: '-updated', requestKey: null });
        if (!mounted) return;
        const mapped = list.map((r) => ({
          id: r.id,
          name: r.name,
          createdAt: r.created,
          updatedAt: r.updated,
        }));
        setRooms(mapped);
      } catch (e) {
        console.error('Failed to load rooms from PocketBase', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRooms();

    try {
      // Subscribe to realtime events for the rooms collection.
      unsub = pb.collection('rooms').subscribe('*', (e) => {
        // For simplicity re-fetch the rooms list on any change event.
        loadRooms();
      });
    } catch (e) {
      console.warn('PocketBase subscribe failed', e);
    }

    return () => {
      mounted = false;
      if (unsub) {
        try {
          if (typeof unsub === 'function') unsub();
          else if (unsub.unsubscribe) unsub.unsubscribe();
        } catch (err) {
          // ignore
        }
      }
    };
  }, []);

  return { rooms, loading };
}