import React, { useState, useEffect } from 'react';
import FileMessage from './FileMessage';

const FileOverview = ({ messages, currentUser, isOpen, onClose }) => {
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('all'); 
  const [sortBy, setSortBy] = useState('newest'); 

  useEffect(() => {
    // Extract all file messages
    const fileMessages = messages.filter(msg => msg.type === 'file' && msg.file);
    setFiles(fileMessages);
  }, [messages]);

  const handleDownload = (fileMsg) => {
    // Get API base URL from environment variable - INSIDE the function
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const fileUrl = fileMsg.file.url || `${API_BASE_URL}/api/files/${fileMsg.file.filename}`;
    window.open(fileUrl, '_blank');
  };

  const categorizeFile = (file) => {
    const mimeType = file.mimetype || '';
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'documents';
    return 'other';
  };

  const filteredFiles = files.filter(fileMsg => {
    if (filter === 'all') return true;
    return categorizeFile(fileMsg.file) === filter;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.timestamp) - new Date(a.timestamp);
      case 'oldest':
        return new Date(a.timestamp) - new Date(b.timestamp);
      case 'name':
        return (a.file.originalName || a.file.name).localeCompare(b.file.originalName || b.file.name);
      case 'size':
        return (b.file.size || 0) - (a.file.size || 0);
      default:
        return 0;
    }
  });

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.startsWith('audio/')) return '  audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType?.includes('document') || mimeType?.includes('word')) return 'documents';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStats = () => {
    const stats = {
      total: files.length,
      images: files.filter(f => categorizeFile(f.file) === 'images').length,
      documents: files.filter(f => categorizeFile(f.file) === 'documents').length,
      videos: files.filter(f => categorizeFile(f.file) === 'videos').length,
      audio: files.filter(f => categorizeFile(f.file) === 'audio').length,
      other: files.filter(f => categorizeFile(f.file) === 'other').length,
    };
    return stats;
  };

  const stats = getStats();

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">📁 Shared Files</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          <div className="stat place-items-center p-2 bg-base-200 rounded">
            <div className="stat-title text-xs">Total</div>
            <div className="stat-value text-lg">{stats.total}</div>
          </div>
          <div className="stat place-items-center p-2 bg-base-200 rounded">
            <div className="stat-title text-xs">Images</div>
            <div className="stat-value text-lg">{stats.images}</div>
          </div>
          <div className="stat place-items-center p-2 bg-base-200 rounded">
            <div className="stat-title text-xs">Documents</div>
            <div className="stat-value text-lg">{stats.documents}</div>
          </div>
          <div className="stat place-items-center p-2 bg-base-200 rounded">
            <div className="stat-title text-xs">Videos</div>
            <div className="stat-value text-lg">{stats.videos}</div>
          </div>
          <div className="stat place-items-center p-2 bg-base-200 rounded">
            <div className="stat-title text-xs">Audio</div>
            <div className="stat-value text-lg">{stats.audio}</div>
          </div>
          <div className="stat place-items-center p-2 bg-base-200 rounded">
            <div className="stat-title text-xs">Other</div>
            <div className="stat-value text-lg">{stats.other}</div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="label">
              <span className="label-text">Filter by type</span>
            </label>
            <select 
              className="select select-bordered select-sm w-full"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Files ({stats.total})</option>
              <option value="images">Images ({stats.images})</option>
              <option value="documents">Documents ({stats.documents})</option>
              <option value="videos">Videos ({stats.videos})</option>
              <option value="audio">Audio ({stats.audio})</option>
              <option value="other">Other ({stats.other})</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="label">
              <span className="label-text">Sort by</span>
            </label>
            <select 
              className="select select-bordered select-sm w-full"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="size">Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto">
          {sortedFiles.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <div className="text-4xl mb-2">📁</div>
              <p>No files found</p>
              <p className="text-sm">Files shared in chat will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedFiles.map((fileMsg) => (
                <div 
                  key={fileMsg._id} 
                  className="bg-base-100 border border-base-300 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {getFileIcon(fileMsg.file.mimetype)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" title={fileMsg.file.originalName || fileMsg.file.name}>
                        {fileMsg.file.originalName || fileMsg.file.name}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-base-content/60 mt-1">
                        <span>{formatFileSize(fileMsg.file.size)}</span>
                        <span>•</span>
                        <span>{new Date(fileMsg.timestamp).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>by {fileMsg.username}</span>
                      </div>

                      {fileMsg.file.expiresAt && (
                        <div className="flex items-center gap-1 text-xs text-warning mt-1">
                          <span>⏰</span>
                          <span>Expires: {new Date(fileMsg.file.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="flex gap-2 mt-2">
                        <button 
                          className="btn btn-xs btn-primary"
                          onClick={() => handleDownload(fileMsg)}
                        >
                           Download
                        </button>
                        
                        <button 
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            const messageElement = document.querySelector(`[data-message-id="${fileMsg._id}"]`);
                            if (messageElement) {
                              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              messageElement.classList.add('bg-warning/20');
                              setTimeout(() => {
                                messageElement.classList.remove('bg-warning/20');
                              }, 2000);
                              onClose();
                            }
                          }}
                        >
                           Find in chat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-action mt-4">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default FileOverview;