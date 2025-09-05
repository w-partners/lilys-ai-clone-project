import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../services/api';

const ApiUsageWidget = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/usage/summary');
      setUsage(response.data.summary);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch API usage:', err);
      setError('사용량 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchUsage();
  };

  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const geminiUsage = usage?.services?.gemini || {};
  const openaiUsage = usage?.services?.openai || {};
  const geminiPercent = geminiUsage.percentOfDailyLimit || 0;
  const showWarning = geminiPercent > 80;

  return (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <SpeedIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">API 사용량</Typography>
          </Box>
          <Box>
            <Tooltip title="새로고침">
              <IconButton 
                size="small" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Gemini Usage Summary */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="textSecondary">
              Gemini API (무료)
            </Typography>
            {showWarning && (
              <Tooltip title="일일 한도에 근접했습니다">
                <WarningIcon color="warning" fontSize="small" />
              </Tooltip>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box flex={1}>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, geminiPercent)}
                color={geminiPercent > 90 ? 'error' : geminiPercent > 70 ? 'warning' : 'primary'}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
            <Typography variant="body2" sx={{ minWidth: 50 }}>
              {geminiPercent.toFixed(1)}%
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
            오늘 {geminiUsage.requests || 0} / 1,500 요청
          </Typography>
        </Box>

        <Collapse in={expanded}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Gemini Detailed */}
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Gemini (무료 요금제)
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    일일 요청: {geminiUsage.requests || 0} / 1,500
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    토큰 사용: {(geminiUsage.tokens || 0).toLocaleString()}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    분당 제한: 60 요청
                  </Typography>
                </Box>
                {geminiPercent > 80 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    일일 한도의 {geminiPercent.toFixed(0)}% 사용
                  </Alert>
                )}
              </Box>
            </Grid>

            {/* OpenAI Detailed */}
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  OpenAI (유료)
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    오늘 요청: {openaiUsage.requests || 0}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    토큰 사용: {(openaiUsage.tokens || 0).toLocaleString()}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    예상 비용: ${openaiUsage.estimatedCost || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Total Summary */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  전체 사용량
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      총 요청 수
                    </Typography>
                    <Typography variant="h6">
                      {usage?.totalRequestsToday || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      총 토큰 사용
                    </Typography>
                    <Typography variant="h6">
                      {(usage?.totalTokensToday || 0).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Collapse>

        {/* Usage Tips */}
        {geminiPercent > 90 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Gemini API 일일 한도에 도달했습니다. OpenAI API를 사용하거나 내일 다시 시도하세요.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiUsageWidget;