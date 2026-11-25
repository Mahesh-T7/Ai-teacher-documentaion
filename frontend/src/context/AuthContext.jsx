import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('teacher_user') || sessionStorage.getItem('teacher_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getStoredToken = () => {
  return localStorage.getItem('teacher_token') || sessionStorage.getItem('teacher_token') || null;
};

const saveSession = (token, user, rememberMe = true) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  other.removeItem('teacher_token');
  other.removeItem('teacher_user');
  storage.setItem('teacher_token', token);
  storage.setItem('teacher_user', JSON.stringify(user));
  if (rememberMe && user?.email) {
    localStorage.setItem('remembered_teacher_email', user.email);
    localStorage.setItem('remember_me_enabled', 'true');
  } else if (!rememberMe) {
    localStorage.setItem('remember_me_enabled', 'false');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on initial mount without wiping session on transient network errors
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getStoredToken();
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            const useLocal = !!localStorage.getItem('teacher_token');
            saveSession(savedToken, res.user, useLocal);
          }
        } catch (error) {
          console.warn('[Auth] Session validation failed:', error.message);
          // Only clear stored login if server explicitly rejected credentials (401/403)
          if (error.status === 401 || error.status === 403) {
            localStorage.removeItem('teacher_token');
            localStorage.removeItem('teacher_user');
            sessionStorage.removeItem('teacher_token');
            sessionStorage.removeItem('teacher_user');
            setUser(null);
            setToken(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const rememberMe = credentials?.rememberMe !== false;
    const res = await authApi.login(credentials);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      saveSession(res.token, res.user, rememberMe);
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      saveSession(res.token, res.user, true);
      return res.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const updateProfile = async (updateData) => {
    const res = await userApi.updateProfile(updateData);
    if (res.success && res.user) {
      setUser(res.user);
      const useLocal = !!localStorage.getItem('teacher_token') || !sessionStorage.getItem('teacher_token');
      const activeToken = getStoredToken();
      if (activeToken) {
        saveSession(activeToken, res.user, useLocal);
      }
      return res.user;
    }
    throw new Error(res.message || 'Failed to update profile');
  };

  const logout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_user');
    sessionStorage.removeItem('teacher_token');
    sessionStorage.removeItem('teacher_user');
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
