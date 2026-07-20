import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyAcqAGY0-h50MlWH9ZH8uhUUIYMPH0Z7AI",
  authDomain: "queuesmart-4776c.firebaseapp.com",
  projectId: "queuesmart-4776c",
  storageBucket: "queuesmart-4776c.firebasestorage.app",
  messagingSenderId: "199683186342",
  appId: "1:199683186342:web:535553bc3b479c4f035e67",
  measurementId: "G-QRSCK69SP8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
