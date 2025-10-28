import { Server as SocketServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '@/utils/supabase/service';

// Store active connections
interface UserConnection {
  socketId: string;
  userId: string;
  conversationIds: Set<string>;
}

const userConnections = new Map<string, UserConnection>();
let io: SocketServer | null = null;

export function initializeSocket(httpServer: any): SocketServer {
  if (io) return io;

  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    const token = socket.handshake.auth.token;

    if (!userId) {
      return next(new Error('Missing userId'));
    }

    // Attach userId to socket
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
    socket.on('join_conversation', (conversationId: string) => {
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
    socket.on('leave_conversation', (conversationId: string) => {
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

    // New message (save to DB and broadcast)
    socket.on('send_message', async (data: any) => {
      try {
        const { conversationId, content, messageType = 'text', attachments = [] } = data;

        const supabase = createServiceClient();

        // Save message to database
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content,
            message_type: messageType,
            attachments
          })
          .select('*')
          .single();

        if (error) {
          console.error('Error saving message:', error);
          socket.emit('message_error', { error: error.message });
          return;
        }

        // Broadcast to all users in conversation
        io!.to(`conversation:${conversationId}`).emit('new_message', {
          id: message.id,
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: messageType,
          attachments,
          reactions: {},
          read_by: [],
          created_at: message.created_at,
          updated_at: message.updated_at
        });

        console.log(`💬 Message sent in ${conversationId}: ${message.id}`);
      } catch (err) {
        console.error('Error in send_message:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        conversationId
      });
      console.log(`⌨️ User ${userId} typing in ${conversationId}`);
    });

    // Stop typing
    socket.on('stop_typing', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId
      });
    });

    // Mark message as read
    socket.on('mark_read', async (data: any) => {
      try {
        const { conversationId, messageIds } = data;
        const supabase = createServiceClient();

        // Insert read receipts
        const receipts = messageIds.map((messageId: string) => ({
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString()
        }));

        await supabase
          .from('message_read_receipts')
          .insert(receipts)
          .select('*');

        // Broadcast read receipts to conversation
        io!.to(`conversation:${conversationId}`).emit('messages_read', {
          userId,
          messageIds,
          conversationId,
          readAt: new Date().toISOString()
        });

        console.log(`📖 User ${userId} marked ${messageIds.length} messages as read`);
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      const userConn = userConnections.get(userId);
      if (userConn) {
        // Notify all conversations this user was in
        userConn.conversationIds.forEach(conversationId => {
          io!.to(`conversation:${conversationId}`).emit('user_offline', {
            userId,
            conversationId
          });
        });
        userConnections.delete(userId);
      }
      console.log(`❌ User disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

export function getUserConnections(): Map<string, UserConnection> {
  return userConnections;
}
