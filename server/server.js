import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
console.log('DNS resolution configured for IPv4 first');
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import database from './src/config/database.js';
import userService from './src/services/userService.js';
import messageService from './src/services/messageService.js';
import groupService from './src/services/groupService.js';
import MessageController from './src/controllers/messageController.js';
import messageRoutes from './src/routes/messageRoutes.js';
import fileRoutes from './src/routes/fileRoutes.js';

dotenv.config();



const app = express();
const server = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000"
})); 

app.use(express.json({ limit: '10mb' }));

// Serve uploaded files statically
app.use('/api/files', express.static('uploads'));


const connectedUsers = new Map();



// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes


// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    onlineUsers: connectedUsers.size,
    database: database.isConnected ? 'Connected' : 'Disconnected'
  });
});

app.get('/api/health/db', async (req, res) => {
  try {
    res.status(200).json({
      database: database.isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'PingHub Server is running! 🚀',
    database: database.isConnected ? 'Connected' : 'Disconnected',
    onlineUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Use message routes
app.use('/api/messages', messageRoutes);

// Use file routes
app.use('/api/files', fileRoutes);

app.get('/api/users/online', async (req, res) => {
  try {
    const users = await userService.getOnlineUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

app.get('/api/users/all', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

  
    res.json({
      userId: user.userId,
      username: user.username,
      email: user.email,
      profile: user.profile,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await groupService.getPublicGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});
// DEBUG: Get group members and count
app.get('/api/debug/group-members/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await groupService.getGroupById(groupId);
    
    if (!group) {
      return res.json({ error: 'Group not found' });
    }

    res.json({
      groupId,
      groupName: group.name,
      members: group.members,
      memberCount: group.members.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000"
  }
});

// Initialize controllers
const messageController = new MessageController(io, connectedUsers);

// Helper function to broadcast online users
const broadcastOnlineUsers = async () => {
  try {
    const allUsers = await userService.getAllUsers();

    // Get currently connected user IDs
    const connectedUserIds = new Set(Array.from(connectedUsers.values()).map(u => u.userId));

   
    const usersWithAccurateStatus = allUsers.map(user => ({
      ...user,
      isOnline: connectedUserIds.has(user.userId) 
    }));

    io.emit('users:online', {
      count: connectedUserIds.size,
      users: usersWithAccurateStatus
    });

    console.log(` Broadcasting ${connectedUserIds.size} online users out of ${allUsers.length} total users`);
  } catch (error) {
    console.error('Error broadcasting online users:', error);
  }
};

// Socket event handlers
io.on('connection', (socket) => {
  console.log(' User connected:', socket.id);
  console.log(' Total connected users:', connectedUsers.size);
  console.log(' Connected user IDs:', Array.from(connectedUsers.values()).map(u => u.username));

  
  messageController.registerSocketEvents(socket);

  // Send current online users when requested
  socket.on('users:get', async () => {
    await broadcastOnlineUsers();
  });

  // new user joining 
  socket.on('user:join', async (user) => {
    if (!user?.userId) return;

    console.log(` user:join - Updating socket for ${user.username}`);
    
    // Remove any old sockets for this user
    let removedCount = 0;
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.userId === user.userId && sid !== socket.id) {
        console.log(` Removing old socket ${sid} for user ${u.username}`);
        connectedUsers.delete(sid);
        removedCount++;
      }
    }
    console.log(` Removed ${removedCount} old sockets for ${user.username}`);

    connectedUsers.set(socket.id, { ...user, socketId: socket.id, isOnline: true });
    
    await userService.setUserOnline(user.userId, socket.id);
    
    await broadcastOnlineUsers();
    console.log(`${user.username} is online with socket ${socket.id}`);
  });

  
  socket.on('user:reconnect', async (userData) => {
    try {
      if (userData && userData.userId) {
        console.log(' User reconnecting:', userData.username);

        await userService.setUserOnline(userData.userId, socket.id);

        connectedUsers.set(socket.id, {
          ...userData,
          socketId: socket.id,
          isOnline: true,
        });

        await broadcastOnlineUsers();
        console.log(` User ${userData.username} reconnected`);
      }
    } catch (error) {
      console.error('Reconnection error:', error);
    }
  });

  // -- disconnect
  socket.on('disconnect', async (reason) => {
    console.log(' User disconnected:', socket.id, 'Reason:', reason);

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    
    connectedUsers.delete(socket.id);
    
    // Check if user has other active connections
    const hasOtherConnections = Array.from(connectedUsers.values())
      .some(u => u.userId === user.userId);

    if (!hasOtherConnections) {
      // Only mark offline if no other connections exist
      await userService.setUserOfflineBySocketId(socket.id);
      
      if (user.username) {
        io.emit('user:left', {
          username: user.username,
          timestamp: new Date().toISOString(),
        });
        console.log(` User ${user.username} went offline (no other connections)`);
      }
    } else {
      console.log(`⚡ User ${user.username} still has other active connections`);
    }

    
    await broadcastOnlineUsers();
  });

  // Send groups to newly connected client
  socket.on('groups:get', async (userId) => {
    try {
      const userGroups = await groupService.getUserGroups(userId);
      const publicGroups = await groupService.getPublicGroups();
      
     
      const allGroups = [...userGroups, ...publicGroups.filter(g => 
        !userGroups.some(ug => ug.groupId === g.groupId)
      )];
      
      socket.emit('groups:list', allGroups);
    } catch (error) {
      console.error('Groups fetch error:', error);
    }
  });

// REGISTRATION 
socket.on('user:register', async (userData) => {
  try {
    console.log('  Starting registration:', { 
      username: userData.username, 
      email: userData.email
    });

    // Validate required fields
    if (!userData.password || userData.password.length < 6) {
      console.log(' Password validation failed');
      socket.emit('register:error', {
        message: 'Password is required and must be at least 6 characters long.'
      });
      return;
    }

    // Check if username or email already exists
    const exists = await userService.checkUserExists(userData.username, userData.email);
    console.log(' User exists check:', exists);
    
    if (exists.exists) {
      console.log(' Registration failed - user exists');
      socket.emit('register:error', {
        message: `${exists.field} already exists! Choose a different ${exists.field}.`
      });
      return;
    }

    // Create new user with password and  timestamp
    const user = await userService.createUser({
      ...userData,
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    });

    console.log(' User created:', user.username);

    // Set online status
    await userService.setUserOnline(user.userId, socket.id);
    
    // Store user in connected users map
    connectedUsers.set(socket.id, {
      ...user,
      socketId: socket.id
    });

    // Fetch pinned messages only
    console.log(' Fetching pinned messages for new user...');
    const pinnedMessages = await messageService.getPinnedMessages('global', 10);

    if (pinnedMessages.length > 0) {
      console.log(` Found ${pinnedMessages.length} pinned messages — sending to new user`);
      socket.emit('messages:history', pinnedMessages);
    } else {
      console.log('No pinned messages found — sending empty history');
      socket.emit('messages:history', []);
    }

    // Send ALL public groups to new user
    const publicGroups = await groupService.getPublicGroups();
    console.log('Sending public groups:', publicGroups.length);
    socket.emit('groups:list', publicGroups);

    // Send success to client
    socket.emit('register:success', {
      message: `Welcome to PingHub, ${userData.username}! Start new conversations!`,
      user: user
    });

    console.log(' Registration success events sent');

    
    await broadcastOnlineUsers();

    
    socket.broadcast.emit('user:joined', {
      username: userData.username,
      timestamp: new Date().toISOString()
    });

    console.log(`User ${userData.username} successfully registered — Sent pinned message history`);

  } catch (error) {
    console.error(' Registration error:', error.message);
    socket.emit('register:error', { 
      message: 'Registration failed. Please try again.' 
    });
  }
});

// LOGIN -
socket.on('user:login', async (userData) => {
  try {
    console.log(' Login attempt data:', { 
      email: userData.email,
      hasPassword: !!userData.password 
    });

    if (!userData || !userData.email || !userData.password) {
      console.log(' Missing email or password in login data');
      socket.emit('login:error', { message: 'Email and password are required for login.' });
      return;
    }

    // Authenticate user with email and password
    const authResult = await userService.authenticateUser(userData.email, userData.password);
    
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      socket.emit('login:error', { message: authResult.error });
      return;
    }

    const user = authResult.user;
    console.log(`user:login - Processing login for ${user.username}`);

    
    let removedSockets = 0;
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.userId === user.userId && sid !== socket.id) {
        console.log(`🧹 Removing old socket ${sid} for user ${u.username}`);
        connectedUsers.delete(sid);
        const oldSocket = io.sockets.sockets.get(sid);
        if (oldSocket) {
          oldSocket.disconnect(true);
          console.log(`🔌 Disconnected old socket ${sid}`);
        }
        removedSockets++;
      }
    }
    console.log(` Removed ${removedSockets} old socket connections for ${user.username}`);

    // Mark online with current socket ID
    await userService.setUserOnline(user.userId, socket.id);
    
    // Update connectedUsers with current socket
    connectedUsers.set(socket.id, { 
      ...user, 
      socketId: socket.id,
      isOnline: true 
    });

    
    const recentMessages = await messageService.getRecentMessages(50);
    socket.emit('messages:history', recentMessages);

    // Send groups
    const userGroups = await groupService.getUserGroups(user.userId);
    const publicGroups = await groupService.getPublicGroups();
    const allGroups = [...userGroups, ...publicGroups.filter(g => 
      !userGroups.some(ug => ug.groupId === g.groupId)
    )];
    socket.emit('groups:list', allGroups);

    // Send login success
    socket.emit('login:success', { 
      message: `Welcome back, ${user.username}!`, 
      user 
    });
    
    // Broadcast updated online users
    await broadcastOnlineUsers();
    console.log(`User ${user.username} successfully logged in - Sent ${recentMessages.length} messages`);
    
  } catch (error) {
    console.error('Login error:', error);
    socket.emit('login:error', { 
      message: 'Login failed. Please try again.' 
    });
  }
});

socket.on('user:change-password', async (data) => {
  try {
    const { userId, currentPassword, newPassword } = data;
    
    if (!userId || !currentPassword || !newPassword) {
      socket.emit('password:error', { message: 'All fields are required.' });
      return;
    }

    if (newPassword.length < 6) {
      socket.emit('password:error', { message: 'New password must be at least 6 characters long.' });
      return;
    }

    // Verify password
    const user = await userService.getUserById(userId);
    if (!user) {
      socket.emit('password:error', { message: 'User not found.' });
      return;
    }

    // Get user with password 
    const userWithPassword = await userService.users.findOne({ userId });
    const isCurrentPasswordValid = await userService.verifyPassword(currentPassword, userWithPassword.password);
    
    if (!isCurrentPasswordValid) {
      socket.emit('password:error', { message: 'Current password is incorrect.' });
      return;
    }

    // Update password
    await userService.updatePassword(userId, newPassword);
    
    socket.emit('password:success', { message: 'Password updated successfully!' });
    console.log(` User ${user.username} changed their password`);
    
  } catch (error) {
    console.error(' Password change error:', error);
    socket.emit('password:error', { message: 'Failed to change password.' });
  }
});
  // LOGOUT
  socket.on('user:logout', async (data) => {
    try {
      const { userId } = data;
      await userService.setUserOfflineBySocketId(socket.id);
      connectedUsers.delete(socket.id);
      await broadcastOnlineUsers();
      io.emit('user:left', { username: data.username, timestamp: new Date().toISOString() });
      console.log(` User ${data.username} logged out manually`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  });

  // CREATE GROUP
  socket.on('group:create', async (groupData) => {
    try {
      console.log('Creating group with data:', {
        name: groupData.name,
        createdBy: groupData.createdBy,
        isPrivate: groupData.isPrivate
      });

      const group = await groupService.createGroup(groupData);
      
     
      socket.emit('group:created', group);
    
      io.emit('group:new', group);
      
      console.log(`Group "${group.name}" created and broadcasted`);

    } catch (error) {
      console.error('Group creation error:', error);
      socket.emit('group:error', { message: 'Failed to create group' });
    }
  });

  // GET ALL GROUPS
  socket.on('groups:get:all', async () => {
    try {
      const allGroups = await groupService.getAllGroups();
      socket.emit('groups:all', allGroups);
      console.log(` Sent ${allGroups.length} groups to client`);
    } catch (error) {
      console.error('Groups fetch error:', error);
    }
  });

 // JOIN GROUP 
socket.on('group:join', async ({ groupId, user }) => {
  try {
    console.log(` User ${user.username} wants to join group ${groupId}`);

    const group = await groupService.getGroupById(groupId);
    
    if (!group) {
      console.log(' Group not found:', groupId);
      socket.emit('group:error', { message: 'Group not found' });
      return;
    }

    // Check if user is already a member
    const isMember = await groupService.isGroupMember(groupId, user.userId);
    if (isMember) {
      console.log('ℹUser already member of group:', user.username);
      socket.emit('group:error', { message: 'You are already a member of this group' });
      return;
    }

    if (group.isPrivate) {
      // For private groups - send join request to admins
      const joinRequest = {
        requestId: new Date().getTime().toString(),
        groupId: group.groupId,
        groupName: group.name,
        userId: user.userId,
        username: user.username,
        userEmail: user.email,
        requestedAt: new Date().toISOString()
      };

      
      const groupAdminSockets = Array.from(connectedUsers.entries())
        .filter(([_, u]) => group.admins.includes(u.userId))
        .map(([socketId, adminUser]) => ({ socketId, adminUser }));
      
      if (groupAdminSockets.length > 0) {
        // Send notification ONLY to group admins
        groupAdminSockets.forEach(({ socketId, adminUser }) => {
          io.to(socketId).emit('group:join:request', joinRequest);
        });
        
        socket.emit('group:join:pending', { 
          message: `Join request sent to ${group.name} admins. Waiting for approval.` 
        });
      } else {
        socket.emit('group:error', { 
          message: `No admins are currently online for ${group.name}. Please try again later.` 
        });
      }
      
    } else {
      // For public groups - auto-join
      await groupService.addMember(groupId, user.userId);
      const updatedGroup = await groupService.getGroupById(groupId);
      
     
      const groupMessages = await messageService.getGroupMessages(groupId);
      socket.emit('group:joined', updatedGroup);
      socket.emit('group:messages:history', groupMessages);
      socket.emit('notification', {
        type: 'success',
        message: `You joined "${group.name}"!`
      });
      
    
      io.emit('group:updated', updatedGroup);
      
      console.log(` User ${user.username} joined public group ${group.name} - Sent ${groupMessages.length} messages`);
    }

  } catch (error) {
    console.error(' Group join error:', error);
    socket.emit('group:error', { 
      message: `Failed to join group: ${error.message}` 
    });
  }
});
 // APPROVE GROUP JOIN REQUEST 
socket.on('group:approve', async ({ requestId, groupId, userId, approvedBy }) => {
  try {
    const group = await groupService.getGroupById(groupId);
    
    if (!group) {
      socket.emit('group:error', { message: 'Group not found' });
      return;
    }

    
    const isAdmin = await groupService.isGroupAdmin(groupId, approvedBy.userId);
    if (!isAdmin) {
      socket.emit('group:error', { message: 'Only admins can approve join requests' });
      return;
    }

    // Add user to group
    await groupService.addMember(groupId, userId);
    const updatedGroup = await groupService.getGroupById(groupId);
    
    // Notify the user who was approved
    const userSocket = Array.from(connectedUsers.entries())
      .find(([_, u]) => u.userId === userId);
    
    if (userSocket) {
     
      const groupMessages = await messageService.getGroupMessages(groupId);
      
      io.to(userSocket[0]).emit('group:joined', updatedGroup);
      io.to(userSocket[0]).emit('group:messages:history', groupMessages); // Full history
      io.to(userSocket[0]).emit('notification', {
        type: 'success',
        message: `Your request to join "${group.name}" has been approved!`
      });
    }
    
    
    socket.emit('notification', {
      type: 'success',
      message: `You approved ${userSocket?.[1]?.username || 'User'} to join "${group.name}"`
    });

    
    io.emit('group:updated', updatedGroup);

    console.log(`User ${userId} approved to join ${group.name} - Sent ${groupMessages?.length || 0} messages`);

  } catch (error) {
    console.error('Group approval error:', error);
    socket.emit('group:error', { message: 'Failed to approve join request' });
  }
});
  // DECLINE GROUP JOIN REQUEST 
socket.on('group:decline', async ({ requestId, groupId, userId, declinedBy }) => {
  try {
    const group = await groupService.getGroupById(groupId);
    
    if (!group) {
      socket.emit('group:error', { message: 'Group not found' });
      return;
    }

    // Check if user is admin
    const isAdmin = await groupService.isGroupAdmin(groupId, declinedBy.userId);
    if (!isAdmin) {
      socket.emit('group:error', { message: 'Only admins can decline join requests' });
      return;
    }

    
    const userSocket = Array.from(connectedUsers.entries())
      .find(([_, u]) => u.userId === userId);
    
    if (userSocket) {
      io.to(userSocket[0]).emit('notification', {
        type: 'warning',
        message: `Your request to join "${group.name}" has been declined.`
      });
    }
    
    
    socket.emit('notification', {
      type: 'info',
      message: `You declined ${userSocket?.[1]?.username || 'User'} from joining "${group.name}"`
    });

    console.log(` User ${userId} declined from joining ${group.name}`);

  } catch (error) {
    console.error('Group decline error:', error);
    socket.emit('group:error', { message: 'Failed to decline join request' });
  }
});
  // JOIN ROOM 
  socket.on('room:join', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // LEAVE ROOM
  socket.on('room:leave', (roomId) => {
    socket.leave(roomId);
    console.log(` User left room: ${roomId}`);
  });

  // THEME CHANGE
  socket.on('user:theme', (data) => {
  
    io.emit('theme:changed', data);
    console.log(` User ${data.username} changed theme to ${data.theme}`);
  });

  // GET GROUP MEMBERS
  socket.on('group:members:get', async (groupId) => {
    try {
      const group = await groupService.getGroupById(groupId);
      if (!group) return;

      
      const memberDetails = await Promise.all(
        group.members.map(async (userId) => {
          const user = await userService.getUserById(userId);
          return user ? { userId: user.userId, username: user.username, email: user.email } : null;
        })
      );

      const validMembers = memberDetails.filter(member => member !== null);
      
      socket.emit('group:members:update', {
        groupId,
        users: validMembers
      });
    } catch (error) {
      console.error('Error getting group members:', error);
    }
  });

  
  socket.on('group:join:room', (groupId) => {
    socket.join(groupId);
    console.log(`User joined group room: ${groupId}`);
  });

  // LEAVE GROUP ROOM
  socket.on('group:leave:room', (groupId) => {
    socket.leave(groupId);
    console.log(` User left group room: ${groupId}`);
  });

  
  socket.on('file:uploaded', (fileData) => {
    
    if (fileData.room && fileData.room !== 'global') {
      socket.to(fileData.room).emit('file:new', fileData);
    } else {
      socket.broadcast.emit('file:new', fileData);
    }
    console.log(` File uploaded by ${fileData.username}: ${fileData.originalName}`);
  });
});


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await database.connect();
    await userService.initialize();
    await messageService.initialize();
    await groupService.initialize();
    
    console.log('All services initialized');
    
    server.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', {
    message: error.message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

startServer();

process.on('SIGINT', async () => {
  console.log(' Shutting down server...');
  await database.disconnect();
  process.exit(0);
});