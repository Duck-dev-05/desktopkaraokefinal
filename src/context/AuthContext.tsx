import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../db';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = localStorage.getItem('auth_user_id');
        if (storedUserId) {
          const { getUser } = await import('../db');
          const dbUser = await getUser(Number(storedUserId));
          if (dbUser) {
            setUser(dbUser);
          } else {
            localStorage.removeItem('auth_user_id');
          }
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('auth_user_id', newUser.id.toString());
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user_id');
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
