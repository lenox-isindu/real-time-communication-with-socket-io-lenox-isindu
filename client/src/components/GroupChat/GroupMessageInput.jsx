import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import FileUpload from '../UI/FileUpload';

const GroupMessageInput = ({ currentUser, group }) => {
  const [message, setMessage] = useState('');
  const { socket } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleStopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      socket.emit('user:typing', {
        username: currentUser.username,
        isTyping: false,
        room: group.groupId
      });
    }
  }, [isTyping, socket, currentUser.username, group.groupId]);

  const sendMessage = () => {
    if (message.trim() && socket) {
      const userId = currentUser.userId || currentUser.id || currentUser._id;
      
      if (!userId) {
        console.error(' No user ID found in currentUser:', currentUser);
        return;
      }

      console.log('Sending group message with userId:', userId);

      socket.emit('group:message:send', {
        groupId: group.groupId,
        username: currentUser.username,
        userId: userId,
        text: message.trim()
      });
      setMessage('');
      handleStopTyping();
    }
  };

 const handleFileUpload = async (fileData) => {
  if (isUploading) {
    console.log('File upload already in progress, skipping...');
    return;
  }

  setIsUploading(true);
  const userId = currentUser.userId || currentUser.id || currentUser._id;
  
  if (!userId) {
    console.error('No user ID found for file upload');
    setIsUploading(false);
    return;
  }

  try {
    console.log('FileUpload callback received:', fileData);

    
    const fileMessage = {
      groupId: group.groupId,
      username: currentUser.username,
      userId: userId,
      type: 'file',
      file: {
        filename: fileData.filename,
        originalName: fileData.originalName,
        url: fileData.url,
        size: fileData.size,
        mimetype: fileData.mimetype,
        expiresAt: fileData.expiresAt,
        uploadedBy: fileData.uploadedBy,
        room: fileData.room
      },
      text: '', 
      timestamp: new Date()
    };

    console.log('Complete file message before socket emit:', fileMessage);

    // file message via socket
    socket.emit('group:message:send', fileMessage);

    console.log('File message sent via socket');

  } catch (error) {
    console.error('Error handling file upload:', error);
  } finally {
    setIsUploading(false);
  }
};
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('user:typing', {
        username: currentUser.username,
        isTyping: true,
        room: group.groupId
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setMessage(newValue);
    if (newValue.trim()) {
      handleTyping();
    } else {
      handleStopTyping();
    }
  };

  useEffect(() => {
    return () => {
      handleStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [handleStopTyping]);

  return (
    <div className="p-4 border-t border-base-300">
      <div className="flex items-center gap-2 mb-2">
        <FileUpload 
          onFileUpload={handleFileUpload}
          currentUser={currentUser}
          room={group.groupId}
        />
        
        <div className="join flex-1">
          <input
            type="text"
            placeholder={`Message ${group.name}...`}
            className="input input-bordered join-item flex-1"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            onBlur={handleStopTyping}
            maxLength={500}
          />
          <button 
            className="btn btn-primary join-item"
            onClick={sendMessage}
            disabled={!message.trim()}
          >
            Send
          </button>
        </div>
      </div>
      <div className="text-xs text-base-content/50">
        Press Enter to send 
      </div>
    </div>
  );
};

export default GroupMessageInput;