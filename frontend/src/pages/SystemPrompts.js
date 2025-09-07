import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://youtube.platformmakers.org/api' 
  : 'http://localhost:5002/api';

const SystemPrompts = ({ isLoggedIn, user, onPromptsUpdate }) => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({ name: '', content: '' });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', content: '' });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/system-prompts/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPrompts(response.data.data.prompts);
      }
    } catch (error) {
      setError('시스템 프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt) => {
    setEditMode(prompt.id);
    setEditData({ name: prompt.name, content: prompt.content });
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    setEditData({ name: '', content: '' });
  };

  const handleSaveEdit = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(
        `${API_BASE_URL}/system-prompts/${id}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSuccess('시스템 프롬프트가 수정되었습니다.');
        fetchPrompts();
        setEditMode(null);
        if (onPromptsUpdate) onPromptsUpdate();
      }
    } catch (error) {
      setError(error.response?.data?.error || '수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/system-prompts/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSuccess('시스템 프롬프트가 삭제되었습니다.');
        fetchPrompts();
        if (onPromptsUpdate) onPromptsUpdate();
      }
    } catch (error) {
      setError(error.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  const handleAdd = async () => {
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) {
      setError('이름과 내용을 모두 입력해주세요.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/system-prompts`,
        newPrompt,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSuccess('시스템 프롬프트가 추가되었습니다.');
        fetchPrompts();
        setAddDialogOpen(false);
        setNewPrompt({ name: '', content: '' });
        if (onPromptsUpdate) onPromptsUpdate();
      }
    } catch (error) {
      setError(error.response?.data?.error || '추가에 실패했습니다.');
    }
  };

  if (!isLoggedIn || user?.role !== 'admin') {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">관리자만 접근 가능합니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">시스템 프롬프트 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          새 프롬프트 추가
        </Button>
      </Box>

      <Grid container spacing={2}>
        {prompts && prompts.length > 0 ? prompts.map((prompt) => (
          <Grid item xs={12} md={6} key={prompt.id}>
            <Card>
              <CardContent>
                {editMode === prompt.id ? (
                  <>
                    <TextField
                      fullWidth
                      label="이름"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      label="내용"
                      value={editData.content}
                      onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      {prompt.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {prompt.content}
                    </Typography>
                  </>
                )}
              </CardContent>
              <CardActions>
                {editMode === prompt.id ? (
                  <>
                    <IconButton
                      color="primary"
                      onClick={() => handleSaveEdit(prompt.id)}
                    >
                      <SaveIcon />
                    </IconButton>
                    <IconButton
                      color="default"
                      onClick={handleCancelEdit}
                    >
                      <CancelIcon />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      onClick={() => handleEdit(prompt)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(prompt.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                )}
              </CardActions>
            </Card>
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" align="center">
              시스템 프롬프트가 없습니다.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 시스템 프롬프트 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="이름"
            fullWidth
            value={newPrompt.name}
            onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="내용"
            fullWidth
            multiline
            rows={8}
            value={newPrompt.content}
            onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>취소</Button>
          <Button onClick={handleAdd} variant="contained">추가</Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SystemPrompts;