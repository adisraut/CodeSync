import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB18gq_AVlNmmVWqcc3ArYKGJG_meYKOak",
    authDomain: "codesync-1a07b.firebaseapp.com",
    projectId: "codesync-1a07b",
    storageBucket: "codesync-1a07b.firebasestorage.app",
    messagingSenderId: "172730833366",
    appId: "1:172730833366:web:c2b336236143c165c46c77",
    measurementId: "G-BG87C1K5L7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
