import React, { useState, useEffect } from 'react';

const ReactionsDetailModal = ({ isOpen, onClose, reactions, reactionFilter = null }) => {
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    if (!isOpen || !reactions) return;

    // Get API base URL from environment variable - MUST BE INSIDE useEffect
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Fetch user details for reactions
    const fetchUserDetails = async () => {
      try {
        const userIds = Object.keys(reactions);
        const responses = await Promise.all(
          userIds.map(userId => 
            fetch(`${API_BASE_URL}/api/users/${userId}`)
              .then(res => res.json())
              .catch(() => null)
          )
        );

        const details = {};
        responses.forEach((user, index) => {
          if (user) {
            details[userIds[index]] = user;
          }
        });

        setUserDetails(details);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, [isOpen, reactions]);

  if (!isOpen) return null;

  // Group reactions by emoji
  const reactionGroups = {};
  Object.entries(reactions).forEach(([userId, reaction]) => {
    if (reactionFilter && reaction !== reactionFilter) return;
    
    if (!reactionGroups[reaction]) {
      reactionGroups[reaction] = [];
    }
    reactionGroups[reaction].push(userId);
  });

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">
          {reactionFilter ? `${reactionFilter} Reactions` : 'All Reactions'}
        </h3>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(reactionGroups).map(([reaction, userIds]) => (
            <div key={reaction} className="border-b border-base-300 pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{reaction}</span>
                <span className="badge badge-neutral">{userIds.length}</span>
              </div>
              
              <div className="space-y-2">
                {userIds.map(userId => {
                  const user = userDetails[userId];
                  return (
                    <div key={userId} className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {user?.username || `User ${userId}`}
                        </p>
                        {user?.email && (
                          <p className="text-xs text-base-content/60">{user.email}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ReactionsDetailModal;