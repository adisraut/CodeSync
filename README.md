# CodeSync

CodeSync is a cloud-native, web-based code editor that provides users with an accessible and setup-free Python development environment. Write, execute, and manage your Python code entirely in the cloud, with real-time saving and secure authentication.

## 🌟 Features

- **Zero Setup Required**: Access a fully-featured Python development environment directly in your browser
- **Real-time Code Execution**: Run Python code on the fly using secure Docker containers
- **Auto-saving Projects**: All your code is automatically saved to the cloud as you type
- **User Authentication**: Secure access with email/password or Google sign-in
- **Project & File Management**: Create, organize, and manage multiple projects and files
- **Responsive UI**: Modern, intuitive interface built with React and Tailwind CSS

## 🔧 Tech Stack

### Frontend
- **React**: Component-based UI library
- **CodeMirror**: Feature-rich code editor
- **Tailwind CSS**: Utility-first CSS framework for responsive design

### Backend
- **Flask**: Lightweight Python web framework for API development
- **Docker**: Secure, isolated code execution environment
- **Firebase**:
  - **Authentication**: User login and access control
  - **Firestore**: Real-time database for project storage
  - **Hosting**: Frontend deployment

### Cloud Infrastructure
- **Google Cloud Run**: Serverless backend hosting
- **Firebase**: Frontend hosting and authentication

## 📋 Architecture

CodeSync follows a modern cloud-native architecture with loose coupling between components:

1. **Frontend Layer** (React + CodeMirror)
   - Handles user interaction, code input, file management
   - Communicates with backend via API calls
   - Syncs with Firestore for real-time storage

2. **Backend Layer** (Flask + Docker on Google Cloud Run)
   - Receives code from frontend
   - Executes it securely within Docker containers
   - Returns execution results to the frontend

3. **Data Layer** (Firebase Firestore)
   - Stores user projects and files
   - Enables real-time synchronization
   - Enforces user-specific access control

4. **Authentication Layer** (Firebase Auth)
   - Manages user registration and login
   - Secures access to personal projects

## 🚀 Getting Started

### Prerequisites
- Node.js and npm
- Python 3.10+
- Docker
- Firebase account
- Google Cloud Platform account

### Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/codesync.git
cd codesync
```

2. **Set up the frontend**

```bash
cd frontend
npm install
```

3. **Set up Firebase configuration**

Create a `.env` file in the frontend directory with your Firebase config:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

4. **Set up the backend**

```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

5. **Run Docker for code execution**

Ensure Docker is running on your system.

6. **Start the development servers**

Frontend:
```bash
cd frontend
npm start
```

Backend:
```bash
cd backend
flask run
```

7. **Visit the application**

Open your browser and navigate to `http://localhost:3000`

## 🔒 Security

- User code is executed in isolated Docker containers to prevent system access
- Authentication is handled securely via Firebase Auth
- Firestore security rules ensure users can only access their own data
- HTTPS is enforced for all communications

## 🔄 Deployment

The application is deployed using Google Cloud Platform:
- Frontend on Firebase Hosting
- Backend on Google Cloud Run
- Live demo available at: https://codesync-2025.uc.r.appspot.com

## 🔮 Future Scope

Future enhancements planned for CodeSync include:
- Support for additional programming languages
- Real-time collaboration features
- Debugging capabilities
- Code versioning and history
- Team access control and sharing
- Integration with version control systems

## 📝 License

[MIT License](LICENSE)

## 👨‍💻 Author

- Aditya Raut
- Harikrishnan Gopal

---

*Made with ❤️ for developers who want to code anywhere, anytime*
