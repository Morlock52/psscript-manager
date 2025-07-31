import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

// Re-export the User interface from AuthContext
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

export const useAuth = () => useContext(AuthContext);
