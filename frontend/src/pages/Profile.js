import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  Alert
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ApiKeyManager from './ApiKeyManager';

function Profile() {
  const { user } = useAuth();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center">
        <PersonIcon sx={{ mr: 2, fontSize: 40 }} />
        Profile
      </Typography>

      {/* User Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Name
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {user?.name || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Phone
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {user?.phone || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Email
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {user?.email || 'Not set'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              Role
            </Typography>
            <Chip
              label={user?.role || 'user'}
              color={user?.role === 'admin' ? 'error' : 'primary'}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* API Keys Section - Admin Only */}
      {user?.role === 'admin' ? (
        <ApiKeyManager />
      ) : (
        <Alert severity="info">
          API key management is only available for administrators.
        </Alert>
      )}
    </Container>
  );
}

export default Profile;