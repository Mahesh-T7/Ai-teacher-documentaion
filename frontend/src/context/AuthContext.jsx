import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('teacher_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('teacher_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate session on initial mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('teacher_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('teacher_user', JSON.stringify(res.user));
          }
        } catch (error) {
          console.warn('[Auth] Session validation failed:', error.message);
          localStorage.removeItem('teacher_token');
          localStorage.removeItem('teacher_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('teacher_token', res.token);
      localStorage.setItem('teacher_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('teacher_token', res.token);
      localStorage.setItem('teacher_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const updateProfile = async (updateData) => {
    const res = await userApi.updateProfile(updateData);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('teacher_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Failed to update profile');
  };

  const logout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    updateProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
