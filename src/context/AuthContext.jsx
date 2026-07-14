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
    });

    const initAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.record) {
            const base64UrlEncode = (str) => {
              try {
                return btoa(unescape(encodeURIComponent(str)))
                  .replace(/=/g, "")
                  .replace(/\+/g, "-")
                  .replace(/\//g, "_");
              } catch (e) {
                return btoa(str).replace(/=/g, "");
              }
            };
            const dummyHeader = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
            const dummyPayload = base64UrlEncode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, id: data.record.id }));
            const dummyToken = `${dummyHeader}.${dummyPayload}.`;

            pb.authStore.save(dummyToken, data.record);
            setUser(normalize(data.record));
          } else {
            pb.authStore.clear();
            setUser(null);
          }
        } else {
          // Fallback to local auth store if backend session route is unavailable
          if (pb.authStore.isValid) {
            setUser(normalize(pb.authStore.record));
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve auth session", err);
        if (pb.authStore.isValid) {
          setUser(normalize(pb.authStore.record));
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

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