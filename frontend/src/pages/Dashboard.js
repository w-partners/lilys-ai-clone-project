import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Description,
  CloudUpload,
  Timer,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  ArrowForward,
  Psychology,
  Speed,
  YouTube as YouTubeIcon,
  Language as WebIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';
import { summaryService } from '../services/api';
import api from '../services/api';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon, color = 'primary', trend }) => (
  <Paper sx={{ p: 3 }}>
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Box>
        <Typography color="text.secondary" variant="body2" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
        {trend && (
          <Box display="flex" alignItems="center" mt={1}>
            <TrendingUp fontSize="small" color="success" />
            <Typography variant="body2" color="success.main" ml={0.5}>
              {trend}% from last week
            </Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          backgroundColor: `${color}.light`,
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {icon}
      </Box>
    </Box>
  </Paper>
);

const RecentSummaryCard = ({ summary, onView }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'openai': return '🤖';
      case 'gemini': return '✨';
      default: return '📄';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
            {summary.title}
          </Typography>
          <Chip
            label={getStatusLabel(summary.status)}
            color={getStatusColor(summary.status)}
            size="small"
            variant="filled"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {summary.preview || 'Processing...'}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            icon={<Typography>{getProviderIcon(summary.provider)}</Typography>}
            label={summary.provider}
            size="small"
            variant="outlined"
          />
          <Chip
            label={summary.sourceType}
            size="small"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {formatDistanceToNow(new Date(summary.createdAt), { addSuffix: true })}
          </Typography>
        </Box>

        {summary.status === 'processing' && summary.progress && (
          <Box mt={2}>
            <LinearProgress variant="determinate" value={summary.progress} />
            <Typography variant="caption" color="text.secondary">
              {summary.progress}% complete
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          onClick={() => onView(summary.id)}
          disabled={summary.status !== 'completed'}
          endIcon={<ArrowForward />}
        >
          View Summary
        </Button>
      </CardActions>
    </Card>
  );
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSummaries: 0,
    thisWeek: 0,
    processingTime: 0,
    successRate: 0
  });
  const [recentSummaries, setRecentSummaries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Input states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Processing states
  const [processing, setProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [currentResultTab, setCurrentResultTab] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState({});
  
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const navigate = useNavigate();
  
  const systemPrompts = [
    '핵심 요약',
    '상세 분석',
    '실행 가능한 인사이트',
    '학습 포인트',
    'Q&A 생성',
    '비즈니스 적용'
  ];

  const fetchDashboardData = async () => {
    try {
      const [statsRes, summariesRes] = await Promise.all([
        api.get('/summaries/stats'),
        api.get('/summaries?limit=6')
      ]);

      // Handle API response structure properly
      const statsData = statsRes.data?.data || statsRes.data || {};
      setStats(statsData);
      
      // Extract summaries from response - check both data.data.summaries and data.summaries
      const summariesData = summariesRes.data?.data?.summaries || summariesRes.data?.summaries || [];
      
      // Map job status to summary status for display - using same logic as History.js
      const summariesWithStatus = summariesData.map(summary => {
        // Simple logic: use job status if available, otherwise assume completed
        const status = summary.job?.status || 'completed';
        const progress = summary.job?.progress || 100;
        
        // Generate preview text
        let preview = '';
        if (status === 'completed') {
          if (summary.summaryContent && summary.summaryContent.trim()) {
            preview = summary.summaryContent.substring(0, 150) + 
                     (summary.summaryContent.length > 150 ? '...' : '');
          } else if (summary.metadata?.results?.summary?.content) {
            // For YouTube summaries with results in metadata
            preview = summary.metadata.results.summary.content.substring(0, 150) + '...';
          } else {
            preview = 'Summary completed';
          }
        } else if (status === 'failed') {
          preview = summary.job?.error || 'Processing failed';
        } else {
          preview = 'Processing...';
        }
        
        // Ensure sourceType is set (default to youtube for YouTube URLs)
        const sourceType = summary.sourceType || 
                          (summary.sourceUrl?.includes('youtube.com') || summary.sourceUrl?.includes('youtu.be') ? 'youtube' : 'text');
        
        // Ensure provider is set
        const provider = summary.provider || 'gemini';
        
        return {
          ...summary,
          status,
          progress,
          preview,
          sourceType,
          provider
        };
      });
      
      setRecentSummaries(summariesWithStatus);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // WebSocket 이벤트 리스너
  useEffect(() => {
    if (!socket || !jobId) return;

    const handleProgress = (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress || 0);
      }
    };

    const handleComplete = (data) => {
      if (data.jobId === jobId) {
        setProcessing(false);
        setProgress(100);
        
        const formattedResults = data.result?.summaries || [
          { title: systemPrompts[0], content: data.result?.summary || data.result },
          { title: systemPrompts[1], content: '처리 중...' },
          { title: systemPrompts[2], content: '처리 중...' },
          { title: systemPrompts[3], content: '처리 중...' },
          { title: systemPrompts[4], content: '처리 중...' },
          { title: systemPrompts[5], content: '처리 중...' },
        ];
        
        setResults(formattedResults);
        toast.success('처리가 완료되었습니다!');
        fetchDashboardData(); // Reload data
      }
    };

    const handleError = (data) => {
      if (data.jobId === jobId) {
        setProcessing(false);
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
  }, [socket, jobId]);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleViewSummary = (summaryId) => {
    navigate(`/summaries/${summaryId}`);
  };
  
  const handleYouTubeSubmit = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      setError('YouTube URL을 입력해주세요');
      return;
    }

    setError('');
    setProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const response = await summaryService.processUrl(youtubeUrl, 'gemini');
      
      if (response.jobId) {
        setJobId(response.jobId);
        toast.success('처리를 시작했습니다...');
      } else if (response.summary) {
        handleImmediateResult(response);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || '처리 중 오류가 발생했습니다');
      setProcessing(false);
    }
  };

  const handleWebSubmit = async (e) => {
    e.preventDefault();
    if (!webUrl.trim()) {
      setError('웹페이지 URL을 입력해주세요');
      return;
    }

    setError('');
    setProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const response = await summaryService.processUrl(webUrl, 'gemini');
      
      if (response.jobId) {
        setJobId(response.jobId);
        toast.success('웹페이지 분석을 시작했습니다...');
      } else if (response.summary) {
        handleImmediateResult(response);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || '처리 중 오류가 발생했습니다');
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('파일 크기는 50MB를 초과할 수 없습니다');
      return;
    }

    setSelectedFile(file);
    setError('');
    setProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const response = await summaryService.uploadFile(
        file,
        'gemini',
        (progressPercent) => {
          setProgress(progressPercent);
        }
      );
      
      if (response.jobId) {
        setJobId(response.jobId);
        toast.success('파일 처리를 시작했습니다...');
      } else if (response.summary) {
        handleImmediateResult(response);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || '파일 업로드 중 오류가 발생했습니다');
      setProcessing(false);
    }
  };

  const handleImmediateResult = (response) => {
    const formattedResults = response.summaries || [
      { title: systemPrompts[0], content: response.summary },
      { title: systemPrompts[1], content: '처리 중...' },
      { title: systemPrompts[2], content: '처리 중...' },
      { title: systemPrompts[3], content: '처리 중...' },
      { title: systemPrompts[4], content: '처리 중...' },
      { title: systemPrompts[5], content: '처리 중...' },
    ];
    setResults(formattedResults);
    setProcessing(false);
    fetchDashboardData();
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopied({ ...copied, [index]: true });
    toast.success('클립보드에 복사되었습니다');
    
    setTimeout(() => {
      setCopied({ ...copied, [index]: false });
    }, 2000);
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          안녕하세요, {user?.name || user?.phone}님! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          오늘은 어떤 콘텐츠를 요약해드릴까요?
        </Typography>
      </Box>

      {/* API Usage Widget removed - not needed */}

      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="전체 요약"
            value={stats.totalSummaries}
            icon={<Description color="primary" />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="이번 주"
            value={stats.thisWeek}
            icon={<TrendingUp color="success" />}
            color="success"
            trend={12}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="평균 처리시간"
            value={`${stats.processingTime}초`}
            icon={<Speed color="info" />}
            color="info"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="성공률"
            value={`${stats.successRate}%`}
            icon={<CheckCircle color="success" />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Input Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          콘텐츠 입력
        </Typography>
        
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab icon={<YouTubeIcon />} label="YouTube" />
          <Tab icon={<WebIcon />} label="웹페이지" />
          <Tab icon={<CloudUpload />} label="파일 업로드" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {processing && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              처리 중... {progress}%
            </Typography>
          </Box>
        )}

        <TabPanel value={activeTab} index={0}>
          <form onSubmit={handleYouTubeSubmit}>
            <TextField
              fullWidth
              label="YouTube URL"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={processing}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <YouTubeIcon color="error" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={processing || !youtubeUrl.trim()}
              startIcon={processing ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {processing ? '처리 중...' : 'YouTube 영상 요약하기'}
            </Button>
          </form>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <form onSubmit={handleWebSubmit}>
            <TextField
              fullWidth
              label="웹페이지 URL"
              placeholder="https://example.com/article"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              disabled={processing}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WebIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={processing || !webUrl.trim()}
              startIcon={processing ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {processing ? '처리 중...' : '웹페이지 요약하기'}
            </Button>
          </form>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            component="label"
          >
            <input
              type="file"
              hidden
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt,.mp3,.mp4,.wav"
              disabled={processing}
            />
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              파일을 선택하거나 드래그하세요
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PDF, DOCX, TXT, MP3, MP4, WAV (최대 50MB)
            </Typography>
            {selectedFile && (
              <Chip
                label={selectedFile.name}
                onDelete={() => setSelectedFile(null)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Results Section */}
      {results && (
        <Paper sx={{ mb: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            요약 결과
          </Typography>
          
          <Tabs
            value={currentResultTab}
            onChange={(e, v) => setCurrentResultTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {results.map((result, index) => (
              <Tab key={index} label={result.title || systemPrompts[index]} />
            ))}
          </Tabs>

          {results.map((result, index) => (
            <TabPanel key={index} value={currentResultTab} index={index}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" color="primary">
                  {result.title || systemPrompts[index]}
                </Typography>
                <Tooltip title="복사">
                  <IconButton
                    onClick={() => handleCopy(result.content, index)}
                    size="small"
                  >
                    {copied[index] ? <CheckCircle color="success" /> : <CopyIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.8,
                }}
              >
                {result.content}
              </Typography>
            </TabPanel>
          ))}
        </Paper>
      )}

      {/* Recent Summaries */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            최근 요약
          </Typography>
          <Tooltip title="새로고침">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
        
        {recentSummaries.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              아직 요약이 없습니다. YouTube 링크를 입력하여 시작하세요!
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<Psychology />}
              onClick={() => navigate('/')}
            >
              YouTube 요약 시작
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {recentSummaries.map((summary) => (
              <Grid item xs={12} md={6} lg={4} key={summary.id}>
                <RecentSummaryCard
                  summary={summary}
                  onView={handleViewSummary}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;