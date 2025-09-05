import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  FormLabel,
  Grid
} from '@mui/material';
import {
  CloudUpload,
  Link as LinkIcon,
  TextFields,
  InsertDriveFile,
  Delete,
  CheckCircle,
  Error as ErrorIcon,
  ExpandMore,
  ExpandLess,
  Settings
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/html': ['.html', '.htm'],
  'audio/*': ['.mp3', '.wav', '.m4a'],
  'video/*': ['.mp4', '.avi', '.mov']
};

const FileUploadTab = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    summaryLength: 'medium',
    extractKeyPoints: true
  });

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const handleUpload = async () => {
    setUploading(true);
    
    for (const fileItem of files) {
      if (fileItem.status === 'completed') continue;
      
      const formData = new FormData();
      formData.append('file', fileItem.file);
      formData.append('options', JSON.stringify(settings));

      try {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        const response = await api.post('/summaries/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({ ...prev, [fileItem.id]: percentCompleted }));
          }
        });

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'completed', jobId: response.data.data.jobId } : f
        ));

        toast.success(`${fileItem.file.name} uploaded successfully!`);
        onUploadSuccess(response.data.data.jobId);
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error' } : f
        ));
        toast.error(`Failed to upload ${fileItem.file.name}`);
      }
    }
    
    setUploading(false);
  };

  return (
    <Box>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s'
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          or click to select files
        </Typography>
        <Chip label="PDF" size="small" sx={{ mx: 0.5 }} />
        <Chip label="DOCX" size="small" sx={{ mx: 0.5 }} />
        <Chip label="TXT" size="small" sx={{ mx: 0.5 }} />
        <Chip label="Audio" size="small" sx={{ mx: 0.5 }} />
        <Chip label="Video" size="small" sx={{ mx: 0.5 }} />
        <Typography variant="caption" display="block" mt={2} color="text.secondary">
          Maximum file size: 50MB
        </Typography>
      </Box>

      {files.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Selected Files ({files.length})
          </Typography>
          <List>
            {files.map((fileItem) => (
              <ListItem
                key={fileItem.id}
                secondaryAction={
                  fileItem.status === 'pending' && (
                    <IconButton edge="end" onClick={() => removeFile(fileItem.id)}>
                      <Delete />
                    </IconButton>
                  )
                }
              >
                <ListItemIcon>
                  {fileItem.status === 'completed' && <CheckCircle color="success" />}
                  {fileItem.status === 'error' && <ErrorIcon color="error" />}
                  {(fileItem.status === 'pending' || fileItem.status === 'uploading') && 
                    <InsertDriveFile />}
                </ListItemIcon>
                <ListItemText
                  primary={fileItem.file.name}
                  secondary={`${(fileItem.file.size / 1024 / 1024).toFixed(2)} MB`}
                />
                {fileItem.status === 'uploading' && (
                  <Box sx={{ width: 100, mr: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress[fileItem.id] || 0} 
                    />
                  </Box>
                )}
              </ListItem>
            ))}
          </List>

          <Box mt={2}>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              startIcon={showSettings ? <ExpandLess /> : <ExpandMore />}
              endIcon={<Settings />}
            >
              Advanced Settings
            </Button>
            
            <Collapse in={showSettings}>
              <Paper sx={{ p: 2, mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>AI Provider</InputLabel>
                      <Select
                        value={settings.provider}
                        onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                      >
                        <MenuItem value="openai">OpenAI GPT</MenuItem>
                        <MenuItem value="gemini">Google Gemini</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Summary Length</InputLabel>
                      <Select
                        value={settings.summaryLength}
                        onChange={(e) => setSettings({ ...settings, summaryLength: e.target.value })}
                      >
                        <MenuItem value="short">Short</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="long">Long</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.extractKeyPoints}
                          onChange={(e) => setSettings({ ...settings, extractKeyPoints: e.target.checked })}
                        />
                      }
                      label="Extract key points"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Collapse>
          </Box>

          <Box mt={3} display="flex" gap={2}>
            <Button
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={uploading || files.every(f => f.status === 'completed')}
              startIcon={<CloudUpload />}
            >
              Upload and Process
            </Button>
            <Button
              variant="outlined"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Clear All
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const URLTab = ({ onUploadSuccess }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'openai',
    model: 'gpt-3.5-turbo'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    try {
      const response = await api.post('/summaries/url', {
        url,
        options: settings
      });

      toast.success('URL submitted for processing!');
      onUploadSuccess(response.data.data.jobId);
      setUrl('');
    } catch (error) {
      toast.error('Failed to process URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Enter URL"
        placeholder="https://example.com/article"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        InputProps={{
          startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
        }}
      />
      
      <Box mt={3}>
        <FormControl component="fieldset">
          <FormLabel component="legend">AI Provider</FormLabel>
          <RadioGroup
            row
            value={settings.provider}
            onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
          >
            <FormControlLabel value="openai" control={<Radio />} label="OpenAI GPT" />
            <FormControlLabel value="gemini" control={<Radio />} label="Google Gemini" />
          </RadioGroup>
        </FormControl>
      </Box>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        sx={{ mt: 3 }}
        disabled={!url || loading}
        startIcon={<LinkIcon />}
      >
        {loading ? 'Processing...' : 'Summarize URL'}
      </Button>
    </Box>
  );
};

const TextTab = ({ onUploadSuccess }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text || !title) return;

    setLoading(true);
    try {
      const response = await api.post('/summaries/text', {
        title,
        text,
        options: { provider: 'openai' }
      });

      toast.success('Text submitted for processing!');
      onUploadSuccess(response.data.data.jobId);
      setText('');
      setTitle('');
    } catch (error) {
      toast.error('Failed to process text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Title"
        placeholder="Enter a title for your text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />
      
      <TextField
        fullWidth
        multiline
        rows={8}
        label="Enter your text"
        placeholder="Paste or type your text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />
      
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        {text.length} characters
      </Typography>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        sx={{ mt: 3 }}
        disabled={!text || !title || loading}
        startIcon={<TextFields />}
      >
        {loading ? 'Processing...' : 'Summarize Text'}
      </Button>
    </Box>
  );
};

const Upload = () => {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const { subscribe, unsubscribe } = useWebSocket();

  const handleUploadSuccess = (jobId) => {
    // Subscribe to job updates
    const handleJobUpdate = (data) => {
      if (data.progress === 100) {
        toast.success('Processing completed!');
        navigate(`/summaries/${data.summaryId}`);
      }
    };

    subscribe(`job:${jobId}`, handleJobUpdate);
    
    // Cleanup subscription after 5 minutes
    setTimeout(() => {
      unsubscribe(`job:${jobId}`, handleJobUpdate);
    }, 300000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Upload Content
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload files, provide URLs, or paste text to generate AI-powered summaries
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="File Upload" icon={<CloudUpload />} iconPosition="start" />
          <Tab label="From URL" icon={<LinkIcon />} iconPosition="start" />
          <Tab label="Text Input" icon={<TextFields />} iconPosition="start" />
        </Tabs>

        <Box p={3}>
          {activeTab === 0 && <FileUploadTab onUploadSuccess={handleUploadSuccess} />}
          {activeTab === 1 && <URLTab onUploadSuccess={handleUploadSuccess} />}
          {activeTab === 2 && <TextTab onUploadSuccess={handleUploadSuccess} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default Upload;