import React, { useState, useEffect, useCallback } from 'react';

const FileMessage = ({ file, messageUser }) => {
  const [fileInfo, setFileInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const checkFileStatus = useCallback(async () => {
    // Get API base URL from environment variable - INSIDE the function
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    try {
      // Extract filename from URL 
      const filename = file.filename || file.url?.split('/').pop();
      if (!filename) return;

      const response = await fetch(`${API_BASE_URL}/api/files/info/${filename}`);
      if (response.ok) {
        const data = await response.json();
        setFileInfo(data);
        setIsExpired(data.isExpired);
      }
    } catch (error) {
      console.error('Error checking file status:', error);
      // Fallback:
      if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
        setIsExpired(true);
      }
    }
  }, [file]);

  useEffect(() => {
    checkFileStatus();
  }, [checkFileStatus]);

  const handleDownload = async () => {
    if (isExpired) return;

    // Get API base URL from environment variable - INSIDE the function
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    setIsDownloading(true);
    try {
      
      const fileUrl = file.url || `${API_BASE_URL}/api/files/${file.filename}`;
      const response = await fetch(fileUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = file.originalName || file.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        const data = await response.json();
        if (data.expired) {
          setIsExpired(true);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. The file may have expired or is unavailable.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📎';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('text')) return 'document';
    return '📎';
  };

  const getFileExtension = (filename) => {
    return filename?.split('.').pop()?.toUpperCase() || 'FILE';
  };

  if (isExpired) {
    return (
      <div className="bg-warning/20 border border-warning/30 rounded-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⏰</span>
          <div>
            <p className="font-semibold text-warning">File Expired</p>
            <p className="text-sm text-warning/70">{file.originalName || file.name}</p>
          </div>
        </div>
        <p className="text-xs text-warning/60">
          Ask <strong>{messageUser}</strong> to reshare this file
        </p>
      </div>
    );
  }

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-3 max-w-xs hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" title={file.originalName || file.name}>
            {file.originalName || file.name}
          </p>
          <p className="text-xs text-base-content/60">
            {formatFileSize(file.size)} • {getFileExtension(file.originalName || file.name)}
          </p>
          {fileInfo?.expiresAt && (
            <p className="text-xs text-warning mt-1">
              Expires: {new Date(fileInfo.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      <button
        className={`btn btn-sm w-full ${isDownloading ? 'loading' : 'btn-primary'}`}
        onClick={handleDownload}
        disabled={isDownloading || isExpired}
      >
        {isDownloading ? 'Downloading...' : ' Download'}
      </button>
    </div>
  );
};

export default FileMessage;