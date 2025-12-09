import { getFromStorage, setInStorage, removeFromStorage } from './storage';
import api from './api';

const TOKEN_KEY = 'mrm_token';

export const setToken = (token) => setInStorage(TOKEN_KEY, token);

export const getToken = async () => {
  const token = await getFromStorage(TOKEN_KEY);
  return token;
};

export const clearToken = async () => {
  await removeFromStorage(TOKEN_KEY);
};

export const verifyToken = async () => {
  try {
    const token = await getToken();
    if (!token) return false;

    await api.get('/api/researcher/me');
    return true;
  } catch (error) {
    await clearToken();
    return false;
  }
};
