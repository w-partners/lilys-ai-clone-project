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
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://youtube.platformmakers.org/api' 
  : 'http://localhost:5002/api';

const drawerWidth = 280;

const FixedSidebar = ({ 
  isLoggedIn, 
  user, 
  onLogin, 
  onLogout,
  onNavigate,
  currentPage 
}) => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 히스토리 관련 상태
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

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
    setShowHistory(false);
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

  // 로그인 상태가 변경되면 히스토리 자동 로드
  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory();
      setShowHistory(true);
    } else {
      setShowHistory(false);
      setHistory([]);
    }
  }, [isLoggedIn]);

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

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        {/* 로그인 정보 영역 */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6" component="div" sx={{ mb: 2 }}>
            학습정보센터
          </Typography>
          
          {isLoggedIn ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'white', color: 'primary.main' }}>
                {user?.role === 'admin' ? <AdminIcon /> : <PersonIcon />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {user?.phoneNumber}
                </Typography>
                <Chip 
                  label={user?.role === 'admin' ? '관리자' : '사용자'} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'white', 
                    color: user?.role === 'admin' ? 'secondary.main' : 'primary.main',
                    height: 20,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
              <IconButton size="small" onClick={handleLogout} sx={{ color: 'white' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Button 
              fullWidth 
              variant="contained" 
              sx={{ bgcolor: 'white', color: 'primary.main' }}
              onClick={() => setLoginOpen(true)}
              startIcon={<LoginIcon />}
            >
              로그인
            </Button>
          )}
        </Box>

        {/* 메뉴 영역 */}
        <List>
          <ListItem disablePadding>
            <ListItemButton 
              selected={currentPage === 'home'}
              onClick={() => onNavigate('home')}
            >
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="홈" />
            </ListItemButton>
          </ListItem>

          {isLoggedIn && user?.role === 'admin' && (
            <>
              <ListItem disablePadding>
                <ListItemButton 
                  selected={currentPage === 'admin'}
                  onClick={() => onNavigate('admin')}
                >
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="시스템 프롬프트" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton 
                  selected={currentPage === 'summaries'}
                  onClick={() => onNavigate('summaries')}
                >
                  <ListItemIcon>
                    <AdminIcon />
                  </ListItemIcon>
                  <ListItemText primary="요약 관리" />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>

        <Divider />

        {/* 히스토리 영역 */}
        {isLoggedIn && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                히스토리
              </Typography>
              <IconButton size="small" onClick={fetchHistory}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>

            {historyLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}

            {historyError && (
              <Alert severity="error" sx={{ m: 1, fontSize: '0.7rem' }}>
                {historyError}
              </Alert>
            )}

            {!historyLoading && !historyError && history.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  처리 히스토리가 없습니다
                </Typography>
              </Box>
            )}

            {history.map((item, index) => {
              const statusInfo = getStatusInfo(item.status);
              const videoId = getYouTubeVideoId(item.sourceUrl);
              
              return (
                <Card key={item.id || index} sx={{ mb: 0.5 }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={statusInfo.icon}
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {formatDate(item.createdAt)}
                      </Typography>
                    </Box>

                    {videoId && (
                      <Box sx={{ mb: 0.5 }}>
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt="YouTube Thumbnail"
                          style={{ 
                            width: '100%', 
                            height: '60px', 
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
                        gap: 0.3,
                        textDecoration: 'none',
                        fontSize: '0.7rem'
                      }}
                    >
                      YouTube 보기
                      <LaunchIcon sx={{ fontSize: '0.7rem' }} />
                    </Link>

                    {item.status === 'completed' && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3, fontSize: '0.65rem' }}>
                        요약: {item.summaryCount || 6}개
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
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
          
          {/* 빠른 로그인 버튼들 */}
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              빠른 로그인
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  setPhoneNumber('01034424668');
                  setPassword('admin1234');
                }}
                disabled={loading}
                sx={{ fontSize: '0.75rem' }}
              >
                관리자 계정
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  setPhoneNumber('01012345678');
                  setPassword('admin1234');
                }}
                disabled={loading}
                sx={{ fontSize: '0.75rem' }}
              >
                운영자 계정
              </Button>
            </Box>
          </Box>
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

export default FixedSidebar;