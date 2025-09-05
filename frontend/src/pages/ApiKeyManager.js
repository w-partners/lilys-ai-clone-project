import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  PlayArrow as TestIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function ApiKeyManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState({
    provider: 'gemini',
    key: '',
    name: ''
  });
  const [testingKey, setTestingKey] = useState(null);

  // Fetch API keys
  const fetchKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/keys');
      setKeys(response.data || []);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Add/Update API key
  const handleSave = async () => {
    try {
      if (!formData.key) {
        toast.error('Please enter an API key');
        return;
      }

      if (editingKey) {
        // Update existing key
        await api.put(`/keys/${editingKey.id}`, formData);
        toast.success('API key updated successfully');
      } else {
        // Add new key
        await api.post('/keys', formData);
        toast.success('API key added successfully');
      }

      setOpenDialog(false);
      setEditingKey(null);
      setFormData({ provider: 'gemini', key: '', name: '' });
      fetchKeys();
    } catch (error) {
      console.error('Failed to save key:', error);
      toast.error(error.response?.data?.error || 'Failed to save API key');
    }
  };

  // Delete API key
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      await api.delete(`/keys/${id}`);
      toast.success('API key deleted successfully');
      fetchKeys();
    } catch (error) {
      console.error('Failed to delete key:', error);
      toast.error('Failed to delete API key');
    }
  };

  // Test API key
  const handleTest = async (key) => {
    try {
      setTestingKey(key.id);
      const response = await api.post(`/keys/test/${key.id}`);
      
      if (response.data.status === 'connected') {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Failed to test key:', error);
      toast.error('Failed to test API key');
    } finally {
      setTestingKey(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Toggle show/hide key
  const toggleShowKey = (keyId) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  // Open edit dialog
  const openEditDialog = (key) => {
    setEditingKey(key);
    setFormData({
      provider: key.provider,
      key: key.fullKey || '',
      name: key.name || ''
    });
    setOpenDialog(true);
  };

  // Open add dialog
  const openAddDialog = () => {
    setEditingKey(null);
    setFormData({ provider: 'gemini', key: '', name: '' });
    setOpenDialog(true);
  };

  const getProviderLabel = (provider) => {
    switch (provider) {
      case 'gemini':
        return 'Google Gemini';
      case 'openai':
        return 'OpenAI';
      default:
        return provider;
    }
  };

  const getStatusIcon = (key) => {
    if (key.errorCount > 5) {
      return <ErrorIcon color="error" />;
    }
    if (key.usageCount > 0) {
      return <CheckIcon color="success" />;
    }
    return null;
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">API Key Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
            color="primary"
          >
            Add API Key
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : keys.length === 0 ? (
          <Alert severity="info">
            No API keys configured. Click "Add API Key" to get started.
          </Alert>
        ) : (
          <List>
            {keys.map((key) => (
              <ListItem
                key={key.id}
                sx={{
                  mb: 2,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(key)}
                      <Typography variant="subtitle1" fontWeight="medium">
                        {key.name || `${getProviderLabel(key.provider)} Key`}
                      </Typography>
                      <Chip 
                        label={key.provider} 
                        size="small" 
                        color={key.provider === 'gemini' ? 'primary' : 'secondary'}
                      />
                      {key.isActive && (
                        <Chip label="Active" size="small" color="success" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box mt={1}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography 
                              variant="body2" 
                              fontFamily="monospace"
                              sx={{ 
                                bgcolor: 'grey.100', 
                                p: 1, 
                                borderRadius: 1,
                                flex: 1
                              }}
                            >
                              {showKeys[key.id] ? key.fullKey : key.key}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => toggleShowKey(key.id)}
                            >
                              {showKeys[key.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => copyToClipboard(key.fullKey)}
                            >
                              <CopyIcon />
                            </IconButton>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box display="flex" gap={2} alignItems="center">
                            <Typography variant="caption">
                              Usage: {key.usageCount || 0}
                            </Typography>
                            {key.errorCount > 0 && (
                              <Typography variant="caption" color="error">
                                Errors: {key.errorCount}
                              </Typography>
                            )}
                            {key.lastUsedAt && (
                              <Typography variant="caption" color="textSecondary">
                                Last used: {new Date(key.lastUsedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    <Tooltip title="Test Connection">
                      <IconButton
                        size="small"
                        onClick={() => handleTest(key)}
                        disabled={testingKey === key.id}
                      >
                        {testingKey === key.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <TestIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(key)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(key.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingKey ? 'Edit API Key' : 'Add New API Key'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                label="Provider"
              >
                <MenuItem value="gemini">Google Gemini</MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="API Key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder={`Enter your ${formData.provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
              type="password"
              required
            />

            <TextField
              fullWidth
              label="Name (Optional)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Production Key, Test Key"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.key}
          >
            {editingKey ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ApiKeyManager;