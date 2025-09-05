import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { systemPromptService } from '../services/api';

// 캐시 버스터를 위한 랜덤 문자열
const CACHE_BUSTER = Math.random().toString(36).substring(7);
console.log('AdminPrompts loaded with cache buster:', CACHE_BUSTER);

function AdminPrompts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 상태 관리 - 간단한 useState 사용
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    category: 'general',
    isActive: true,
    isDefault: false,
    order: 1
  });

  // 프롬프트 목록 로드
  const loadPrompts = async () => {
    console.log('=== loadPrompts 시작 ===');
    setLoading(true);
    setError('');
    
    try {
      console.log('API 호출 시작...');
      const response = await systemPromptService.getAll();
      console.log('API 응답:', response);
      
      if (response && response.data) {
        console.log('프롬프트 개수:', response.data.length);
        console.log('프롬프트 데이터:', response.data);
        setPrompts(response.data);
        console.log('상태 업데이트 완료');
      } else {
        console.log('응답에 데이터가 없음');
        setPrompts([]);
      }
    } catch (err) {
      console.error('프롬프트 로드 실패:', err);
      setError('프롬프트를 불러오는데 실패했습니다.');
      setPrompts([]);
    } finally {
      setLoading(false);
      console.log('=== loadPrompts 종료 ===');
    }
  };

  // 컴포넌트 마운트 시 프롬프트 로드
  useEffect(() => {
    console.log('AdminPrompts 컴포넌트 마운트됨');
    
    // 관리자 권한 체크
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    loadPrompts();
  }, [user, navigate]);

  // 디버깅을 위한 상태 로그
  useEffect(() => {
    console.log('현재 prompts 상태:', prompts);
    console.log('prompts 길이:', prompts.length);
    console.log('loading:', loading);
  }, [prompts, loading]);

  // 다이얼로그 열기
  const handleOpenDialog = (prompt = null) => {
    console.log('다이얼로그 열기:', prompt);
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        name: prompt.name || '',
        prompt: prompt.prompt || '',
        category: prompt.category || 'general',
        isActive: prompt.isActive !== false,
        isDefault: prompt.isDefault || false,
        order: prompt.order || 1
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        name: '',
        prompt: '',
        category: 'general',
        isActive: true,
        isDefault: false,
        order: prompts.length + 1
      });
    }
    setOpenDialog(true);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPrompt(null);
    setFormData({
      name: '',
      prompt: '',
      category: 'general',
      isActive: true,
      isDefault: false,
      order: 1
    });
  };

  // 프롬프트 저장
  const handleSavePrompt = async () => {
    console.log('프롬프트 저장:', formData);
    
    try {
      if (editingPrompt) {
        // 수정
        console.log('프롬프트 수정:', editingPrompt.id);
        await systemPromptService.update(editingPrompt.id, formData);
        setSuccess('프롬프트가 수정되었습니다.');
      } else {
        // 생성
        console.log('프롬프트 생성');
        await systemPromptService.create(formData);
        setSuccess('프롬프트가 생성되었습니다.');
      }
      
      handleCloseDialog();
      await loadPrompts();
    } catch (err) {
      console.error('프롬프트 저장 실패:', err);
      setError('프롬프트 저장에 실패했습니다.');
    }
  };

  // 프롬프트 삭제
  const handleDeletePrompt = async (id) => {
    console.log('프롬프트 삭제:', id);
    
    if (!window.confirm('정말 이 프롬프트를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      await systemPromptService.delete(id);
      setSuccess('프롬프트가 삭제되었습니다.');
      await loadPrompts();
    } catch (err) {
      console.error('프롬프트 삭제 실패:', err);
      setError('프롬프트 삭제에 실패했습니다.');
    }
  };

  // 활성화 상태 토글
  const handleToggleActive = async (prompt) => {
    console.log('활성화 토글:', prompt.id, !prompt.isActive);
    
    try {
      await systemPromptService.update(prompt.id, {
        ...prompt,
        isActive: !prompt.isActive
      });
      await loadPrompts();
    } catch (err) {
      console.error('활성화 상태 변경 실패:', err);
      setError('활성화 상태 변경에 실패했습니다.');
    }
  };

  // 렌더링
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            시스템 프롬프트 관리
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            새 프롬프트
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              총 {prompts.length}개의 프롬프트 (Cache: {CACHE_BUSTER})
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>프롬프트</TableCell>
                    <TableCell align="center">상태</TableCell>
                    <TableCell align="center">기본값</TableCell>
                    <TableCell align="center">순서</TableCell>
                    <TableCell align="center">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prompts.length > 0 ? (
                    prompts.map((prompt) => (
                      <TableRow key={prompt.id}>
                        <TableCell>{prompt.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={prompt.category} 
                            size="small" 
                            color={prompt.category === 'summary' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ 
                            maxWidth: 300, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' 
                          }}>
                            {prompt.prompt}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={prompt.isActive}
                            onChange={() => handleToggleActive(prompt)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {prompt.isDefault && (
                            <Chip label="기본" size="small" color="secondary" />
                          )}
                        </TableCell>
                        <TableCell align="center">{prompt.order}</TableCell>
                        <TableCell align="center">
                          <IconButton 
                            onClick={() => handleOpenDialog(prompt)}
                            color="primary"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            onClick={() => handleDeletePrompt(prompt.id)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        프롬프트가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* 프롬프트 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPrompt ? '프롬프트 수정' : '새 프롬프트 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="이름"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="카테고리"
              >
                <MenuItem value="general">일반</MenuItem>
                <MenuItem value="summary">요약</MenuItem>
                <MenuItem value="analysis">분석</MenuItem>
                <MenuItem value="translation">번역</MenuItem>
                <MenuItem value="question">질문</MenuItem>
                <MenuItem value="other">기타</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="프롬프트"
              fullWidth
              multiline
              rows={6}
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              required
              helperText="AI에게 전달될 시스템 프롬프트를 입력하세요."
            />
            
            <TextField
              label="순서"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              InputProps={{ inputProps: { min: 1 } }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="활성화"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
              }
              label="기본값으로 설정"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            취소
          </Button>
          <Button 
            onClick={handleSavePrompt} 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
          >
            {editingPrompt ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminPrompts;