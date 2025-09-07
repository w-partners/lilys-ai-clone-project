import React, { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
  IconButton,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Send as SendIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import io from 'socket.io-client';
import axios from 'axios';
import FixedSidebar from './components/FixedSidebar';
import History from './components/History';
import SystemPrompts from './pages/SystemPrompts';
import Summaries from './pages/Summaries';

// 테마 설정
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://youtube.platformmakers.org/api' 
  : 'http://localhost:5002/api';

const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? 'https://youtube.platformmakers.org'
  : 'http://localhost:5002';

function App() {
  // 상태 관리
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [results, setResults] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [systemPrompts, setSystemPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  // 소켓 연결 초기화
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket 연결됨');
    });

    socketInstance.on('job:progress', (data) => {
      setProgress(data.progress);
      setCurrentStage(data.currentStage);
    });

    socketInstance.on('job:complete', (data) => {
      setLoading(false);
      setResults(data.summaries);
      setProgress(100);
      setCurrentStage('완료');
      setError('');
    });

    socketInstance.on('job:error', (data) => {
      setLoading(false);
      setError(data.error);
      setSnackbarOpen(true);
      setProgress(0);
      setCurrentStage('');
    });

    setSocket(socketInstance);

    // 토큰이 있으면 사용자 정보 확인
    if (token) {
      checkAuthStatus();
    }
    
    // 시스템 프롬프트 목록 불러오기
    fetchSystemPrompts();

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // 시스템 프롬프트 목록 불러오기
  const fetchSystemPrompts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/system-prompts`);
      if (response.data.success && response.data.data?.prompts) {
        setSystemPrompts(response.data.data.prompts);
        // 첫 번째 프롬프트를 기본값으로 설정
        if (response.data.data.prompts.length > 0) {
          setSelectedPrompt(response.data.data.prompts[0].id);
        }
      }
    } catch (error) {
      console.error('시스템 프롬프트 불러오기 실패:', error);
      // 에러가 발생해도 빈 배열로 설정하여 앱이 작동하도록 함
      setSystemPrompts([]);
    }
  };

  // 인증 상태 확인
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setIsLoggedIn(true);
        setUser(response.data.data.user);
      }
    } catch (error) {
      localStorage.removeItem('token');
    }
  };

  // 로그인 처리
  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
    setError('로그인 성공!');
    setSnackbarOpen(true);
  };

  // 로그아웃 처리
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setResults(null);
    setCurrentPage('home');
  };

  // 네비게이션 처리
  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // YouTube URL 검증
  const isValidYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  };

  // 처리 시작
  const handleSubmit = async () => {
    if (!youtubeUrl.trim()) {
      setError('YouTube URL을 입력해주세요.');
      setSnackbarOpen(true);
      return;
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      setError('올바른 YouTube URL을 입력해주세요.');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    setProgress(0);
    setCurrentStage('처리 시작...');
    setResults(null);
    setError('');

    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${API_BASE_URL}/process/youtube`,
        { url: youtubeUrl },
        { headers }
      );

      if (response.data.success) {
        // 소켓으로 실시간 진행상황을 받을 예정
        console.log('처리 시작:', response.data.data.jobId);
      }
    } catch (error) {
      setLoading(false);
      setError(error.response?.data?.error || '처리 중 오류가 발생했습니다.');
      setSnackbarOpen(true);
    }
  };

  const drawerWidth = 280;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* 고정 사이드바 */}
        <FixedSidebar
          isLoggedIn={isLoggedIn}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
        
        {/* 메인 컨텐츠 영역 */}
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            bgcolor: 'background.default',
            ml: `${drawerWidth}px`,
            width: `calc(100% - ${drawerWidth}px)`
          }}
        >
          {/* 헤더 */}
          <AppBar 
            position="sticky" 
            sx={{ 
              zIndex: (theme) => theme.zIndex.drawer - 1,
            }}
          >
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 0.3 }}>
                {currentPage === 'home' && 'YouTube 분석'}
                {currentPage === 'admin' && '시스템 프롬프트 관리'}
                {currentPage === 'summaries' && '요약 관리'}
                {currentPage === 'history' && '히스토리'}
              </Typography>
              
              {/* 시스템 프롬프트 선택 - 관리자만 표시 */}
              {user?.role === 'admin' && currentPage === 'home' && (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel sx={{ color: 'white' }}>시스템 프롬프트</InputLabel>
                    <Select
                      value={selectedPrompt}
                      label="시스템 프롬프트"
                      onChange={(e) => setSelectedPrompt(e.target.value)}
                      sx={{ 
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white'
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white'
                        }
                      }}
                    >
                      {systemPrompts && systemPrompts.length > 0 ? (
                        systemPrompts.map((prompt) => (
                          <MenuItem key={prompt.id} value={prompt.id}>
                            {prompt.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="">시스템 프롬프트 없음</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                  <IconButton 
                    color="inherit" 
                    onClick={() => handleNavigate('admin')}
                    sx={{ ml: 1 }}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Box>
              )}
            </Toolbar>
          </AppBar>

          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {currentPage === 'home' && (
          <>
            {/* 메인 입력 영역 */}
            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            YouTube 영상 분석 및 요약
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            YouTube URL을 입력하면 AI가 자막을 분석하여 6가지 방식으로 요약해드립니다.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="YouTube URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleSubmit();
                }
              }}
            />
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading || !youtubeUrl.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              sx={{ minWidth: 120 }}
            >
              {loading ? '처리중' : '분석'}
            </Button>
          </Box>

          {/* 진행상황 표시 */}
          {loading && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {currentStage}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progress}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            )}
            </Paper>

            {/* 결과 표시 */}
            {results && results.length > 0 && (
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  분석 결과
                </Typography>
                
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
                    {results.map((result, index) => (
                      <Tab
                        key={index}
                        label={result.systemPrompt?.name || `결과 ${index + 1}`}
                      />
                    ))}
                  </Tabs>
                </Box>

                {results.map((result, index) => (
                  <Box
                    key={index}
                    hidden={selectedTab !== index}
                    sx={{ pt: 3 }}
                  >
                    <Typography
                      variant="body1"
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        fontFamily: 'inherit'
                      }}
                    >
                      {result.content}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </>
        )}

        {currentPage === 'history' && (
          <History 
            isLoggedIn={isLoggedIn} 
            user={user}
          />
        )}
        
        {currentPage === 'admin' && (
          <SystemPrompts 
            isLoggedIn={isLoggedIn} 
            user={user}
            onPromptsUpdate={fetchSystemPrompts}
          />
        )}
        
        {currentPage === 'summaries' && (
          <Summaries 
            isLoggedIn={isLoggedIn} 
            user={user}
          />
        )}

        {/* 스낵바 */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={error.includes('성공') ? 'success' : 'error'}
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;