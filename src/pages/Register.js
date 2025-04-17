// src/pages/Register.js
import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';  // Make sure to import both auth and db
import './Register.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
  
    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
  
    try {
      // Create user with email and password using Firebase Authentication
      await createUserWithEmailAndPassword(auth, email, password);
  
      // After successful registration, get the current user
      const user = auth.currentUser;  // This will get the user that was just created
  
      // Create a document reference in Firestore for the new user
      const userRef = doc(db, 'users', user.uid);
  
      // Set the user's data in Firestore (you can include any other data you want to store)
      await setDoc(userRef, {
        email: user.email,   // Store the email address
        uid: user.uid,       // Store the unique user ID
        createdAt: new Date(),  // Store the registration time
      });
  
      // Redirect the user to the dashboard after successful registration
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);  // If an error occurs, display the error message
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-box">
        <h1 className="register-title">Create an Account</h1>

        {/* Registration Form */}
        <form className="register-form" onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Email"
            className="register-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="register-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="register-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="register-btn">
            Register
          </button>
        </form>

        <p className="register-login">
          Already have an account? 
          <a href="/login" className="login-link">Login</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
