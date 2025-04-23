import React, { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateSession from './pages/CreateSession';
import SessionEditor from './pages/SessionEditor';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if the user is already logged in when the app loads
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      ensureUserDocument(currentUser);
    }
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);

      // Ensure user document exists in Firestore (for the first time login)
      await ensureUserDocument(result.user);

      console.log("User signed in and saved to Firestore");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => setUser(null));
  };

  const ensureUserDocument = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        createdAt: new Date(),
      });
      console.log("User document created in Firestore");
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/CreateSession" element={<CreateSession />} />
        <Route path="/session/:sessionId" element={<SessionEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
