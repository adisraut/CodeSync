import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProjects(); // Fetch projects only when the user is authenticated
      fetchSessions();
    } else {
      navigate('/login'); // Redirect to login if the user is not authenticated
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return; // Ensure user is logged in

    try {
      console.log("Fetching projects for user:", user.uid); // Debugging log
      const projectsRef = collection(db, 'users', user.uid, 'projects');
      const q = query(projectsRef);
      const querySnapshot = await getDocs(q);
      
      // Log the result of the query
      console.log("Fetched projects:", querySnapshot.docs);

      const projectData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      
      // Log the state being set
      console.log("Mapped project data:", projectData);

      setProjects(projectData); // Update the state with fetched project data
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef);
      const querySnapshot = await getDocs(q);
      const sessionData = querySnapshot.docs.map((doc) => doc.data());
      setSessions(sessionData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleCreateSession = () => {
    navigate('/CreateSession');
  };

  const handleJoinSession = () => {
    if (joinCode.trim() !== '') {
      navigate(`/session/${joinCode.trim()}`);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <div className="content-container">
        <h1 className="dashboard-header">
          Welcome, {user?.displayName || user?.email}
        </h1>

        {/* Session Buttons */}
        <div className="session-actions">
          <button onClick={handleCreateSession} className="create-session-btn">
            Create New Session
          </button>

          <div className="join-session-container">
            <input
              type="text"
              placeholder="Enter Session ID"
              className="join-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button onClick={handleJoinSession} className="join-btn">
              Join
            </button>
          </div>
        </div>

        {/* Projects */}
        <div className="card projects-card">
          <h2 className="card-header">Your Projects</h2>
          <ul>
            {projects.length === 0 ? (
              <li className="no-projects">You don't have any projects yet.</li>
            ) : (
              projects.map((project, index) => (
                <li key={index} className="project-item">
                  {project.name}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Sessions */}
        <div className="card sessions-card">
          <h2 className="card-header">Your Sessions</h2>
          <ul>
            {sessions.length === 0 ? (
              <li className="no-sessions">You don't have any active sessions.</li>
            ) : (
              sessions.map((session, index) => (
                <li key={index} className="session-item">
                  {session.name}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="center-button">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
