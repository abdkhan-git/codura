import { useEffect, useRef } from 'react';

interface UseCollaborativeEditorProps {
  sessionId: string;
  userId: string;
  username: string;
  editor: any | null;
  monaco: any | null;
  onSync?: (isSynced: boolean) => void;
}

/**
 * Simplified collaborative editor hook using Socket.io
 *
 * Note: Full Y.js CRDT integration is available but not enabled due to Monaco React compatibility issues.
 * The current implementation uses Socket.io for real-time code synchronization (already implemented in the page component).
 *
 * For production Y.js integration:
 * 1. Install monaco-editor package (not @monaco-editor/react)
 * 2. Configure proper webpack/vite config for Monaco ESM imports
 * 3. Use y-monaco binding with standalone monaco-editor
 *
 * See: https://github.com/yjs/y-monaco for integration guide
 */
export function useCollaborativeEditor({
  sessionId,
  userId,
  username,
  editor,
  monaco,
  onSync,
}: UseCollaborativeEditorProps) {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!editor || !monaco || isInitialized.current) return;

    // Mark as synced (code sync happens via Socket.io events in parent component)
    console.log(`✨ Collaborative editing enabled for session ${sessionId}`);
    console.log(`👤 User: ${username} (${userId})`);
    onSync?.(true);
    isInitialized.current = true;

    // Future: Y.js CRDT integration can be added here
    // Currently using Socket.io 'code_change' events for real-time sync

    return () => {
      isInitialized.current = false;
    };
  }, [editor, monaco, sessionId, userId, username, onSync]);

  return {
    isReady: isInitialized.current,
  };
}
