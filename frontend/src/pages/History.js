import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  FileDownload as FileIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  YouTube as YouTubeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useWebSocket } from '../contexts/WebSocketContext';

const History = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterSourceType, setFilterSourceType] = useState('');
  
  const navigate = useNavigate();
  const { socket } = useWebSocket();

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: page + 1,
        limit: rowsPerPage
      };
      
      if (filterStatus) params.status = filterStatus;
      if (filterProvider) params.provider = filterProvider;
      if (filterSourceType) params.sourceType = filterSourceType;
      
      const response = await api.get('/summaries', { params });
      
      // Process summaries to include job status
      const summariesWithStatus = (response.data.data?.summaries || response.data.summaries || []).map(summary => ({
        ...summary,
        status: summary.job?.status || 'completed',
        progress: summary.job?.progress || 100
      }));
      
      setSummaries(summariesWithStatus);
      setTotalItems(response.data.data?.totalCount || response.data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch summaries:', error);
      toast.error('Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [page, rowsPerPage, filterStatus, filterProvider, filterSourceType]);
  
  // Listen for job updates via WebSocket
  useEffect(() => {
    if (socket) {
      const handleJobProgress = (data) => {
        setSummaries(prev => prev.map(summary => 
          summary.jobId === data.jobId 
            ? { ...summary, status: 'processing', progress: data.progress }
            : summary
        ));
      };
      
      const handleJobComplete = (data) => {
        // Refresh the list when a job completes
        fetchSummaries();
      };
      
      const handleJobError = (data) => {
        setSummaries(prev => prev.map(summary => 
          summary.jobId === data.jobId 
            ? { ...summary, status: 'failed' }
            : summary
        ));
      };
      
      socket.on('job:progress', handleJobProgress);
      socket.on('job:complete', handleJobComplete);
      socket.on('job:error', handleJobError);
      
      return () => {
        socket.off('job:progress', handleJobProgress);
        socket.off('job:complete', handleJobComplete);
        socket.off('job:error', handleJobError);
      };
    }
  }, [socket]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewSummary = (summaryId) => {
    navigate(`/summaries/${summaryId}`);
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!window.confirm('Are you sure you want to delete this summary?')) {
      return;
    }

    try {
      await api.delete(`/summaries/${summaryId}`);
      toast.success('Summary deleted successfully');
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to delete summary');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSourceIcon = (sourceType) => {
    if (sourceType === 'youtube') return <YouTubeIcon fontSize="small" color="error" />;
    if (sourceType === 'file') return <FileIcon fontSize="small" />;
    return <LinkIcon fontSize="small" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            YouTube 요약 히스토리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            YouTube 동영상 요약 기록을 확인하고 관리하세요
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          startIcon={<YouTubeIcon />}
          onClick={() => navigate('/')}
        >
          새 YouTube 요약
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={filterProvider}
              label="Provider"
              onChange={(e) => setFilterProvider(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="gemini">Gemini</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={filterSourceType}
              label="Source"
              onChange={(e) => setFilterSourceType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="youtube">YouTube</MenuItem>
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="url">URL</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={fetchSummaries}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : summaries.length > 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Words</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaries.map((summary) => (
                    <TableRow
                      key={summary.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewSummary(summary.id)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSourceIcon(summary.sourceType)}
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {summary.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {summary.sourceType === 'file' ? summary.fileName : 'URL'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={summary.aiProvider}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        {summary.status === 'processing' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption">
                              {summary.progress}%
                            </Typography>
                          </Box>
                        ) : (
                          <Chip
                            label={summary.status}
                            size="small"
                            color={getStatusColor(summary.status)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.wordCount || '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {format(new Date(summary.createdAt), 'MMM d, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSummary(summary.id);
                              }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement download
                                toast.info('Download feature coming soon!');
                              }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSummary(summary.id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalItems}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              요약 기록이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {filterStatus || filterProvider || filterSourceType
                ? '필터를 조정해보세요'
                : 'YouTube 링크를 입력하여 첫 요약을 시작하세요'}
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<YouTubeIcon />}
              onClick={() => navigate('/')}
              sx={{ mt: 2 }}
            >
              YouTube 요약 시작
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default History;