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
import { dracula } from '@uiw/codemirror-theme-dracula';
import io from 'socket.io-client';
import './SessionEditor.css';

// Create a socket connection to the backend
const socket = io('http://localhost:8080');

const SessionEditor = () => {
  const { sessionId } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [output, setOutput] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [codeSessionId, setCodeSessionId] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const editorRef = useRef(null);
  const inputRef = useRef(null);
  const outputEndRef = useRef(null);
  const hasSelectedInitialFile = useRef(false);
  const lastContentRef = useRef('');

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

  // Auto-scroll to bottom of output when it changes
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Auto-focus input when waiting for input
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput]);

  // Socket event handlers
  useEffect(() => {
    // Handle incoming output from the backend
    socket.on('output', (data) => {
      if (data.session_id === sessionId) {
        setOutput((prev) => [...prev, ...data.output]);
      }
    });

    // Handle when input is required by the process
    socket.on('input_required', (data) => {
      if (data.session_id === sessionId) {
        setWaitingForInput(true);
      }
    });

    // Handle when execution is completed
    socket.on('execution_complete', (data) => {
      if (data.session_id === sessionId) {
        setIsRunning(false);
        setWaitingForInput(false);
        setCodeSessionId(null);
        setOutput((prev) => [...prev, { type: 'system', text: 'Execution completed.' }]);
      }
    });

    // Handle execution errors
    socket.on('execution_error', (error) => {
      setOutput((prev) => [...prev, { type: 'error', text: error }]);
      setIsRunning(false);
      setWaitingForInput(false);
      setCodeSessionId(null);
    });

    // Handle successful input submission
    socket.on('input_sent', (data) => {
      if (data.session_id === sessionId) {
        setWaitingForInput(false);
      }
    });

    // Handle session started confirmation
    socket.on('session_started', (data) => {
      if (data.session_id === sessionId) {
        setCodeSessionId(sessionId);
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      socket.off('output');
      socket.off('input_required');
      socket.off('execution_complete');
      socket.off('execution_error');
      socket.off('input_sent');
      socket.off('session_started');
    };
  }, [sessionId]);

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

  const handleRunCode = () => {
    if (!fileContent.trim()) {
      setOutput([{ type: 'error', text: 'No code to run' }]);
      return;
    }

    setIsRunning(true);
    setOutput([{ type: 'system', text: 'Running code...' }]);
    setWaitingForInput(false);
    setUserInput('');

    socket.emit('run_code', { session_id: sessionId, code: fileContent });
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!sessionId || !isRunning) return;

    const inputValue = userInput;
    setUserInput('');
    setOutput((prev) => [...prev, { type: 'input', text: inputValue }]);
    setWaitingForInput(false);

    socket.emit('send_input', {
      session_id: sessionId,
      input: inputValue,
    });
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
            <h3>
              Session ID: <span>{sessionId}</span>
            </h3>
            <h4>
              Project: <span>{project?.name || 'Loading...'}</span>
            </h4>
          </div>
          <button
            className="run-button"
            onClick={handleRunCode}
            disabled={isRunning && !waitingForInput}
          >
            {isRunning && !waitingForInput ? '⏳ Running...' : '▶ Run'}
          </button>
        </div>

        <div className="code-container">
          {selectedFile ? (
            <CodeMirror
              value={fileContent}
              height="calc(100vh - 230px)"
              theme={dracula}
              extensions={[python()]}
              onChange={handleEditorChange}
              basicSetup={{ lineNumbers: true, autocompletion: true }}
            />
          ) : (
            <p>No file selected.</p>
          )}
        </div>

        <div className="terminal-output">
          <div className="terminal-header">Terminal</div>
          <div className="terminal-content">
            {output.map((item, index) => (
              <div key={index} className={`terminal-line ${item.type}`}>
                {item.type === 'input' ? '> ' : ''}
                {item.text}
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
                  autoFocus
                />
                <button type="submit" className="input-submit-button">
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionEditor;