import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './CreateSession.css';

const CreateSession = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  // Load user-owned projects
  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const userProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(userProjects);
    };

    fetchProjects();
  }, [user]);

  const handleCreateProject = async () => {
    if (!newProjectName) return alert('Project name required');

    // 1. Create the new project
    const docRef = await addDoc(collection(db, 'projects'), {
      name: newProjectName,
      ownerId: user.uid,
      createdAt: Timestamp.now()
    });

    // 2. Add default file
    await addDoc(collection(db, 'projects', docRef.id, 'files'), {
      name: 'main.py',
      content: '# Start coding here!',
      createdAt: Timestamp.now()
    });

    // 3. Set the new project as selected
    setSelectedProjectId(docRef.id);
    setCreatingNew(false);
  };

  const handleStartSession = async () => {
    if (!selectedProjectId) return alert('Select or create a project');

    const sessionRef = await addDoc(collection(db, 'sessions'), {
      projectId: selectedProjectId,
      ownerId: user.uid,
      createdAt: Timestamp.now()
    });

    navigate(`/session/${sessionRef.id}`);
  };

  return (
    <div className="create-session-container">
      <h2>Create a New Coding Session</h2>

      <div className="project-section">
        <h4>Select an existing project:</h4>
        <ul>
          {projects.map(project => (
            <li key={project.id}>
              <label>
                <input
                  type="radio"
                  name="project"
                  value={project.id}
                  checked={selectedProjectId === project.id}
                  onChange={() => setSelectedProjectId(project.id)}
                />
                {project.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="create-project-section">
        <button onClick={() => setCreatingNew(!creatingNew)}>
          {creatingNew ? 'Cancel' : 'Create New Project'}
        </button>
        {creatingNew && (
          <div className="new-project-input">
            <input
              type="text"
              placeholder="New Project Name"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
            />
            <button onClick={handleCreateProject}>Create</button>
          </div>
        )}
      </div>

      <div className="start-session-btn">
        <button onClick={handleStartSession} disabled={!selectedProjectId}>
          Start Session
        </button>
      </div>
    </div>
  );
};

export default CreateSession;
