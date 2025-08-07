import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export const useGameLiveData = (gameId: string) => {
  const [users, setUsers] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    const channel = `game:${gameId}`;
    
    const handleMessage = (message: any) => {
      if (message.type === 'user_joined') {
        setUsers(prev => [...prev, message.user]);
        setOnlineCount(prev => prev + 1);
      }
    };

    subscribe(channel, handleMessage);
    
    return () => {
      unsubscribe(channel);
    };
  }, [gameId, subscribe, unsubscribe]);

  return { users, onlineCount };
};
