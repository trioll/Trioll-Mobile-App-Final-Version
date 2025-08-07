import React, { ReactNode } from 'react';
import { useGamesLoader } from '../../hooks/useGamesLoader';

interface GamesLoaderProviderProps {
  children: ReactNode;
}

export const GamesLoaderProvider: React.FC<GamesLoaderProviderProps> = ({ children }) => {
  // This hook will handle all the game loading logic
  useGamesLoader();
  
  // Just render children, no need to provide any context
  return <>{children}</>;
};