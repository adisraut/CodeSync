// src/pages/Login.js
import React, { useState } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { auth } from '../firebase';
import './Login.css';

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error.message);
      setErrorMsg(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Email/password login error:', error.message);
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h1 className="login-title">Welcome to CodeSync</h1>

        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        {errorMsg && <p className="error-msg">{errorMsg}</p>}

        <div className="login-divider">OR</div>

        <button onClick={handleGoogleLogin} className="google-btn">
          <FcGoogle size={22} className="google-icon" />
          <span>Sign in with Google</span>
        </button>

        <p className="login-register">
          Don’t have an account?
          <a href="/register" className="register-link">Register</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
