import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import './CreateSession.css'; // Add your CSS for styling
import { getAuth } from 'firebase/auth'; // Import Firebase Auth to get current user

const CreateSession = () => {
  const [projects, setProjects] = useState([]);  // Store the list of existing projects
  const [newProjectName, setNewProjectName] = useState('');  // State for new project name
  const [isModalOpen, setIsModalOpen] = useState(false);  // Control modal visibility
  const [selectedProject, setSelectedProject] = useState('');
  const navigate = useNavigate();

  // Fetch all existing projects for the current user
  const fetchProjects = async () => {
    try {
      const user = getAuth().currentUser;
      if (!user) {
        alert('You need to be logged in to create or view projects');
        return;
      }
      const projectsRef = collection(db, 'users', user.uid, 'projects');
      const projectSnapshot = await getDocs(projectsRef);
      const projectList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []); // Fetch projects on mount, only once.

  // Handle creating a new project
  const handleCreateProject = async () => {
    if (newProjectName.trim() === '') {
      alert('Project name is required.');
      return;
    }

    try {
      const user = getAuth().currentUser;
      if (!user) {
        alert('You need to be logged in to create a project');
        return;
      }

      // Create a new project in Firestore, linked to the current user
      const docRef = await addDoc(collection(db, 'users', user.uid, 'projects'), {
        name: newProjectName.trim(),
        createdAt: new Date(),
      });

      console.log('New project created with ID:', docRef.id);

      // Reset modal state
      setIsModalOpen(false);
      setNewProjectName('');
      setSelectedProject(docRef.id); // Auto-select the new project
      fetchProjects(); // Refresh the list of projects
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project.');
    }
  };

  // Handle starting a session
  const handleStartSession = () => {
    if (!selectedProject) {
      alert('Please select or create a project.');
      return;
    }

    navigate(`/session/${selectedProject}`);
  };

  return (
    <div className="create-session-container">
      <h1>Create a New Session</h1>

      <div className="project-selector">
        <label htmlFor="projectSelect">Select a Project:</label>
        <select
          id="projectSelect"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">-- Select a Project --</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <button className="create-project-btn" onClick={() => setIsModalOpen(true)}>
          Create New Project
        </button>
      </div>

      {/* Modal to create new project */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setIsModalOpen(false)}>×</span>
            <h2>Create a New Project</h2>
            <input
              type="text"
              placeholder="Enter project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button onClick={handleCreateProject}>Create Project</button>
          </div>
        </div>
      )}

      <div className="start-session-btn-container">
        <button className="start-session-btn" onClick={handleStartSession}>
          Start Session
        </button>
      </div>
    </div>
  );
};

export default CreateSession;
