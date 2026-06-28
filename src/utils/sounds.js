// src/utils/sounds.js

// Simple sound creator helper with cache busting query parameter (?v=2)
const createAudio = () => {
  const audio = new Audio("/sounds/iphone-notice.mp3?v=2");
  audio.volume = 0.5;
  return audio;
};

export function playMessageSound() {
  try {
    const audio = createAudio();
    audio.play().catch(err => console.warn("Audio blocked:", err.message));
  } catch (e) {
    console.log("Sound unavailable", e);
  }
}

export function playSentSound() {
  try {
    const audio = createAudio();
    audio.play().catch(err => console.warn("Audio blocked:", err.message));
  } catch (e) {
    console.log("Sound unavailable", e);
  }
}
