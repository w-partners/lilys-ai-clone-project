import React from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message = 'Loading...', progress = null }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              fontSize: '2rem',
              fontWeight: 'bold',
            }}
          >
            L
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              textAlign: 'center',
              mb: 1,
            }}
          >
            Lilys.AI Clone
          </Typography>
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            AI-Powered Content Summarization
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{ width: '100%', maxWidth: '300px' }}
        >
          {progress !== null ? (
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                {message}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'white',
                    borderRadius: 3,
                  },
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress
                size={40}
                thickness={4}
                sx={{
                  color: 'white',
                  mb: 2,
                }}
              />
              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                {message}
              </Typography>
            </Box>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <Typography
            variant="caption"
            sx={{
              opacity: 0.6,
              textAlign: 'center',
            }}
          >
            Version 1.0.0
          </Typography>
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default LoadingScreen;