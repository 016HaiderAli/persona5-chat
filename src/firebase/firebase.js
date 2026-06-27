import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7T19Xt5GpOf54cLWxSzgSm8fmxzS6yuw",
  authDomain: "persona5-chat-dcea8.firebaseapp.com",
  projectId: "persona5-chat-dcea8",
  storageBucket: "persona5-chat-dcea8.firebasestorage.app",
  messagingSenderId: "647602122930",
  appId: "1:647602122930:web:c12cf58b36a5fd29ec99ab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);