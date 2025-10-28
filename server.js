const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store active connections
const userConnections = new Map();

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
