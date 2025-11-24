import React from 'react';

const WelcomeBanner = ({ username }) => {
  return (
    <div className="alert alert-info shadow-lg">
      <div className="flex items-start gap-4">
        <div className="text-2xl flex-shrink-0"></div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">Welcome to PingHubs, {username}!</h3>
          <div className="text-sm mt-1">
            You're now connected to the global team chat. Start collaborating with your colleagues.
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;