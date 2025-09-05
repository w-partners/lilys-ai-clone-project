import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
  });

  // Check if user is logged in on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          // Set token in axios headers
          authService.setAuthToken(token);
          
          try {
            // Try to parse existing user data
            const user = JSON.parse(userData);
            
            // If user data has role field, it's in correct format
            if (user && user.role) {
              dispatch({ type: 'SET_USER', payload: user });
              return;
            }
          } catch (parseError) {
            console.warn('Failed to parse stored user data:', parseError);
          }
          
          // If no valid user data or parsing failed, fetch from server
          try {
            const response = await authService.getCurrentUser();
            // Backend returns: { success: true, data: { user } }
            if (response && response.success && response.data && response.data.user) {
              const user = response.data.user;
              // Store user data in localStorage for persistence
              localStorage.setItem('user', JSON.stringify(user));
              dispatch({ type: 'SET_USER', payload: user });
            } else {
              throw new Error('Invalid user data received');
            }
          } catch (apiError) {
            console.error('Failed to fetch user from API:', apiError);
            // Clear invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            authService.setAuthToken(null);
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        authService.setAuthToken(null);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (phone, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.login(phone, password);
      
      // The axios interceptor returns response.data, so response is already the data object
      // Backend returns: { success: true, data: { user, token } }
      if (!response || !response.success || !response.data) {
        throw new Error('Invalid response from server');
      }
      const { user, token } = response.data;
      
      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      authService.setAuthToken(token);
      
      dispatch({ type: 'SET_USER', payload: user });
      toast.success('Successfully logged in!');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.register(userData);
      const { user, token } = response.data;
      
      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      authService.setAuthToken(token);
      
      dispatch({ type: 'SET_USER', payload: user });
      toast.success('Account created successfully!');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authService.setAuthToken(null);
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    dispatch({ type: 'SET_USER', payload: userData });
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};