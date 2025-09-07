import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  ListItemButton,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Link
} from '@mui/material';
import {
  Home as HomeIcon,
  History as HistoryIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://youtube.platformmakers.org/api' 
  : 'http://localhost:5002/api';

const Sidebar = ({ 
  open, 
  onClose, 
  isLoggedIn, 
  user, 
  onLogin, 
  onLogout,
  onNavigate 
}) => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 히스토리 관련 상태
  // 로그인한 사용자는 히스토리를 바로 보여주도록 기본값 설정
  const [currentView, setCurrentView] = useState(isLoggedIn ? 'history' : 'menu'); // 'menu' | 'history'
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // 로그인 상태가 변경되면 currentView 업데이트
  useEffect(() => {
    if (isLoggedIn) {
      setCurrentView('history');
    } else {
      setCurrentView('menu');
    }
  }, [isLoggedIn]);

  // 사이드바가 열리고 로그인 상태일 때 자동으로 히스토리 불러오기
  useEffect(() => {
    if (open && isLoggedIn && currentView === 'history') {
      fetchHistory();
    }
  }, [open, isLoggedIn, currentView]);

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      setError('전화번호와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        phoneNumber: phoneNumber.trim(),
        password
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        onLogin(response.data.data.user);
        setLoginOpen(false);
        setPhoneNumber('');
        setPassword('');
        setError('');
      }
    } catch (error) {
      setError(error.response?.data?.error || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
    onClose();
  };

  const fetchHistory = async () => {
    if (!isLoggedIn) return;
    
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHistory(response.data.data.jobs);
      }
    } catch (error) {
      setHistoryError(error.response?.data?.error || '히스토리를 불러오는데 실패했습니다.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { label: '완료', color: 'success', icon: <CheckCircleIcon /> };
      case 'processing':
        return { label: '처리중', color: 'info', icon: <PlayArrowIcon /> };
      case 'pending':
        return { label: '대기중', color: 'warning', icon: <ScheduleIcon /> };
      case 'failed':
        return { label: '실패', color: 'error', icon: <ErrorIcon /> };
      default:
        return { label: status, color: 'default', icon: <ScheduleIcon /> };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const getYouTubeVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const handleHistoryClick = () => {
    setCurrentView('history');
    fetchHistory();
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
    setHistory([]);
    setHistoryError('');
  };

  const menuItems = [
    {
      text: '홈',
      icon: <HomeIcon />,
      onClick: () => {
        onNavigate('home');
        onClose();
      }
    },
    ...(isLoggedIn ? [
      {
        text: '히스토리',
        icon: <HistoryIcon />,
        onClick: handleHistoryClick
      }
    ] : []),
    {
      text: isLoggedIn ? '로그아웃' : '로그인',
      icon: isLoggedIn ? <LogoutIcon /> : <LoginIcon />,
      onClick: isLoggedIn ? handleLogout : () => setLoginOpen(true)
    }
  ];

  // 히스토리 뷰 렌더링
  const renderHistoryView = () => (
    <Box>
      {/* 히스토리 헤더 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={handleBackToMenu} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            히스토리
          </Typography>
          <IconButton onClick={fetchHistory} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 히스토리 컨텐츠 */}
      <Box sx={{ p: 1, maxHeight: '60vh', overflow: 'auto' }}>
        {historyLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {historyError && (
          <Alert severity="error" sx={{ m: 1, fontSize: '0.75rem' }}>
            {historyError}
          </Alert>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              처리 히스토리가 없습니다
            </Typography>
          </Box>
        )}

        {history.map((item, index) => {
          const statusInfo = getStatusInfo(item.status);
          const videoId = getYouTubeVideoId(item.sourceUrl);
          
          return (
            <Card key={item.id || index} sx={{ mb: 1 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={statusInfo.label}
                    color={statusInfo.color}
                    size="small"
                    icon={statusInfo.icon}
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.createdAt)}
                  </Typography>
                </Box>

                {videoId && (
                  <Box sx={{ mb: 1, textAlign: 'center' }}>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt="YouTube Thumbnail"
                      style={{ 
                        width: '100%', 
                        height: '80px', 
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                )}

                <Link 
                  href={item.sourceUrl} 
                  target="_blank" 
                  rel="noopener"
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    textDecoration: 'none',
                    fontSize: '0.75rem'
                  }}
                >
                  YouTube 영상 보기
                  <LaunchIcon fontSize="small" />
                </Link>

                {item.status === 'completed' && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    요약 결과: {item.summaryCount || 6}개
                  </Typography>
                )}

                {item.status === 'failed' && item.errorMessage && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    오류: {item.errorMessage}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );

  // 메인 메뉴 뷰 렌더링
  const renderMenuView = () => (
    <Box>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            학습정보센터
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {isLoggedIn && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {user?.phoneNumber}
              </Typography>
              <Chip 
                label={user?.role === 'admin' ? '관리자' : '사용자'} 
                size="small" 
                color={user?.role === 'admin' ? 'secondary' : 'default'}
              />
            </Box>
          </Box>
        )}
      </Box>

      <List>
        {menuItems.map((item, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton onClick={item.onClick}>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <List>
        {isLoggedIn && user?.role === 'admin' && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => {
              onNavigate('admin');
              onClose();
            }}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="관리자 설정" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: 320 }
        }}
      >
        {currentView === 'menu' ? renderMenuView() : renderHistoryView()}
      </Drawer>

      {/* 로그인 다이얼로그 */}
      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>로그인</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="전화번호"
            type="tel"
            fullWidth
            variant="outlined"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="01012345678"
            sx={{ mb: 2 }}
            disabled={loading}
          />
          <TextField
            margin="dense"
            label="비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleLogin();
              }
            }}
          />
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleLogin} variant="contained" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;