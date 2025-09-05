import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  IconButton,
  InputAdornment,
  LinearProgress,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  YouTube as YouTubeIcon,
  Send as SendIcon,
  Email as EmailIcon,
  ContentPaste as PasteIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { summaryService, systemPromptService } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

function Home() {
  const navigate = useNavigate();
  const { socket } = useWebSocket();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState({});
  const [systemPrompts, setSystemPrompts] = useState([]);
  const [systemPromptIds, setSystemPromptIds] = useState([]);

  // 시스템 프롬프트 로드 (컴포넌트 마운트 시)
  useEffect(() => {
    const loadSystemPrompts = async () => {
      try {
        const response = await systemPromptService.getPublic();
        if (response.success && response.data) {
          const prompts = response.data.slice(0, 6); // 최대 6개만
          setSystemPrompts(prompts.map(p => p.name));
          setSystemPromptIds(prompts.map(p => p.id));
        } else {
          // 기본 프롬프트 사용
          setSystemPrompts([
            '핵심 요약',
            '상세 분석', 
            '실행 가능한 인사이트',
            '학습 포인트',
            'Q&A 생성',
            '비즈니스 적용'
          ]);
        }
      } catch (error) {
        console.error('시스템 프롬프트 로드 실패:', error);
        // 기본 프롬프트 사용
        setSystemPrompts([
          '핵심 요약',
          '상세 분석', 
          '실행 가능한 인사이트',
          '학습 포인트',
          'Q&A 생성',
          '비즈니스 적용'
        ]);
      }
    };

    loadSystemPrompts();
  }, []);

  // WebSocket 이벤트 리스너 설정
  useEffect(() => {
    if (!socket || !jobId) return;

    const handleProgress = (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress || 0);
      }
    };

    const handleComplete = (data) => {
      if (data.jobId === jobId) {
        setLoading(false);
        setProgress(100);
        
        // 결과를 6개의 프롬프트 탭으로 구성
        const formattedResults = data.result?.summaries || [
          { title: systemPrompts[0], content: data.result?.summary || data.result },
          { title: systemPrompts[1], content: '처리 중...' },
          { title: systemPrompts[2], content: '처리 중...' },
          { title: systemPrompts[3], content: '처리 중...' },
          { title: systemPrompts[4], content: '처리 중...' },
          { title: systemPrompts[5], content: '처리 중...' },
        ];
        
        setResults(formattedResults);
        toast.success('요약이 완료되었습니다!');
        
        // 이메일 전송 처리
        if (email && showEmailInput) {
          sendResultsByEmail(formattedResults);
        }
      }
    };

    const handleError = (data) => {
      if (data.jobId === jobId) {
        setLoading(false);
        setError(data.error || '처리 중 오류가 발생했습니다.');
        toast.error('처리 중 오류가 발생했습니다.');
      }
    };

    socket.on('job:progress', handleProgress);
    socket.on('job:complete', handleComplete);
    socket.on('job:error', handleError);

    return () => {
      socket.off('job:progress', handleProgress);
      socket.off('job:complete', handleComplete);
      socket.off('job:error', handleError);
    };
  }, [socket, jobId, email, showEmailInput]);

  const validateYouTubeUrl = (url) => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[-\w]+(&[\w=]*)?$/;
    return regex.test(url);
  };

  const sendResultsByEmail = async (summaryResults) => {
    try {
      // 이메일 전송 API 호출 (백엔드에 구현 필요)
      await summaryService.sendEmail({
        email,
        subject: `YouTube 동영상 요약: ${url}`,
        content: summaryResults,
      });
      toast.success(`결과가 ${email}로 전송되었습니다.`);
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('이메일 전송에 실패했습니다.');
    }
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopied({ ...copied, [index]: true });
    toast.success('클립보드에 복사되었습니다.');
    
    setTimeout(() => {
      setCopied({ ...copied, [index]: false });
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('YouTube URL을 입력해주세요');
      return;
    }

    if (!validateYouTubeUrl(url)) {
      setError('올바른 YouTube URL을 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setProgress(0);

    try {
      // /process 엔드포인트를 직접 호출
      const response = await summaryService.processContent(url, 'gemini', apiKey, email);
      
      if (response.success && response.results) {
        // 백엔드에서 받은 결과를 탭 형식으로 구성
        const formattedResults = response.results.map((result, index) => ({
          title: result.promptName || systemPrompts[index] || `결과 ${index + 1}`,
          content: result.content || '처리 중...'
        }));
        
        setResults(formattedResults);
        setLoading(false);
        toast.success('요약이 완료되었습니다!');
        
        if (email && showEmailInput) {
          toast.info('이메일로 전송되었습니다.');
        }
      } else if (response.jobId) {
        // 백그라운드 처리의 경우
        setJobId(response.jobId);
        toast.success('처리를 시작했습니다. 잠시만 기다려주세요...');
      } else {
        throw new Error(response.error || '처리 중 문제가 발생했습니다.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '서버 연결에 실패했습니다');
      setLoading(false);
      toast.error('처리 중 오류가 발생했습니다.');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 헤더 */}
        <Box textAlign="center" mb={6}>
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Lily's AI Clone
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            YouTube, PDF, WebPage, Audio 어떤 자료든 완벽하게 요약
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
            <Chip label="YouTube" color="error" icon={<YouTubeIcon />} />
            <Chip label="무료 체험" color="success" />
            <Chip label="로그인 없이 사용 가능" color="info" />
          </Stack>
        </Box>

        {/* 입력 폼 */}
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <form onSubmit={handleSubmit}>
            <Box mb={3}>
              <TextField
                fullWidth
                label="YouTube URL을 입력하세요"
                variant="outlined"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <YouTubeIcon color="error" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handlePaste} edge="end">
                        <PasteIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                disabled={loading}
              />
            </Box>

            {/* 옵션 영역 */}
            <Box mb={3}>
              <Stack spacing={2}>
                <Box>
                  <Button
                    variant={showEmailInput ? "contained" : "outlined"}
                    startIcon={<EmailIcon />}
                    onClick={() => setShowEmailInput(!showEmailInput)}
                    size="small"
                  >
                    이메일로 결과 받기
                  </Button>
                </Box>
                
                {showEmailInput && (
                  <TextField
                    fullWidth
                    label="이메일 주소"
                    variant="outlined"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    size="small"
                    disabled={loading}
                  />
                )}

                <TextField
                  fullWidth
                  label="API 키 (선택사항 - 없으면 기본 키 사용)"
                  variant="outlined"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Gemini 또는 OpenAI API 키"
                  size="small"
                  disabled={loading}
                  helperText="API 키가 없어도 사용 가능합니다"
                />
              </Stack>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  처리 중... {progress}%
                </Typography>
              </Box>
            )}

            <Box display="flex" gap={2}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? '처리 중...' : '요약 시작'}
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ py: 1.5, minWidth: 150 }}
              >
                로그인
              </Button>
            </Box>
          </form>
        </Paper>

        {/* 결과 영역 */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                요약 결과
              </Typography>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                  {systemPrompts.map((prompt, index) => (
                    <Tab key={index} label={prompt} />
                  ))}
                </Tabs>
              </Box>

              {results.map((result, index) => (
                <Box
                  key={index}
                  role="tabpanel"
                  hidden={activeTab !== index}
                  sx={{ pt: 2 }}
                >
                  {activeTab === index && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" color="primary">
                          {result.title || systemPrompts[index]}
                        </Typography>
                        <Tooltip title="복사">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(result.content, index)}
                            color={copied[index] ? 'success' : 'default'}
                          >
                            {copied[index] ? <CheckCircleIcon /> : <CopyIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.8 
                        }}
                      >
                        {result.content || '처리 중...'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
              
              {/* 로그인 유도 */}
              <Box mt={4} p={3} bgcolor="grey.100" borderRadius={2}>
                <Typography variant="body1" gutterBottom>
                  💡 더 많은 기능을 사용하고 싶으신가요?
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  로그인하면 히스토리 저장, 파일 업로드, 맞춤 프롬프트 등을 사용할 수 있습니다.
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/login')}
                  sx={{ mt: 2 }}
                >
                  로그인하고 모든 기능 사용하기
                </Button>
              </Box>
            </Paper>
          </motion.div>
        )}

        {/* 기능 소개 */}
        {!results && !loading && (
          <Box mt={6}>
            <Typography variant="h5" textAlign="center" gutterBottom>
              주요 기능
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mt={3}>
              <Paper sx={{ p: 3, flex: 1, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  🎯 6가지 분석 관점
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  핵심 요약부터 비즈니스 적용까지 다양한 관점에서 분석
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, flex: 1, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  ⚡ 빠른 처리
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  최신 AI 기술로 빠르고 정확한 요약 제공
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, flex: 1, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  📧 이메일 전송
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  결과를 이메일로 받아 나중에 확인 가능
                </Typography>
              </Paper>
            </Stack>
          </Box>
        )}
      </motion.div>
    </Container>
  );
}

export default Home;