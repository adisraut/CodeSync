import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, getDocs, where, addDoc } from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      navigate('/login');
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const projectData = [];
      for (const doc of querySnapshot.docs) {
        const project = {
          id: doc.id,
          name: doc.data().name,
        };

        const sessionQuery = query(collection(db, 'sessions'), where('projectId', '==', doc.id));
        const sessionSnapshot = await getDocs(sessionQuery);
        const sessionDoc = sessionSnapshot.docs[0];
        project.sessionId = sessionDoc ? sessionDoc.id : null;
        projectData.push(project);
      }

      setProjects(projectData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const handleProjectClick = (sessionId) => {
    if (!sessionId) {
      alert('This project does not have an active session.');
    } else {
      navigate(`/session/${sessionId}`);
    }
  };

  const handleCreateProject = async () => {
    const projectName = prompt('Enter a name for your new project:');
    if (!projectName || !user) return;

    try {
      // Create project
      const projectRef = await addDoc(collection(db, 'projects'), {
        name: projectName,
        ownerId: user.uid,
      });

      // Create session
      const sessionRef = await addDoc(collection(db, 'sessions'), {
        projectId: projectRef.id,
        createdAt: new Date(),
      });

      // Refresh project list
      fetchProjects();
    } catch (error) {
      console.error('Error creating project/session:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="content-container">
        <h1 className="dashboard-header">
          Welcome, {user?.displayName || user?.email}
        </h1>

        {/* Projects Section */}
        <div className="card projects-card">
          <h2 className="card-header">Your Projects</h2>
          <ul>
            {projects.length === 0 ? (
              <li className="no-projects">You don't have any projects yet.</li>
            ) : (
              projects.map((project) => (
                <li
                  key={project.id}
                  className="project-item clickable"
                  onClick={() => handleProjectClick(project.sessionId)}
                >
                  <strong>{project.name}</strong> <br />
                  <span className="session-id">Session ID: {project.sessionId || 'N/A'}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Buttons */}
        <div className="center-button dual-buttons">
          <button onClick={handleCreateProject} className="createproj">
            Create Project
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
