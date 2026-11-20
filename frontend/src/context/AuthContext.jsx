import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('greenwood_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('greenwood_token') || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Default to admin on first load if not signed in for instant access
  useEffect(() => {
    if (!token) {
      switchRoleDemo('admin');
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const apiBase = (typeof window !== 'undefined' && window.location.protocol === 'file:')
        ? 'http://localhost:5000'
        : '';
      
      let res = null;
      let networkFailed = false;

      try {
        res = await fetch(`${apiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      } catch (netErr) {
        networkFailed = true;
      }

      if (res && res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('greenwood_token', data.token);
        localStorage.setItem('greenwood_user', JSON.stringify(data.user));
        return data.user;
      }

      // If server explicitly returned 400/401 and was reachable
      if (res && !res.ok && !networkFailed) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid credentials');
      }

      // --- Offline Login Fallback ---
      const offlineAccounts = {
        'admin': {
          password: 'admin123',
          user: {
            id: 1,
            username: 'admin',
            role: 'admin',
            full_name: 'Principal Arthur Vance',
            email: 'admin@greenwood.edu',
            phone: '+1 (555) 019-2831'
          }
        },
        'teacher_sarah': {
          password: 'teacher123',
          user: {
            id: 2,
            username: 'teacher_sarah',
            role: 'user',
            full_name: 'Sarah Jenkins',
            email: 's.jenkins@greenwood.edu',
            phone: '+1 (555) 014-9922'
          }
        },
        'parent_david': {
          password: 'parent123',
          user: {
            id: 3,
            username: 'parent_david',
            role: 'parent',
            full_name: 'David Miller',
            email: 'david.miller@example.com',
            phone: '+1 (555) 019-3388',
            child_student_id: 1,
            child: { id: 1, first_name: 'Ethan', last_name: 'Miller', admission_number: 'SCH-2026-001', class_grade: 'JHS 3' }
          }
        },
        'kofi mensah': {
          password: '378017',
          user: {
            id: 6,
            username: 'parent_kofi',
            role: 'parent',
            full_name: 'Kwesi Mensah',
            email: 'k.mensah@example.com',
            phone: '+1 (555) 012-7711',
            child_student_id: 6,
            child: { id: 6, first_name: 'Kofi', last_name: 'Mensah', admission_number: 'SCH-KG1-001', class_grade: 'KG 1' }
          }
        },
        'ethan miller': {
          password: '511707',
          user: {
            id: 3,
            username: 'parent_david',
            role: 'parent',
            full_name: 'David Miller',
            email: 'david.miller@example.com',
            phone: '+1 (555) 019-3388',
            child_student_id: 1,
            child: { id: 1, first_name: 'Ethan', last_name: 'Miller', admission_number: 'SCH-2026-001', class_grade: 'JHS 3' }
          }
        }
      };

      const lowerUser = (username || '').trim().toLowerCase();
      const match = offlineAccounts[lowerUser];
      if (match && match.password === (password || '').trim()) {
        const offlineToken = `offline_token_${Date.now()}`;
        setToken(offlineToken);
        setUser(match.user);
        localStorage.setItem('greenwood_token', offlineToken);
        localStorage.setItem('greenwood_user', JSON.stringify(match.user));
        return match.user;
      }

      const savedUserStr = localStorage.getItem('greenwood_user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          if (savedUser.username?.toLowerCase() === lowerUser) {
            const offlineToken = localStorage.getItem('greenwood_token') || `offline_token_${Date.now()}`;
            setToken(offlineToken);
            setUser(savedUser);
            return savedUser;
          }
        } catch {
          // ignore
        }
      }

      throw new Error('Invalid credentials. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('greenwood_token');
    localStorage.removeItem('greenwood_user');
  };

  const switchRoleDemo = async (roleName) => {
    const creds = {
      admin: { username: 'admin', password: 'admin123' },
      user: { username: 'teacher_sarah', password: 'teacher123' },
      parent: { username: 'kofi mensah', password: '378017' }
    };

    const target = creds[roleName] || creds.admin;
    return await login(target.username, target.password);
  };

  const value = {
    user,
    token,
    role: user?.role || 'guest',
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user',
    isParent: user?.role === 'parent',
    loading,
    login,
    logout,
    switchRoleDemo
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
