import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Person,
  Key,
  Notifications,
  Language,
  Save,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import ApiKeyManager from './ApiKeyManager';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    autoSave: true,
    language: 'ko'
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        const userData = response.data.data.user;
        setProfile({
          name: userData.name || '',
          phone: userData.phone || '',
          email: userData.email || ''
        });
        // API keys are now managed separately in ApiKeyManager
        setPreferences({
          emailNotifications: userData.preferences?.emailNotifications ?? true,
          autoSave: userData.preferences?.autoSave ?? true,
          language: userData.preferences?.language || 'ko'
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.put('/auth/profile', profile);
      if (response.data.success) {
        updateUser(response.data.data);
        toast.success('프로필이 업데이트되었습니다');
      }
    } catch (error) {
      toast.error('프로필 업데이트 실패');
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordChange = async () => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/password', {
        currentPassword: passwordChange.currentPassword,
        newPassword: passwordChange.newPassword
      });
      if (response.data.success) {
        toast.success('비밀번호가 변경되었습니다');
        setPasswordChange({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error('비밀번호 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.put('/auth/preferences', preferences);
      if (response.data.success) {
        toast.success('환경설정이 저장되었습니다');
      }
    } catch (error) {
      toast.error('환경설정 저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        설정 (변경사항 테스트 중)
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Person sx={{ mr: 1 }} />
                <Typography variant="h6">프로필 정보</Typography>
              </Box>
              
              <Box display="flex" justifyContent="center" mb={3}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    fontSize: '2rem'
                  }}
                >
                  {user?.name?.charAt(0) || user?.phone?.slice(-4)}
                </Avatar>
              </Box>

              <TextField
                fullWidth
                label="이름"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="전화번호"
                value={profile.phone}
                disabled
                margin="normal"
                helperText="전화번호는 변경할 수 없습니다"
              />
              
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                margin="normal"
              />

              <Box mt={2}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  fullWidth
                >
                  프로필 저장
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* API Keys Section - Show new manager for admin */}
        <Grid item xs={12}>
          <ApiKeyManager />
        </Grid>
        
        {/* System Prompts Section - Show for admin */}
        {user?.role === 'admin' && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">시스템 프롬프트 관리</Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => navigate('/admin/prompts')}
                  >
                    프롬프트 관리
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  AI 응답을 생성할 때 사용되는 시스템 프롬프트를 관리합니다.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  여러 개의 프롬프트를 등록하여 다양한 관점의 요약을 생성할 수 있습니다.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Password Change Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Key sx={{ mr: 1 }} />
                <Typography variant="h6">비밀번호 변경</Typography>
              </Box>

              <TextField
                fullWidth
                label="현재 비밀번호"
                type="password"
                value={passwordChange.currentPassword}
                onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="새 비밀번호"
                type="password"
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="새 비밀번호 확인"
                type="password"
                value={passwordChange.confirmPassword}
                onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                margin="normal"
              />

              <Box mt={2}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handlePasswordChange}
                  disabled={loading}
                  fullWidth
                >
                  비밀번호 변경
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Notifications sx={{ mr: 1 }} />
                <Typography variant="h6">환경설정</Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  />
                }
                label="이메일 알림 받기"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.autoSave}
                    onChange={(e) => setPreferences({ ...preferences, autoSave: e.target.checked })}
                  />
                }
                label="자동 저장"
              />

              <TextField
                fullWidth
                select
                label="언어"
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                margin="normal"
                SelectProps={{
                  native: true,
                }}
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </TextField>

              <Box mt={2}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handlePreferencesUpdate}
                  disabled={loading}
                  fullWidth
                >
                  환경설정 저장
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Info */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              계정 정보
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography color="text.secondary">계정 유형</Typography>
                <Typography variant="body1">
                  {user?.role === 'admin' ? '관리자' : '일반 사용자'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography color="text.secondary">가입일</Typography>
                <Typography variant="body1">
                  {new Date(user?.createdAt || Date.now()).toLocaleDateString('ko-KR')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography color="text.secondary">총 요약 수</Typography>
                <Typography variant="body1">
                  {user?.summaryCount || 0}개
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography color="text.secondary">계정 상태</Typography>
                <Typography variant="body1" color="success.main">
                  활성
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;