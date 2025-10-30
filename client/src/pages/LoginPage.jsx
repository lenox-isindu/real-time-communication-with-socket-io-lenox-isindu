import React, { useState } from 'react';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin({
        id: Date.now().toString(),
        username: username.trim(),
        joinedAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-2xl w-full max-w-md">
        <div className="card-body p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💬</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome to PingHub
            </h1>
            <p className="text-base-content/70 mt-2">Real-time professional communication</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Choose your username</span>
              </label>
              <input
                type="text"
                placeholder="Enter your professional username..."
                className="input input-bordered input-lg w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
              <label className="label">
                <span className="label-text-alt">This will be visible to other users</span>
              </label>
            </div>

            <button 
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={!username.trim()}
            >
              Join PingHub Chat
            </button>
          </form>

          <div className="mt-8 p-4 bg-base-200 rounded-lg">
            <h3 className="font-semibold mb-2">✨ Features you'll enjoy:</h3>
            <ul className="text-sm space-y-1 text-base-content/70">
              <li>• Real-time messaging with colleagues</li>
              <li>• Professional chat rooms</li>
              <li>• File sharing capabilities</li>
              <li>• Secure and reliable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;