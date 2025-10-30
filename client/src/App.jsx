import React, { useState } from 'react';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div className="min-h-screen gradient-bg">
      {currentUser ? (
        <ChatPage currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
      ) : (
        <LoginPage onLogin={setCurrentUser} />
      )}
    </div>
  );
}

export default App;