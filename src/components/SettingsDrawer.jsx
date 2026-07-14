import { useState, useEffect } from 'react';
import { pb, socket } from '../services/backend';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { X, Volume2, ShieldCheck, Eye, EyeOff, Bell, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Custom Notification Sound Engine combining File Assets & Live Synthesizer fallback
export const playNotificationSound = (soundFileName) => {
  try {
    const audioPath = `/sounds/${soundFileName}`;
    const audio = new Audio(audioPath);
    audio.play().catch(() => {
      // Web Audio API Synthesizer fallback for dynamic retro dings
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (soundFileName.includes('chime') || soundFileName.includes('ding')) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.12); // C6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (soundFileName.includes('bell') || soundFileName.includes('velvet')) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        osc.frequency.setValueAtTime(440.00, ctx.currentTime + 0.1); // A4
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (soundFileName.includes('card') || soundFileName.includes('steal')) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Standard alert
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    });
  } catch (e) {
    console.warn('Audio engine alert failure', e);
  }
};

export const SOUND_CHOICES = [
  { id: 'phantom_chime.mp3', name: 'Phantom Chime (Aesthetic Chime)' },
  { id: 'persona_ding.mp3', name: 'Persona Ding (Metallic Ding)' },
  { id: 'calling_card.mp3', name: 'Calling Card (Thief Swipe)' },
  { id: 'heart_steal.mp3', name: 'Heart Steal (Double Ping)' },
  { id: 'mona_meow.mp3', name: "Mona's Meow (Cat Call)" },
  { id: 'velvet_bell.mp3', name: 'Velvet Bell (Clock Chime)' },
  { id: 'shadow_strike.mp3', name: 'Shadow Strike (Saber Slash)' },
  { id: 'cyber_pulse.mp3', name: 'Cyber Pulse (Futaba Ping)' },
  { id: 'leblanc_drip.mp3', name: 'LeBlanc Drip (Coffee drip)' },
  { id: 'all_out.mp3', name: 'All-Out Attack (Swipe Strike)' },
];

export default function SettingsDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const { theme, changeTheme } = useTheme();

  // Settings properties
  const [statusMode, setStatusMode] = useState('online');
  const [selectedSound, setSelectedSound] = useState('phantom_chime.mp3');
  const [desktopNotify, setDesktopNotify] = useState(true);
  const [privacyAgreed, setPrivacyAgreed] = useState(true);
  const [policyAgreed, setPolicyAgreed] = useState(true);

  useEffect(() => {
    if (user) {
      const savedSound = localStorage.getItem(`sound_choice_${user.id}`);
      if (savedSound) setSelectedSound(savedSound);

      const savedStatus = localStorage.getItem(`status_mode_${user.id}`);
      if (savedStatus) setStatusMode(savedStatus);
    }
  }, [user, isOpen]);

  const handleStatusChange = async (newStatus) => {
    setStatusMode(newStatus);
    if (!user) return;

    localStorage.setItem(`status_mode_${user.id}`, newStatus);
    try {
      await pb.collection('users').update(user.id, { statusMode: newStatus });
    } catch (e) {
      // Fallback if schema doesn't have custom presence columns yet
    }

    // Instantly notify peer WebSockets
    socket.emit('user_status_changed', { userId: user.id, statusMode: newStatus });
  };

  const handleSoundChange = (soundId) => {
    setSelectedSound(soundId);
    if (user) localStorage.setItem(`sound_choice_${user.id}`, soundId);
    // Preview selected sound
    playNotificationSound(soundId);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'nightowl' ? 'light' : 'nightowl';
    changeTheme(nextTheme);
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            className="drawer-panel settings-drawer overflow-y-auto flex flex-col font-sans text-white"
            style={{ position: 'absolute', zIndex: 100, left: '80px', top: 0, height: '100%', width: '380px', background: '#121214', borderRight: '4px solid #b59b00' }}
            initial={{ x: '-110%' }}
            animate={{ x: 0 }}
            exit={{ x: '-110%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          >
            {/* Header */}
              <div className="relative bg-yellow-400 p-6 flex justify-between items-center clip-path-banner overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-black/5 text-7xl font-bold font-mono select-none pointer-events-none italic">
                SYSTEM
              </div>
              <div>
                <h2 className="text-2xl font-black italic tracking-wider text-black bg-black px-3 py-1 inline-block transform -skew-x-12">
                  SETTINGS
                </h2>
                <p className="text-xs text-black mt-1 font-mono tracking-tight font-semibold">CONFIG MATRIX</p>
              </div>
              <button
                onClick={onClose}
                className="bg-black text-white hover:text-yellow-400 p-2 rounded-full transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 flex-1 flex flex-col gap-6">
              {/* Privacy Control: Discord-style Presence Status Selector */}
              <div className="bg-[#141921] p-4 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-emerald-500 h-1 w-12" />
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-3 font-mono uppercase">
                  {statusMode === 'online' ? <Eye size={18} /> : <EyeOff size={18} />}
                  <span>Privacy presence</span>
                </div>
                <label className="text-xs text-[#8E9AA8] font-mono block mb-2">SELECT PUBLIC ONLINE STATE</label>
                <select
                  value={statusMode}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
                >
                  <option value="online">● Online (Visible to Peer Thieves)</option>
                  <option value="offline">◌ Stay Offline / Invisible (Stealth Mode)</option>
                </select>
                <p className="text-[10px] text-[#8E9AA8] mt-2 font-mono">
                  *Stealth Mode hides your active WebSocket state from buddy lists in real-time.
                </p>
              </div>

              {/* Theme Toggle section */}
              <div className="bg-[#141921] p-4 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-red-600 h-1 w-12" />
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm mb-3 font-mono uppercase">
                  <Laptop size={18} />
                  <span>VISUAL THEME ENGINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">High-Contrast Persona Theme</p>
                    <p className="text-xs text-[#8E9AA8] mt-0.5">Toggle between Velvet Dark & Classic Light.</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="bg-red-600 hover:bg-red-700 text-white font-black italic tracking-widest px-3 py-1.5 rounded text-xs transform -skew-x-12 transition-all font-mono"
                  >
                    {theme === 'nightowl' ? 'DARK MODE' : 'LIGHT MODE'}
                  </button>
                </div>
              </div>

              {/* Audio Sound Matrix Engine */}
              <div className="bg-[#141921] p-4 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-yellow-400 h-1 w-12" />
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-3 font-mono uppercase">
                  <Volume2 size={18} />
                  <span>Notification Sound Matrix</span>
                </div>
                <label className="text-xs text-[#8E9AA8] font-mono block mb-2">SELECT INCOMING ALERT CHIME</label>
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
                  {SOUND_CHOICES.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSoundChange(choice.id)}
                      className={`text-left px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        selectedSound === choice.id
                          ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400 font-bold'
                          : 'bg-[#1A1F26] border-transparent text-white/70 hover:bg-white/5'
                      }`}
                    >
                      {choice.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Policies, Agreement triggers & notification selectors */}
              <div className="bg-[#141921] p-4 rounded-xl border border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Bell size={16} className="text-[#8E9AA8]" />
                    <span>Desktop Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={desktopNotify}
                    onChange={(e) => setDesktopNotify(e.target.checked)}
                    className="rounded bg-[#1A1F26] border-white/10 accent-yellow-400 cursor-pointer h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck size={16} className="text-[#8E9AA8]" />
                    <span>System Privacy Agreement</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="rounded bg-[#1A1F26] border-white/10 accent-yellow-400 cursor-pointer h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck size={16} className="text-[#8E9AA8]" />
                    <span>Multi-tenant Policy Agreement</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyAgreed}
                    onChange={(e) => setPolicyAgreed(e.target.checked)}
                    className="rounded bg-[#1A1F26] border-white/10 accent-yellow-400 cursor-pointer h-4 w-4"
                  />
                </div>
              </div>

              {/* Footer text */}
              <div className="mt-auto text-center border-t border-white/5 pt-4">
                <p className="text-[10px] text-[#8E9AA8] font-mono">PHANTOMCHAT APP PLATFORM • VERSION 1.4</p>
                <p className="text-[9px] text-red-500 font-mono mt-1 font-semibold uppercase">TAKE YOUR TIME</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
