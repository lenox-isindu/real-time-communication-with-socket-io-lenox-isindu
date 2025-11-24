import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import FileOverview from '../UI/FileOverview';

const GroupSidebar = ({ group, currentUser, messages = [] }) => {
  const { socket, onlineUsers } = useSocket();
  const [groupMembers, setGroupMembers] = useState([]);
  const [showFileOverview, setShowFileOverview] = useState(false);

  console.log('GroupSidebar Debug:', {
    groupId: group?.groupId,
    messagesReceived: messages.length,
    fileMessages: messages.filter(msg => msg.type === 'file').length,
    groupFiles: messages.filter(msg => msg.type === 'file' && msg.room === group?.groupId).length
  });

  useEffect(() => {
    if (!socket || !group) return;

    console.log('GroupSidebar mounted for group:', group.groupId);

    const handleMembersUpdate = (data) => {
      if (data.groupId === group.groupId) {
        console.log('Group members updated:', data.users);
        setGroupMembers(data.users);
      }
    };

    socket.on('group:members:update', handleMembersUpdate);
    socket.emit('group:members:get', group.groupId);

    return () => {
      socket.off('group:members:update', handleMembersUpdate);
    };
  }, [socket, group]);

  
  const getMemberOnlineStatus = (userId) => {
    const onlineUser = onlineUsers.find(user => 
      user.userId === userId || user.id === userId
    );
    return {
      isOnline: onlineUser ? onlineUser.isOnline : false,
      lastSeen: onlineUser?.lastSeen || null
    };
  };

  // Count group file messages 
  const groupFileCount = messages.filter(msg => 
    msg.type === 'file'
  ).length;

  console.log('📁 Final file count:', groupFileCount);

  return (
    <div className="space-y-6 sticky top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Group Info Card */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-6">
          <h3 className="card-title text-lg">Group Info</h3>
          <div className="space-y-3 mt-4">
            <div>
              <p className="font-semibold">{group.name}</p>
              <p className="text-sm text-base-content/60">{group.description}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Type:</span>
              <span className={`badge badge-sm ${group.isPrivate ? 'badge-warning' : 'badge-info'}`}>
                {group.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Members:</span>
              <span>{groupMembers.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Files Shared:</span>
              <span>{groupFileCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Created:</span>
              <span>{new Date(group.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-6">
          <h3 className="card-title text-lg">⚡ Quick Actions</h3>
          <div className="space-y-2 mt-4">
            <button 
              className="btn btn-outline btn-sm w-full justify-start gap-2 relative"
              onClick={() => setShowFileOverview(true)}
            >
              <span>📁</span>
              Group Files
              {groupFileCount > 0 && (
                <span className="badge badge-primary badge-xs absolute -top-1 -right-1">
                  {groupFileCount}
                </span>
              )}
            </button>
            <button className="btn btn-outline btn-sm w-full justify-start gap-2">
              <span>📌</span>
              Pinned Messages
            </button>
            <button className="btn btn-outline btn-sm w-full justify-start gap-2">
              
              
            </button>
          </div>
        </div>
      </div>

      {/* Group Members */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-6">
          <h3 className="card-title text-lg">👥 Members ({groupMembers.length})</h3>
          <div className="space-y-3 mt-4 max-h-60 overflow-y-auto">
            {groupMembers.length > 0 ? (
              groupMembers.map((member) => {
                const { isOnline } = getMemberOnlineStatus(member.userId);
                const isAdmin = group.admins?.includes(member.userId);
                const isYou = member.userId === currentUser.userId || member.userId === currentUser.id;
                
                return (
                  <div key={member.userId} className={`flex items-center gap-3 p-2 rounded-lg ${
                    isYou ? 'bg-primary/20' : 'hover:bg-base-200'
                  }`}>
                    <div className="avatar placeholder">
                      <div className={`${
                        isOnline ? 'bg-success' : 'bg-gray-400'
                      } rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white`}>
                        {member.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm truncate">
                          {member.username}
                          {isYou && ' (You)'}
                        </p>
                        {isAdmin && <span className="text-xs">👑</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          isOnline ? 'bg-success' : 'bg-gray-400'
                        }`}></div>
                        <p className="text-xs text-base-content/60">
                          {isOnline ? 'Online' : `Offline`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-base-content/60 text-center py-4">
                Loading members...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* File Overview Modal */}
      <FileOverview
        messages={messages} 
        currentUser={currentUser}
        isOpen={showFileOverview}
        onClose={() => setShowFileOverview(false)}
      />
    </div>
  );
};

export default GroupSidebar;