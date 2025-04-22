from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import queue
import threading
import time
import sys

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Store active processes
active_processes = {}

@app.route('/', methods=['GET'])
def home():
    return "Coding Platform API is running. Use POST /run to execute code."

@app.route('/run', methods=['POST'])
def run_code():
    try:
        data = request.get_json()
        code = data.get('code', '')
        
        # Generate a session ID for this code execution
        session_id = str(time.time())
        
        # Write code to a temporary Python file
        with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as temp:
            # Add python unbuffered flag to ensure input/output isn't buffered
            temp.write(code.encode())
            temp.flush()
            file_path = temp.name
        
        # Start process with pipes for stdin/stdout/stderr
        # Use -u flag to run Python in unbuffered mode
        process = subprocess.Popen(
            ['python3', '-u', file_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            bufsize=0
        )
        
        # Store process and queues for this session
        active_processes[session_id] = {
            'process': process,
            'file_path': file_path,
            'output': [],
            'waiting_for_input': False
        }
        
        # Start threads to monitor process output
        def read_output(pipe, is_error=False):
            for line in iter(pipe.readline, ''):
                if is_error:
                    active_processes[session_id]['output'].append({
                        'type': 'error',
                        'text': line.rstrip()
                    })
                else:
                    # Check if line contains input prompt
                    if "input(" in line or ":" in line or "?" in line:
                        active_processes[session_id]['waiting_for_input'] = True
                    
                    active_processes[session_id]['output'].append({
                        'type': 'output',
                        'text': line.rstrip()
                    })
            
        threading.Thread(target=read_output, args=(process.stdout,), daemon=True).start()
        threading.Thread(target=read_output, args=(process.stderr, True), daemon=True).start()
        
        return jsonify({
            'session_id': session_id,
            'status': 'running'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/status/<session_id>', methods=['GET'])
def get_status(session_id):
    if session_id not in active_processes:
        return jsonify({'error': 'Session not found'})
    
    process_data = active_processes[session_id]
    process = process_data['process']
    output = process_data['output'].copy()
    waiting_for_input = process_data['waiting_for_input']
    
    # Clear output queue for next call
    process_data['output'] = []
    
    status = 'running'
    if process.poll() is not None:
        status = 'completed'
        # Clean up completed process
        if status == 'completed':
            try:
                os.remove(process_data['file_path'])
            except:
                pass
            active_processes.pop(session_id, None)
    
    return jsonify({
        'status': status,
        'output': output,
        'waiting_for_input': waiting_for_input,
        'exit_code': process.returncode if process.poll() is not None else None
    })

@app.route('/input/<session_id>', methods=['POST'])
def send_input(session_id):
    if session_id not in active_processes:
        return jsonify({'error': 'Session not found'})
    
    data = request.get_json()
    user_input = data.get('input', '')
    
    process = active_processes[session_id]['process']
    if process.poll() is None:  # Process is still running
        try:
            process.stdin.write(user_input + '\n')
            process.stdin.flush()
            active_processes[session_id]['waiting_for_input'] = False
            return jsonify({'status': 'input_sent'})
        except Exception as e:
            return jsonify({'error': f'Failed to send input: {str(e)}'})
    else:
        return jsonify({'error': 'Process is no longer running'})

# ✅ Add this to actually run the Flask server
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)