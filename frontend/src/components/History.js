import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Link
} from '@mui/material';
import {
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

const History = ({ isLoggedIn, user }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory();
    }
  }, [isLoggedIn]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHistory(response.data.data.jobs);
      }
    } catch (error) {
      setError(error.response?.data?.error || '히스토리를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
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
    return date.toLocaleString('ko-KR');
  };

  const handleViewDetail = async (item) => {
    if (item.status !== 'completed') {
      setSelectedItem(item);
      setDetailOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/process/result/${item.jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSelectedItem({
          ...item,
          summaries: response.data.data.summaries
        });
        setSelectedTab(0);
        setDetailOpen(true);
      }
    } catch (error) {
      setError('결과를 불러오는데 실패했습니다.');
    }
  };

  const getYouTubeVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  if (!isLoggedIn) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" gutterBottom>
          히스토리를 보려면 로그인이 필요합니다
        </Typography>
        <Typography variant="body1" color="text.secondary">
          사이드메뉴에서 로그인해주세요.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={fetchHistory} startIcon={<RefreshIcon />}>
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          처리 히스토리
        </Typography>
        <IconButton onClick={fetchHistory}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {history.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" gutterBottom>
            처리 히스토리가 없습니다
          </Typography>
          <Typography variant="body1" color="text.secondary">
            홈에서 YouTube 영상을 분석해보세요.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {history.map((item, index) => {
            const statusInfo = getStatusInfo(item.status);
            const videoId = getYouTubeVideoId(item.sourceUrl);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={item.jobId || index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        icon={statusInfo.icon}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </Box>

                    {videoId && (
                      <Box sx={{ mb: 2, textAlign: 'center' }}>
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt="YouTube Thumbnail"
                          style={{ 
                            width: '100%', 
                            height: '120px', 
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                        />
                      </Box>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <Link 
                        href={item.sourceUrl} 
                        target="_blank" 
                        rel="noopener"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          textDecoration: 'none'
                        }}
                      >
                        YouTube 영상 보기
                        <LaunchIcon fontSize="small" />
                      </Link>
                    </Typography>

                    {item.status === 'completed' && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        요약 결과: {item.summaryCount || 6}개
                      </Typography>
                    )}

                    {item.status === 'failed' && item.errorMessage && (
                      <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                        오류: {item.errorMessage}
                      </Typography>
                    )}

                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handleViewDetail(item)}
                      disabled={item.status === 'pending'}
                    >
                      {item.status === 'completed' ? '결과 보기' : '상세 보기'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 상세보기 다이얼로그 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>
              처리 결과
              <Typography variant="body2" color="text.secondary">
                {formatDate(selectedItem.createdAt)}
              </Typography>
            </DialogTitle>
            <DialogContent>
              {selectedItem.summaries ? (
                <>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs 
                      value={selectedTab} 
                      onChange={(e, newValue) => setSelectedTab(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      {selectedItem.summaries.map((summary, index) => (
                        <Tab
                          key={index}
                          label={summary.systemPrompt?.name || `결과 ${index + 1}`}
                        />
                      ))}
                    </Tabs>
                  </Box>

                  {selectedItem.summaries.map((summary, index) => (
                    <Box
                      key={index}
                      hidden={selectedTab !== index}
                    >
                      <Typography
                        variant="body1"
                        component="pre"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.8,
                          fontFamily: 'inherit',
                          maxHeight: 400,
                          overflow: 'auto'
                        }}
                      >
                        {summary.content}
                      </Typography>
                      
                      {summary.tokensUsed && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary">
                            사용된 토큰: {summary.tokensUsed.toLocaleString()}개 | 
                            처리 시간: {summary.processingTime}초 |
                            AI 제공자: {summary.aiProvider}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Chip
                    label={getStatusInfo(selectedItem.status).label}
                    color={getStatusInfo(selectedItem.status).color}
                    icon={getStatusInfo(selectedItem.status).icon}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body1">
                    {selectedItem.status === 'processing' && '현재 처리중입니다...'}
                    {selectedItem.status === 'failed' && `처리 중 오류가 발생했습니다: ${selectedItem.errorMessage}`}
                    {selectedItem.status === 'pending' && '처리 대기 중입니다...'}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>
                닫기
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default History;