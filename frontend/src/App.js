import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

// Lazy load components
const Home = React.lazy(() => import('./pages/Home'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Upload = React.lazy(() => import('./pages/Upload'));
const History = React.lazy(() => import('./pages/History'));
const Summaries = React.lazy(() => import('./pages/Summaries'));
const SummaryDetail = React.lazy(() => import('./pages/SummaryDetail'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const AdminPrompts = React.lazy(() => import('./pages/AdminPrompts'));
const TestPrompts = React.lazy(() => import('./pages/TestPrompts'));

// Loading fallback component
const SuspenseFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="60vh"
  >
    <CircularProgress size={40} />
  </Box>
);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public route wrapper (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { loading } = useAuth();
  
  // Show loading screen while auth is initializing
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <Suspense fallback={<SuspenseFallback />}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Suspense fallback={<SuspenseFallback />}>
                    <Login />
                  </Suspense>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Suspense fallback={<SuspenseFallback />}>
                    <Register />
                  </Suspense>
                </PublicRoute>
              }
            />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<SuspenseFallback />}>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/upload" element={<Upload />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/summaries" element={<Summaries />} />
                        <Route path="/summaries/:id" element={<SummaryDetail />} />
                        <Route path="/summary/:id" element={<SummaryDetail />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/admin/prompts" element={<AdminPrompts />} />
                        <Route path="/test/prompts" element={<TestPrompts />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

export default App;