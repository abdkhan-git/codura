const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store active connections
const userConnections = new Map();

// Store active session participants
const sessionParticipants = new Map(); // sessionId -> Set of userIds

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/'
  });

  console.log('🚀 Socket.io server initialized');

  // Authentication middleware
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      return next(new Error('Missing userId'));
    }

    socket.data.userId = userId;
    next();
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`✅ User connected: ${userId} (${socket.id})`);

    // Track user connection
    userConnections.set(userId, {
      socketId: socket.id,
      userId,
      conversationIds: new Set()
    });

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      const userConn = userConnections.get(userId);
      if (userConn) {
        userConn.conversationIds.add(conversationId);
      }
      socket.join(`conversation:${conversationId}`);
      console.log(`👥 User ${userId} joined conversation ${conversationId}`);

      // Notify others that user is online
      socket.to(`conversation:${conversationId}`).emit('user_online', {
        userId,
        conversationId
      });
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      const userConn = userConnections.get(userId);
      if (userConn) {
        userConn.conversationIds.delete(conversationId);
      }
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 User ${userId} left conversation ${conversationId}`);

      // Notify others that user went offline
      socket.to(`conversation:${conversationId}`).emit('user_offline', {
        userId,
        conversationId
      });
    });

    // New message (broadcast to conversation room)
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'text', attachments = [], messageId } = data;

        // Broadcast to all users in conversation (API route will save to DB)
        io.to(`conversation:${conversationId}`).emit('new_message', {
          id: messageId,
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: messageType,
          attachments,
          reactions: {},
          read_by: [userId], // Sender has read their own message
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        console.log(`💬 Message in ${conversationId}: ${messageId}`);
        socket.emit('message_sent', { messageId, conversationId });
      } catch (err) {
        console.error('Error in send_message:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        conversationId
      });
    });

    // Stop typing
    socket.on('stop_typing', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId
      });
    });

    // Mark messages as read
    socket.on('mark_read', (data) => {
      const { conversationId, messageIds } = data;

      io.to(`conversation:${conversationId}`).emit('messages_read', {
        userId,
        messageIds,
        conversationId,
        readAt: new Date().toISOString()
      });

      console.log(`📖 User ${userId} marked ${messageIds.length} messages as read`);
    });

    // ======================================================
    // POD ROOM EVENTS (for real-time updates)
    // ======================================================

    // Join pod room for real-time updates
    socket.on('join_pod', (podId) => {
      socket.join(`pod:${podId}`);
      console.log(`👥 User ${userId} joined pod ${podId} for updates`);
    });

    // Leave pod room
    socket.on('leave_pod', (podId) => {
      socket.leave(`pod:${podId}`);
      console.log(`👋 User ${userId} left pod ${podId}`);
    });

    // ======================================================
    // LIVE CODING SESSION EVENTS
    // ======================================================

    // Join live coding session room
    socket.on('join_session', (data) => {
      const { sessionId, userData } = data;

      socket.join(`session:${sessionId}`);

      // Track participant
      if (!sessionParticipants.has(sessionId)) {
        sessionParticipants.set(sessionId, new Set());
      }
      sessionParticipants.get(sessionId).add(userId);

      console.log(`🎯 User ${userId} joined session ${sessionId}`);

      // Notify others that a new participant joined
      socket.to(`session:${sessionId}`).emit('participant_joined', {
        userId,
        userData,
        sessionId,
        participantCount: sessionParticipants.get(sessionId).size
      });

      // Send current participants to the new user
      const participants = Array.from(sessionParticipants.get(sessionId));
      socket.emit('session_participants', {
        sessionId,
        participants,
        participantCount: participants.length
      });
    });

    // Leave live coding session room
    socket.on('leave_session', (sessionId) => {
      socket.leave(`session:${sessionId}`);

      // Remove from participants
      if (sessionParticipants.has(sessionId)) {
        sessionParticipants.get(sessionId).delete(userId);
        if (sessionParticipants.get(sessionId).size === 0) {
          sessionParticipants.delete(sessionId);
        }
      }

      console.log(`👋 User ${userId} left session ${sessionId}`);

      // Notify others that participant left
      socket.to(`session:${sessionId}`).emit('participant_left', {
        userId,
        sessionId,
        participantCount: sessionParticipants.get(sessionId)?.size || 0
      });
    });

    // Code change synchronization (broadcast to all except sender)
    socket.on('code_change', (data) => {
      const { sessionId, code, cursorPosition } = data;

      socket.to(`session:${sessionId}`).emit('code_updated', {
        userId,
        code,
        cursorPosition,
        timestamp: Date.now()
      });
    });

    // Cursor position update
    socket.on('cursor_position', (data) => {
      const { sessionId, position, selection } = data;

      socket.to(`session:${sessionId}`).emit('cursor_moved', {
        userId,
        position,
        selection,
        timestamp: Date.now()
      });
    });

    // Selection change
    socket.on('selection_change', (data) => {
      const { sessionId, selection } = data;

      socket.to(`session:${sessionId}`).emit('selection_updated', {
        userId,
        selection,
        timestamp: Date.now()
      });
    });

    // Language change
    socket.on('language_change', (data) => {
      const { sessionId, language } = data;

      io.to(`session:${sessionId}`).emit('language_changed', {
        userId,
        language,
        timestamp: Date.now()
      });

      console.log(`🔧 Language changed to ${language} in session ${sessionId}`);
    });

    // Code execution started
    socket.on('run_code', (data) => {
      const { sessionId, code, language, input } = data;

      io.to(`session:${sessionId}`).emit('code_execution_started', {
        userId,
        code,
        language,
        input,
        timestamp: Date.now()
      });

      console.log(`▶️ Code execution started in session ${sessionId}`);
    });

    // Code execution result
    socket.on('code_output', (data) => {
      const { sessionId, output, error, status, executionTime } = data;

      io.to(`session:${sessionId}`).emit('code_execution_result', {
        userId,
        output,
        error,
        status,
        executionTime,
        timestamp: Date.now()
      });

      console.log(`✅ Code execution completed in session ${sessionId} (${status})`);
    });

    // Session chat message
    socket.on('session_chat', (data) => {
      const { sessionId, message, messageType = 'text', metadata } = data;

      io.to(`session:${sessionId}`).emit('session_chat_message', {
        userId,
        message,
        messageType,
        metadata,
        timestamp: Date.now()
      });

      console.log(`💬 Chat message in session ${sessionId}`);
    });

    // Participant presence heartbeat
    socket.on('session_heartbeat', (sessionId) => {
      // Update last seen time (would be stored in DB via API)
      socket.to(`session:${sessionId}`).emit('participant_active', {
        userId,
        timestamp: Date.now()
      });
    });

    // Request current code state
    socket.on('request_code_state', (sessionId) => {
      // Ask the host or first participant to share their code state
      socket.to(`session:${sessionId}`).emit('code_state_requested', {
        requestedBy: userId
      });
    });

    // Share code state (response to request)
    socket.on('share_code_state', (data) => {
      const { sessionId, code, language, cursorPosition } = data;

      // Send to specific user who requested or broadcast to all
      if (data.targetUserId) {
        io.to(`session:${sessionId}`).emit('code_state_shared', {
          code,
          language,
          cursorPosition,
          sharedBy: userId
        });
      } else {
        socket.to(`session:${sessionId}`).emit('code_state_shared', {
          code,
          language,
          cursorPosition,
          sharedBy: userId
        });
      }
    });

    // ======================================================
    // VIDEO CALL EVENTS (WebRTC Signaling)
    // ======================================================

    // User joined video call
    socket.on('video_joined', (data) => {
      const { sessionId, userId: videoUserId } = data;
      console.log(`📹 User ${videoUserId} joined video in session ${sessionId}`);

      // Notify others
      socket.to(`session:${sessionId}`).emit('video_user_joined', {
        userId: videoUserId,
        username: videoUserId, // Could fetch from DB
      });
    });

    // WebRTC Offer
    socket.on('video_offer', (data) => {
      const { sessionId, from, to, offer } = data;
      // Send offer to specific peer
      io.sockets.sockets.forEach(s => {
        if (s.data.userId === to) {
          s.emit('video_offer', { from, offer });
        }
      });
    });

    // WebRTC Answer
    socket.on('video_answer', (data) => {
      const { sessionId, from, to, answer } = data;
      // Send answer to specific peer
      io.sockets.sockets.forEach(s => {
        if (s.data.userId === to) {
          s.emit('video_answer', { from, answer });
        }
      });
    });

    // ICE Candidate
    socket.on('video_ice_candidate', (data) => {
      const { sessionId, from, to, candidate } = data;
      // Send ICE candidate to specific peer
      io.sockets.sockets.forEach(s => {
        if (s.data.userId === to) {
          s.emit('video_ice_candidate', { from, candidate });
        }
      });
    });

    // User left video call
    socket.on('video_leave', (data) => {
      const { sessionId, userId: videoUserId } = data;
      console.log(`📹 User ${videoUserId} left video in session ${sessionId}`);

      socket.to(`session:${sessionId}`).emit('video_user_left', {
        userId: videoUserId,
      });
    });

    // ======================================================
    // LIVE STREAMING EVENTS (WebRTC Broadcasting)
    // ======================================================

    // Stream started by host
    socket.on('stream_started', (data) => {
      const { sessionId, streamId, streamType, hostId } = data;
      console.log(`🎥 Stream started in session ${sessionId} by ${hostId}`);

      // Notify all participants in the session
      socket.to(`session:${sessionId}`).emit('stream_started', {
        sessionId,
        streamId,
        streamType,
        hostId,
        timestamp: Date.now()
      });
    });

    // Stream stopped by host
    socket.on('stream_stopped', (data) => {
      const { sessionId, streamId } = data;
      console.log(`🛑 Stream stopped in session ${sessionId}`);

      // Notify all participants
      io.to(`session:${sessionId}`).emit('stream_stopped', {
        sessionId,
        streamId,
        timestamp: Date.now()
      });
    });

    // Stream paused by host
    socket.on('stream_paused', (data) => {
      const { sessionId, streamId } = data;
      console.log(`⏸️  Stream paused in session ${sessionId}`);

      socket.to(`session:${sessionId}`).emit('stream_paused', {
        sessionId,
        streamId,
        timestamp: Date.now()
      });
    });

    // Stream resumed by host
    socket.on('stream_resumed', (data) => {
      const { sessionId, streamId } = data;
      console.log(`▶️  Stream resumed in session ${sessionId}`);

      socket.to(`session:${sessionId}`).emit('stream_resumed', {
        sessionId,
        streamId,
        timestamp: Date.now()
      });
    });

    // Viewer joined stream
    socket.on('viewer_joined', (data) => {
      const { sessionId, streamId, viewerId } = data;
      console.log(`👀 Viewer ${viewerId} joined stream in session ${sessionId}`);

      // Notify host and other viewers
      socket.to(`session:${sessionId}`).emit('viewer_joined', {
        sessionId,
        streamId,
        viewerId,
        timestamp: Date.now()
      });
    });

    // Viewer left stream
    socket.on('viewer_left', (data) => {
      const { sessionId, streamId, viewerId } = data;
      console.log(`👋 Viewer ${viewerId} left stream in session ${sessionId}`);

      // Notify host and other viewers
      socket.to(`session:${sessionId}`).emit('viewer_left', {
        sessionId,
        streamId,
        viewerId,
        timestamp: Date.now()
      });
    });

    // Viewer count updated
    socket.on('viewer_count_updated', (data) => {
      const { sessionId, streamId, count } = data;

      io.to(`session:${sessionId}`).emit('viewer_count_updated', {
        sessionId,
        streamId,
        count,
        timestamp: Date.now()
      });
    });

    // WebRTC Offer (for streaming)
    socket.on('webrtc_offer', (data) => {
      const { sessionId, viewerId, offer } = data;
      console.log(`🔄 WebRTC offer from viewer ${viewerId} in session ${sessionId}`);

      // Send offer to host
      io.sockets.sockets.forEach(s => {
        if (s.data.userId === data.hostId) {
          s.emit('webrtc_offer', { sessionId, viewerId, offer });
        }
      });
    });

    // WebRTC Answer (from host to viewer)
    socket.on('webrtc_answer', (data) => {
      const { sessionId, viewerId, answer } = data;
      console.log(`🔄 WebRTC answer to viewer ${viewerId} in session ${sessionId}`);

      // Send answer to specific viewer
      io.sockets.sockets.forEach(s => {
        if (s.data.userId === viewerId) {
          s.emit('webrtc_answer', { sessionId, answer });
        }
      });
    });

    // WebRTC ICE Candidate (for streaming)
    socket.on('webrtc_ice_candidate', (data) => {
      const { sessionId, viewerId, hostId, candidate } = data;

      // Route to the appropriate peer
      const targetUserId = viewerId || hostId;
      if (targetUserId) {
        io.sockets.sockets.forEach(s => {
          if (s.data.userId === targetUserId) {
            s.emit('webrtc_ice_candidate', { sessionId, viewerId, hostId, candidate });
          }
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      const userConn = userConnections.get(userId);
      if (userConn) {
        userConn.conversationIds.forEach(conversationId => {
          io.to(`conversation:${conversationId}`).emit('user_offline', {
            userId,
            conversationId
          });
        });
        userConnections.delete(userId);
      }

      // Clean up session participants
      sessionParticipants.forEach((participants, sessionId) => {
        if (participants.has(userId)) {
          participants.delete(userId);

          // Notify others in the session
          io.to(`session:${sessionId}`).emit('participant_left', {
            userId,
            sessionId,
            participantCount: participants.size
          });

          // Clean up empty sessions
          if (participants.size === 0) {
            sessionParticipants.delete(sessionId);
          }
        }
      });

      console.log(`❌ User disconnected: ${userId}`);
    });
  });

  // Find available port starting from 3000
  const findAvailablePort = (startPort) => {
    return new Promise((resolve) => {
      const tryPort = (port) => {
        const server = require('http').createServer();
        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
            server.close();
            tryPort(port + 1);
          } else {
            throw err;
          }
        });
        server.once('listening', () => {
          server.close();
          resolve(port);
        });
        server.listen(port, '0.0.0.0');
      };
      tryPort(startPort);
    });
  };

  const portToUse = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  findAvailablePort(portToUse).then((port) => {
    const server = httpServer.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server ready on http://localhost:${port}`);
      console.log(`🚀 Socket.io WebSocket server running`);
      console.log(`📱 App is live and accepting connections`);
      if (port !== 3000) {
        console.log(`⚠️  Running on port ${port} (port 3000 was in use)`);
      }
      console.log(`\n💡 To stop the server: Press Ctrl+C\n`);
    });

    // Graceful shutdown on Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down server...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  });
});
