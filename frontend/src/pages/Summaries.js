import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Toolbar,
  Tooltip,
  Button,
  Menu,
  Checkbox,
  ListItemText,
  OutlinedInput
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  Download,
  Delete,
  Share,
  MoreVert,
  Refresh,
  Psychology,
  Description
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const Summaries = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    sourceType: [],
    provider: [],
    status: []
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  
  const navigate = useNavigate();

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder
      });

      if (searchQuery) params.append('search', searchQuery);
      if (filters.sourceType.length) params.append('sourceType', filters.sourceType.join(','));
      if (filters.provider.length) params.append('provider', filters.provider.join(','));
      if (filters.status.length) params.append('status', filters.status.join(','));

      const response = await api.get(`/api/summaries/history?${params}`);
      setSummaries(response.data.summaries || response.data);
      setTotalCount(response.data.total || response.data.length || 0);
    } catch (error) {
      toast.error('Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [page, rowsPerPage, searchQuery, filters, sortBy, sortOrder]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPage(0);
  };

  const handleMenuOpen = (event, summary) => {
    setAnchorEl(event.currentTarget);
    setSelectedSummary(summary);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSummary(null);
  };

  const handleDelete = async () => {
    if (!selectedSummary) return;
    
    try {
      await api.delete(`/api/summaries/${selectedSummary.id}`);
      toast.success('Summary deleted successfully');
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to delete summary');
    }
    handleMenuClose();
  };

  const handleShare = async () => {
    if (!selectedSummary) return;
    
    try {
      const response = await api.post(`/api/summaries/${selectedSummary.id}/share`);
      const shareUrl = `${window.location.origin}/share/${response.data.data.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to generate share link');
    }
    handleMenuClose();
  };

  const handleDownload = async (summaryId) => {
    try {
      const response = await api.get(`/api/summaries/${summaryId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `summary-${summaryId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download summary');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'openai': return '🤖';
      case 'gemini': return '✨';
      default: return '📄';
    }
  };

  if (loading && summaries.length === 0) {
    return <Loading message="Loading summaries..." />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          My Summaries
        </Typography>
        <Button
          variant="contained"
          startIcon={<Description />}
          onClick={() => navigate('/upload')}
        >
          New Summary
        </Button>
      </Box>

      <Paper>
        <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
          <TextField
            variant="outlined"
            placeholder="Search summaries..."
            size="small"
            sx={{ flexGrow: 1, mr: 2 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel>Source Type</InputLabel>
            <Select
              multiple
              value={filters.sourceType}
              onChange={(e) => handleFilterChange('sourceType', e.target.value)}
              input={<OutlinedInput label="Source Type" />}
              renderValue={(selected) => selected.join(', ')}
              MenuProps={MenuProps}
            >
              {['file', 'url', 'text'].map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={filters.sourceType.indexOf(type) > -1} />
                  <ListItemText primary={type.charAt(0).toUpperCase() + type.slice(1)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              multiple
              value={filters.provider}
              onChange={(e) => handleFilterChange('provider', e.target.value)}
              input={<OutlinedInput label="Provider" />}
              renderValue={(selected) => selected.join(', ')}
              MenuProps={MenuProps}
            >
              {['openai', 'gemini'].map((provider) => (
                <MenuItem key={provider} value={provider}>
                  <Checkbox checked={filters.provider.indexOf(provider) > -1} />
                  <ListItemText primary={provider === 'openai' ? 'OpenAI' : 'Gemini'} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={fetchSummaries}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Toolbar>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow
                  key={summary.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/summaries/${summary.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {summary.title}
                    </Typography>
                    {summary.keyPoints && summary.keyPoints.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {summary.keyPoints.length} key points
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={summary.sourceType}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography>{getProviderIcon(summary.provider)}</Typography>
                      <Typography variant="body2">
                        {summary.provider === 'openai' ? 'OpenAI' : 'Gemini'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={summary.status}
                      color={getStatusColor(summary.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(summary.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/summaries/${summary.id}`);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(summary.id);
                          }}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, summary);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleShare}>
          <Share fontSize="small" sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Summaries;