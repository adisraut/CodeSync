// src/pages/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import './Dashboard.css';  // Import CSS file for the dashboard

const Dashboard = () => {
  const [projects, setProjects] = useState([]);  // Store user's projects
  const [sessions, setSessions] = useState([]);  // Store user's sessions
  const navigate = useNavigate();
  
  useEffect(() => {
    // Fetch user's projects and sessions on component mount
    fetchProjects();
    fetchSessions();
  }, []);

  // Fetch user's projects from Firestore
  const fetchProjects = async () => {
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef);  // Query all projects
    const querySnapshot = await getDocs(q);
    const projectData = querySnapshot.docs.map((doc) => doc.data());
    setProjects(projectData);
  };

  // Fetch user's sessions from Firestore
  const fetchSessions = async () => {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef);  // Query all sessions
    const querySnapshot = await getDocs(q);
    const sessionData = querySnapshot.docs.map((doc) => doc.data());
    setSessions(sessionData);
  };

  // Function to handle creating a new session
  const handleCreateSession = () => {
    navigate('/create-session');  // Redirect to the Create Session page
  };

  return (
    <div className="dashboard-container">
      <div className="content-container">
        {/* Header */}
        <h1 className="dashboard-header">Welcome to Your Dashboard</h1>
        
        {/* Projects List */}
        <div className="card projects-card">
          <h2 className="card-header">Your Projects</h2>
          <ul>
            {projects.length === 0 ? (
              <li className="no-projects">You don't have any projects yet.</li>
            ) : (
              projects.map((project, index) => (
                <li key={index} className="project-item">{project.name}</li>
              ))
            )}
          </ul>
        </div>

        {/* Sessions List */}
        <div className="card sessions-card">
          <h2 className="card-header">Your Sessions</h2>
          <ul>
            {sessions.length === 0 ? (
              <li className="no-sessions">You don't have any active sessions.</li>
            ) : (
              sessions.map((session, index) => (
                <li key={index} className="session-item">{session.name}</li>
              ))
            )}
          </ul>
        </div>

        {/* Button to Create New Session */}
        <div className="center-button">
          <button
            onClick={handleCreateSession}
            className="create-session-btn"
          >
            Create New Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
