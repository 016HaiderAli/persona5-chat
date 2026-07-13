import { createContext, useContext, useEffect, useState } from "react";
import { pb } from "../services/backend.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // PocketBase auth store fires on login, logout, and token refresh
    const normalize = (rec) => {
      if (!rec) return null;
      // Ensure backward compatibility with Firebase-style fields
      const normalized = {
        ...rec,
        uid: rec.id,
        id: rec.id,
        displayName: rec.name || rec.displayName || rec.username || rec.email || null,
      };
      return normalized;
    };

    const unsubscribe = pb.authStore.onChange((token, record) => {
      setUser(normalize(record));
      setLoading(false);
    });

    // Set initial state from existing auth store
    if (pb.authStore.isValid) {
      setUser(normalize(pb.authStore.record));
    }
    setLoading(false);

    return unsubscribe;
  }, []);

  // Mark online when user is available, offline on unload
  useEffect(() => {
    if (!user) return;

    pb.collection("users").update(user.id, { online: true }).catch(() => {});

    const handleOffline = () => {
      pb.collection("users").update(user.id, { online: false }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleOffline);
    return () => window.removeEventListener("beforeunload", handleOffline);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}