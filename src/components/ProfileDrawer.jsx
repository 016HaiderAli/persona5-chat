import { useState, useEffect } from 'react';
import { pb } from '../services/backend';
import { useAuth } from '../context/AuthContext';
import { X, Upload, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProfileDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  
  // Input states
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Initialize values
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      
      // Load fallback local meta if PocketBase schema is standard
      let meta = { firstName: '', lastName: '', bio: '', phone: '' };
      try {
        const savedMeta = localStorage.getItem(`user_meta_${user.id}`);
        if (savedMeta) meta = JSON.parse(savedMeta);
      } catch (e) {}

      setFirstName(user.firstName || meta.firstName || '');
      setLastName(user.lastName || meta.lastName || '');
      setBio(user.bio || meta.bio || '');
      setPhone(user.phone || meta.phone || '');
    }
  }, [user, isOpen]);

  if (!user) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Stream avatar to PocketBase users file storage bucket
      const updated = await pb.collection('users').update(user.id, formData);
      setMessage('Profile picture updated successfully!');
      
      // Update session record
      if (pb.authStore.record && pb.authStore.record.id === user.id) {
        pb.authStore.save(pb.authStore.token, updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const updateData = {
      username,
      email,
      name: `${firstName} ${lastName}`.trim(),
    };

    if (password) {
      if (password !== passwordConfirm) {
        setError('Passwords do not match!');
        setLoading(false);
        return;
      }
      updateData.password = password;
      updateData.passwordConfirm = passwordConfirm;
    }

    try {
      // 1. Try writing all fields (assuming custom schema attributes are enabled)
      const updated = await pb.collection('users').update(user.id, {
        ...updateData,
        firstName,
        lastName,
        bio,
        phone,
      });
      setMessage('Profile saved successfully!');
    } catch (err) {
      // 2. Fallback gracefully: update standard fields and keep extra meta in LocalStorage
      try {
        const updated = await pb.collection('users').update(user.id, updateData);
        localStorage.setItem(`user_meta_${user.id}`, JSON.stringify({ firstName, lastName, bio, phone }));
        setMessage('Profile updated! (Extra fields saved locally)');
      } catch (fallbackErr) {
        setError(fallbackErr.message || 'Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt(
      "WARNING: This action is irreversible! To delete your account and erase all your data, type 'DELETE' below:"
    );
    if (confirmText !== 'DELETE') {
      alert('Confirmation keyword did not match. Account erasure aborted.');
      return;
    }

    setLoading(true);
    try {
      await pb.collection('users').delete(user.id);
      alert('Your account has been deleted. Goodbye, Phantom Thief.');
      pb.authStore.clear();
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to delete account.');
      setLoading(false);
    }
  };

  // Get Avatar URL
  const avatarUrl = user.avatar
    ? `${pb.baseUrl}/api/files/users/${user.id}/${user.avatar}`
    : `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username || 'joker'}`;

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
            className="drawer-panel profile-drawer overflow-y-auto flex flex-col font-sans text-white"
            style={{ position: 'absolute', zIndex: 100, left: '80px', top: 0, height: '100%', width: '380px', background: '#121214', borderRight: '4px solid #b91c1c' }}
            initial={{ x: '-110%' }}
            animate={{ x: 0 }}
            exit={{ x: '-110%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          >
            {/* Persona 5 Styled Header banner */}
            <div className="relative bg-red-600 p-6 flex justify-between items-center clip-path-banner overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-white/10 text-7xl font-bold font-mono select-none pointer-events-none italic">
                PHANTOM
              </div>
              <div>
                <h2 className="text-2xl font-black italic tracking-wider text-white px-3 py-1 inline-block transform -skew-x-6">
                  PROFILE
                </h2>
                <p className="text-xs text-white mt-1 font-mono tracking-tight">CODENAME: {user.username || 'UNKNOWN'}</p>
              </div>
              <button
                onClick={onClose}
                className="bg-black text-white hover:text-red-500 hover:bg-white p-2 rounded-full transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 flex-1 flex flex-col gap-6">
              {/* Avatar section */}
              <div className="flex flex-col items-center gap-4 bg-[#141921] p-4 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-red-600 h-1 w-12" />
                <div className="relative group">
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-24 h-24 rounded-full border-4 border-red-600 object-cover bg-black"
                  />
                  <label className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-xs text-red-500 font-bold">
                    <Upload size={16} className="mb-1" />
                    UPLOAD
                    <input type="file" onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                  </label>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{user.name || user.username || 'Ren Amamiya'}</p>
                  <p className="text-xs text-[#8E9AA8] mt-1 font-mono">{user.email}</p>
                </div>
              </div>

              {/* Status messaging notifications */}
              {message && (
                <div className="bg-emerald-950/50 border border-emerald-500 text-emerald-400 p-3 rounded-lg text-xs font-semibold">
                  {message}
                </div>
              )}
              {error && (
                <div className="bg-red-950/50 border border-red-500 text-red-400 p-3 rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Editable Fields Form */}
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ren"
                      className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Amamiya"
                      className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="We steal hearts."
                    rows={2}
                    className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                  />
                </div>

                {/* Password field group */}
                <div className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-red-500 font-mono tracking-wider uppercase">Change Password</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">New Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-[#8E9AA8] uppercase font-mono">Confirm</label>
                      <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 2FA Placeholder validation toggles */}
                <div className="border-t border-white/5 pt-4 mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Two-Factor Authentication (2FA)</p>
                    <p className="text-[10px] text-[#8E9AA8] mt-0.5">Secure your heart with 2FA codes.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => setTwoFactor(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic tracking-widest py-2.5 px-4 rounded-lg transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-mono text-center uppercase"
                >
                  {loading ? 'MUTATING RECORDS...' : 'UPDATE PROFILE'}
                </button>
              </form>

              {/* Danger Zone */}
              <div className="border-t-2 border-dashed border-red-600/30 pt-6 mt-auto flex flex-col gap-3">
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                  <ShieldAlert size={18} />
                  <span>DANGER ZONE</span>
                </div>
                <p className="text-xs text-[#8E9AA8]">
                  Deleting your profile will permanently erase your character data and authorization token from the database.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="flex items-center justify-center gap-2 w-full bg-transparent border-2 border-red-600 hover:bg-red-600/10 text-red-500 hover:text-red-600 font-bold py-2 px-4 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                  <span>ERASE PHANTOM ID</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
