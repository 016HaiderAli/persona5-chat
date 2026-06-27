import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useTheme } from "../context/ThemeContext";

const googleProvider = new GoogleAuthProvider();

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, changeTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/chat");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/chat");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="login-page">
      {/* Diagonal background slashes */}
      <div className="login-bg">
        <div className="slash slash-1" />
        <div className="slash slash-2" />
        <div className="slash slash-3" />
      </div>

      {/* Theme selector */}
      <div className="theme-bar">
        {["persona5", "p5yellow", "dark", "midnight", "light"].map((t) => (
          <button
            key={t}
            className={`theme-dot theme-${t} ${theme === t ? "active" : ""}`}
            onClick={() => changeTheme(t)}
            title={t}
          />
        ))}
      </div>

      {/* Login card */}
      <div className="login-card">
        <div className="login-header">
          <div className="login-tag">PHANTOM THIEVES</div>
          <h1 className="login-title">
            {isRegister ? "JOIN US" : "WELCOME BACK"}
          </h1>
          <p className="login-subtitle">
            {isRegister ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>EMAIL</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "LOADING..." : isRegister ? "REGISTER" : "LOGIN"}
          </button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button className="btn-google" onClick={handleGoogle}>
          <img src="https://www.google.com/favicon.ico" alt="Google" />
          Continue with Google
        </button>

        <p className="login-switch">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Login" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;