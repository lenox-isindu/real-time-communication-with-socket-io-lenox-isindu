import React, { useState } from 'react';

const FileUpload = ({ onFileUpload, currentUser, room = 'global' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Get API base URL from environment variable - INSIDE the function
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', currentUser.userId || currentUser.id);
    formData.append('username', currentUser.username);
    if (room && room !== 'global') {
      formData.append('room', room);
    }

    try {
      console.log(' Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        room: room
      });

      const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        console.log('File upload successful:', result.file);
        
        
        if (onFileUpload) {
          onFileUpload(result.file);
        }
      } else {
        console.error('Upload failed:', result.error);
        alert('File upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('File upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="relative">
      <label 
        className={`btn btn-ghost btn-sm ${isUploading ? 'loading' : ''} ${dragOver ? 'bg-primary/20' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title="Upload file"
      >
        {isUploading ? '📤' : '📎'}
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          disabled={isUploading}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.mp4,.mp3"
        />
      </label>
      
      {dragOver && (
        <div className="absolute top-full left-0 mt-2 w-64 p-4 bg-base-100 border-2 border-dashed border-primary rounded-lg shadow-lg z-50">
          <div className="text-center">
            <div className="text-2xl mb-2">📎</div>
            <p className="text-sm font-semibold">Drop file to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;