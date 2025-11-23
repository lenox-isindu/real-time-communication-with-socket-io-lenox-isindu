import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;
let socketListeners = new Set();

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Get API base URL from environment variable - MUST BE INSIDE useEffect
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // SINGLE socket instance for entire app
    if (!socketInstance) {
      socketInstance = io(API_BASE_URL);
      console.log('Creating NEW socket instance:', socketInstance.id);
      
      
      socketInstance.on('connect', () => {
        console.log('Connected to server with socket:', socketInstance.id);
        socketListeners.forEach(listener => {
          if (listener.setIsConnected) listener.setIsConnected(true);
        });
      });

      socketInstance.on('disconnect', () => {
        console.log(' Disconnected from server');
        socketListeners.forEach(listener => {
          if (listener.setIsConnected) listener.setIsConnected(false);
        });
      });

      socketInstance.on('users:online', (data) => {
        console.log('Received users:', data.users);
        socketListeners.forEach(listener => {
          if (listener.setUserCount) listener.setUserCount(data.count);
          if (listener.setOnlineUsers) listener.setOnlineUsers(data.users || []);
        });
      });

      socketInstance.on('user:joined', (data) => {
        console.log('User joined:', data.username);
        socketInstance.emit('users:get');
      });

      socketInstance.on('user:left', (data) => {
        console.log('User left:', data.username);
        socketInstance.emit('users:get');
      });
    } else {
      console.log('Reusing EXISTING socket instance:', socketInstance.id);
    }

    // listener object for this hook instance
    const listener = {
      setIsConnected,
      setUserCount, 
      setOnlineUsers
    };

    socketListeners.add(listener);
    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    // Request initial data
   if (socketInstance.connected) {
  socketInstance.emit('users:get');

  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isNewUser = storedUser?.isNewUser === true;

  if (!isNewUser) {
    console.log(' Fetching old messages for returning user');
    socketInstance.emit('messages:get', { room: 'global' });
  } else {
    console.log('New user detected — skipping old messages fetch');
  }
}
    // remove this listener but keep socket connection
    return () => {
      console.log('Cleaning up useSocket hook (keeping connection)');
      socketListeners.delete(listener);
    };
  }, []);

  return {
    socket,
    isConnected,
    userCount,
    onlineUsers
  };
};