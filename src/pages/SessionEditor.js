// src/pages/SessionEditor.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula'; // 💡 Dark theme
import './SessionEditor.css';

const SessionEditor = () => {
  const { sessionId } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [output, setOutput] = useState([]); // Changed to array for terminal line tracking
  const [userInput, setUserInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [codeSessionId, setCodeSessionId] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const editorRef = useRef(null);
  const inputRef = useRef(null);
  const outputEndRef = useRef(null);
  const hasSelectedInitialFile = useRef(false);
  const lastContentRef = useRef('');
  const statusPollingRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (!sessionDoc.exists()) return;

        const sessionData = sessionDoc.data();
        const projectId = sessionData.projectId;

        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) return;

        setProject({ id: projectDoc.id, ...projectDoc.data() });

        const filesQuery = query(
          collection(db, 'files'),
          where('projectId', '==', projectId)
        );

        const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
          const filesList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setFiles(filesList);

          if (!hasSelectedInitialFile.current && filesList.length > 0) {
            setSelectedFile(filesList[0]);
            setFileContent(filesList[0].content || '');
            lastContentRef.current = filesList[0].content || '';
            hasSelectedInitialFile.current = true;
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading session/project:', error);
      }
    };

    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (selectedFile) {
      setFileContent(selectedFile.content || '');
      lastContentRef.current = selectedFile.content || '';
    }
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;

    const unsubscribe = onSnapshot(doc(db, 'files', selectedFile.id), (docSnap) => {
      const updatedFile = { id: docSnap.id, ...docSnap.data() };
      if (updatedFile.content !== lastContentRef.current) {
        setFileContent(updatedFile.content || '');
        lastContentRef.current = updatedFile.content || '';
      }
    });

    return () => unsubscribe();
  }, [selectedFile]);

  // Scroll to bottom of terminal output whenever it updates
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Focus input field when waiting for input
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
      }
    };
  }, []);

  const handleEditorChange = useCallback(
    async (value) => {
      setFileContent(value);
      lastContentRef.current = value;

      if (selectedFile) {
        await updateDoc(doc(db, 'files', selectedFile.id), {
          content: value,
        });
      }
    },
    [selectedFile]
  );

  const handleFileSelect = (file) => {
    if (file.id !== selectedFile?.id) {
      setSelectedFile(file);
      hasSelectedInitialFile.current = true;
    }
  };

  const createNewFile = async () => {
    if (!project) return;
    const fileName = prompt('Enter new file name:');
    if (!fileName) return;

    const newFile = {
      name: fileName,
      content: '',
      projectId: project.id,
    };

    const docRef = await addDoc(collection(db, 'files'), newFile);
    const newFileObj = { id: docRef.id, ...newFile };

    setSelectedFile(newFileObj);
    setFileContent('');
    lastContentRef.current = '';
    hasSelectedInitialFile.current = true;
  };

  const startPolling = (sessionId) => {
    // Clear any existing polling
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
    }

    // Poll for updates every 300ms
    statusPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/status/${sessionId}`);
        const data = await response.json();

        if (data.output && data.output.length > 0) {
          setOutput(prev => [...prev, ...data.output]);
        }
        
        // Update waiting for input status
        if (data.waiting_for_input !== undefined) {
          setWaitingForInput(data.waiting_for_input);
        }

        if (data.status === 'completed') {
          setIsRunning(false);
          clearInterval(statusPollingRef.current);
          statusPollingRef.current = null;
          setCodeSessionId(null);
          setWaitingForInput(false);
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 300);
  };

  const handleRunCode = async () => {
    if (!fileContent.trim()) {
      setOutput([{ type: 'error', text: 'No code to run' }]);
      return;
    }

    // Stop any existing polling
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }

    setIsRunning(true);
    setOutput([{ type: 'system', text: 'Running code...' }]);
    setCodeSessionId(null);
    setWaitingForInput(false);
    setUserInput('');

    try {
      const response = await fetch('http://localhost:8080/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: fileContent }),
      });

      const data = await response.json();
      
      if (data.error) {
        setOutput([{ type: 'error', text: data.error }]);
        setIsRunning(false);
      } else if (data.session_id) {
        setCodeSessionId(data.session_id);
        startPolling(data.session_id);
      }
    } catch (error) {
      console.error('Error executing code:', error);
      setOutput([{ type: 'error', text: `Failed to execute code: ${error.message}` }]);
      setIsRunning(false);
    }
  };

  const handleInputSubmit = async (e) => {
    e.preventDefault();
    
    if (!codeSessionId || !userInput.trim()) return;
    
    const inputValue = userInput;
    setUserInput('');
    
    // Add user input to output display
    setOutput(prev => [...prev, { type: 'input', text: inputValue }]);
    
    try {
      await fetch(`http://localhost:8080/input/${codeSessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputValue }),
      });
    } catch (error) {
      console.error('Error sending input:', error);
      setOutput(prev => [...prev, { type: 'error', text: `Failed to send input: ${error.message}` }]);
    }
  };

  return (
    <div className="session-editor">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Files</h2>
          <button onClick={createNewFile}>+ New</button>
        </div>
        <ul className="file-list">
          {files.map((file) => (
            <li
              key={file.id}
              className={file.id === selectedFile?.id ? 'active' : ''}
              onClick={() => handleFileSelect(file)}
            >
              {file.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="editor-area">
        <div className="editor-header">
          <div>
            <h3>Session ID: <span>{sessionId}</span></h3>
            <h4>Project: <span>{project?.name || 'Loading...'}</span></h4>
          </div>
          <button 
            className="run-button" 
            onClick={handleRunCode} 
            disabled={isRunning}
          >
            {isRunning ? '⏳ Running...' : '▶ Run'}
          </button>
        </div>

        <div className="code-container">
          {selectedFile ? (
            <CodeMirror
              value={fileContent}
              height="calc(100vh - 230px)"
              theme={dracula} // 🧛 Dark theme
              extensions={[python()]}
              onChange={handleEditorChange}
              basicSetup={{ lineNumbers: true, autocompletion: true }}
            />
          ) : (
            <p>No file selected.</p>
          )}
        </div>

        {/* 🖥 Terminal-like Output Section */}
        <div className="terminal-output">
          <div className="terminal-header">Terminal</div>
          <div className="terminal-content">
            {output.map((item, index) => (
              <div 
                key={index} 
                className={`terminal-line ${item.type}`}
              >
                {item.type === 'input' ? '> ' : ''}{item.text}
              </div>
            ))}
            <div ref={outputEndRef} />
            
            {isRunning && waitingForInput && (
              <form onSubmit={handleInputSubmit} className="terminal-input-form">
                <span className="input-prompt">{'> '}</span>
                <input
                  type="text"
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="terminal-input"
                  placeholder="Enter input here..."
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionEditor;