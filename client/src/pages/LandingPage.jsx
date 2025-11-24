import React, { useState, useEffect, useRef } from 'react';
import RegisterForm from '../components/Auth/RegisterForm';
import LoginForm from '../components/Auth/LoginForm';

const LandingPage = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('register');
  const vantaRef = useRef(null);

  useEffect(() => {
    let vantaEffect = null;

    const initVanta = async () => {
      try {
        const THREE = await import('three');
        const VANTA = await import('vanta/dist/vanta.waves.min');
        
        vantaEffect = VANTA.default({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x2563eb,
          shininess: 35.00,
          waveHeight: 15.00,
          waveSpeed: 0.75,
          zoom: 0.65
        });
      } catch (_error) {
        console.log('Vanta.js not loaded, using fallback background');
      }
    };

    initVanta();

    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, []);

  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-green-600">
      <div className="card bg-base-100 shadow-2xl w-full max-w-md">
        <div className="card-body p-8">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-4xl">💬</div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                PingHub
              </h1>
            </div>
            <p className="text-base-content/60">Professional Team Chat</p>
          </div>

          {/* Tabs */}
          <div className="tabs tabs-boxed mb-6">
            <button 
              className={`tab tab-lg flex-1 ${activeTab === 'register' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
            <button 
              className={`tab tab-lg flex-1 ${activeTab === 'login' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'register' ? (
            <RegisterForm onLogin={onLogin} />
          ) : (
            <LoginForm onLogin={onLogin} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;