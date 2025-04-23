from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import subprocess
import tempfile
import os
import threading
import time
import select

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*')
active_processes = {}

@app.route('/', methods=['GET'])
def home():
    return "Coding Platform API is running. Use Socket.IO to run code."

def read_output(session_id, pipe, is_error=False):
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            
            stripped = line.rstrip()
            event_type = 'error' if is_error else 'output'
            
            socketio.emit('output', {
                'session_id': session_id, 
                'output': [{'type': event_type, 'text': stripped}]
            })
            
            # If the process isn't in error mode and waiting for input
            if not is_error and 'input' in stripped.lower():
                active_processes[session_id]['waiting_for_input'] = True
                socketio.emit('input_required', {'session_id': session_id})
                
        pipe.close()
    except Exception as e:
        socketio.emit('output', {
            'session_id': session_id,
            'output': [{'type': 'error', 'text': f"Error reading output: {str(e)}"}]
        })

def monitor_process(session_id):
    try:
        process_data = active_processes[session_id]
        process = process_data['process']
        
        # While the process is running
        while process.poll() is None:
            # Check if process is waiting for input by monitoring stdout
            if process_data.get('waiting_for_input', False) == False:
                # Check if stdout has data but is waiting for input
                r, _, _ = select.select([process.stdout], [], [], 0.1)
                if not r:
                    process_data['waiting_for_input'] = True
                    socketio.emit('input_required', {'session_id': session_id})
            
            time.sleep(0.1)
        
        # Process has finished
        socketio.emit('execution_complete', {
            'session_id': session_id,
            'exit_code': process.returncode
        })
    except Exception as e:
        socketio.emit('execution_error', str(e))
    finally:
        # Clean up
        if session_id in active_processes:
            try:
                os.remove(active_processes[session_id]['file_path'])
            except:
                pass
            active_processes.pop(session_id, None)

@socketio.on('run_code')
def handle_run_code(data):
    code = data.get('code', '')
    session_id = data.get('session_id')

    if not session_id:
        emit('error', {'text': 'Missing session_id'})
        return

    # Kill any existing process for this session
    if session_id in active_processes:
        try:
            old_process = active_processes[session_id]['process']
            if old_process.poll() is None:
                old_process.terminate()
                old_process.wait(timeout=1)
        except:
            pass  # Best effort to kill previous process
        active_processes.pop(session_id, None)

    with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as temp:
        temp.write(code.encode())
        temp.flush()
        file_path = temp.name

    try:
        process = subprocess.Popen(
            ['python3', '-u', file_path],  # -u for unbuffered output
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            bufsize=0  # Unbuffered
        )

        active_processes[session_id] = {
            'process': process,
            'file_path': file_path,
            'waiting_for_input': False
        }

        threading.Thread(target=read_output, args=(session_id, process.stdout), daemon=True).start()
        threading.Thread(target=read_output, args=(session_id, process.stderr, True), daemon=True).start()
        threading.Thread(target=monitor_process, args=(session_id,), daemon=True).start()

        emit('session_started', {'session_id': session_id})
    except Exception as e:
        emit('execution_error', str(e))

@socketio.on('send_input')
def handle_input(data):
    session_id = data.get('session_id')
    user_input = data.get('input', '')

    if session_id in active_processes:
        process_data = active_processes[session_id]
        process = process_data['process']
        
        if process.poll() is None:
            try:
                process.stdin.write(user_input + '\n')
                process.stdin.flush()
                process_data['waiting_for_input'] = False
                emit('input_sent', {'session_id': session_id, 'status': 'success'})
            except Exception as e:
                emit('error', {'session_id': session_id, 'text': f"Error sending input: {str(e)}"})
        else:
            emit('error', {'session_id': session_id, 'text': 'Process is no longer running'})
    else:
        emit('error', {'session_id': session_id, 'text': 'No active process for this session'})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8080, allow_unsafe_werkzeug=True)