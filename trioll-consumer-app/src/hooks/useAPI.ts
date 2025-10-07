
import { useState } from 'react';

export function useGames() {
  const [data] = useState([]);
  const [isLoading] = useState(false);
  const [error] = useState(null);

  return { data, isLoading, error };
}

export function useFavorites() {
  const [data] = useState([]);
  const [isLoading] = useState(false);
  const [error] = useState(null);

  return { data, isLoading, error };
}

export function useRecentGames() {
  const [data] = useState([]);
  const [isLoading] = useState(false);
  const [error] = useState(null);

  return { data, isLoading, error };
}
