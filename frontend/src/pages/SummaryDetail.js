import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Share,
  Edit,
  Delete,
  CheckCircle,
  Timer,
  FilePresent,
  Link as LinkIcon,
  TextFields,
  Star,
  ContentCopy,
  Feedback,
  ExpandMore,
  YouTube as YouTubeIcon,
  Subtitles,
  Psychology
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../services/api';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const SummaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [transcript, setTranscript] = useState(null);
  const [promptResults, setPromptResults] = useState([]);

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/summaries/${id}`);
      const summaryData = response.data.data || response.data;
      setSummary(summaryData);
      setRating(summaryData?.rating || 0);
      
      // Extract transcript and prompt results from metadata
      if (summaryData.metadata) {
        // For YouTube videos, transcript is in originalContent
        if (summaryData.sourceType === 'youtube' && summaryData.originalContent) {
          setTranscript(summaryData.originalContent);
        }
        
        // Prompt results are stored in metadata.results
        if (summaryData.metadata.results) {
          // Convert results object to array format for display
          const resultsArray = Object.entries(summaryData.metadata.results).map(([key, value]) => ({
            category: key,
            name: value.name,
            content: value.content
          }));
          setPromptResults(resultsArray);
        }
      }
    } catch (error) {
      toast.error('Failed to load summary');
      navigate('/summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/summaries/${id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${summary.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Summary downloaded successfully');
    } catch (error) {
      toast.error('Failed to download summary');
    }
  };

  const handleShare = async () => {
    try {
      const response = await api.post(`/summaries/${id}/share`);
      const url = `${window.location.origin}/share/${response.data.data.shareToken}`;
      setShareUrl(url);
      setShareDialogOpen(true);
    } catch (error) {
      toast.error('Failed to generate share link');
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/summaries/${id}`);
      toast.success('Summary deleted successfully');
      navigate('/summaries');
    } catch (error) {
      toast.error('Failed to delete summary');
    }
  };

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    try {
      await api.put(`/summaries/${id}/rating`, { rating: newRating });
      toast.success('Rating saved');
    } catch (error) {
      toast.error('Failed to save rating');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;
    
    try {
      await api.post(`/summaries/${id}/feedback`, { feedback });
      toast.success('Feedback submitted. Thank you!');
      setFeedback('');
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const getSourceIcon = () => {
    switch (summary?.sourceType) {
      case 'file': return <FilePresent />;
      case 'url': return <LinkIcon />;
      case 'text': return <TextFields />;
      default: return <FilePresent />;
    }
  };

  if (loading) {
    return <Loading message="Loading summary..." />;
  }

  if (!summary) {
    return (
      <Box>
        <Alert severity="error">Summary not found</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/summaries')}
          sx={{ mt: 2 }}
        >
          Back to Summaries
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/summaries')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">
            {summary.title}
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Download">
            <IconButton onClick={handleDownload}>
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton onClick={handleShare}>
              <Share />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton onClick={() => setDeleteDialogOpen(true)}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Tabs for multiple prompt results */}
            {promptResults.length > 0 ? (
              <>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                >
                  {promptResults.map((result, index) => (
                    <Tab
                      key={index}
                      label={result.name || `Summary ${index + 1}`}
                      icon={<Psychology />}
                    />
                  ))}
                </Tabs>
                
                {promptResults.map((result, index) => (
                  <Box
                    key={index}
                    hidden={activeTab !== index}
                    sx={{ py: 2 }}
                  >
                    <Typography variant="h6" gutterBottom>
                      {result.name || 'Summary'}
                    </Typography>
                    <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                      {result.content || summary.summaryContent}
                    </Typography>
                    
                    {result.keyPoints && result.keyPoints.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" gutterBottom>
                          Key Points
                        </Typography>
                        <List dense>
                          {result.keyPoints.map((point, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon>
                                <CheckCircle color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={point} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Box>
                ))}
              </>
            ) : (
              /* Single summary view */
              <>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {summary.summaryContent}
                </Typography>

                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" gutterBottom>
                      Key Points
                    </Typography>
                    <List>
                      {summary.keyPoints.map((point, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={point} />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </>
            )}
            
            {/* YouTube Transcript Section */}
            {transcript && (
              <>
                <Divider sx={{ my: 3 }} />
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls="transcript-content"
                    id="transcript-header"
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Subtitles color="error" />
                      <Typography variant="h6">YouTube Transcript</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1
                        }}
                      >
                        {transcript}
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Rating & Feedback */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Rate this summary
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Rating
                  value={rating}
                  onChange={(event, newValue) => handleRatingChange(newValue)}
                  size="large"
                />
                <Typography variant="body2" color="text.secondary">
                  {rating > 0 ? `${rating} out of 5` : 'Not rated yet'}
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Share your feedback about this summary..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                variant="outlined"
                startIcon={<Feedback />}
                onClick={handleFeedbackSubmit}
                disabled={!feedback.trim()}
              >
                Submit Feedback
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Source Type
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getSourceIcon()}
                    <Typography variant="body1">
                      {summary.sourceType.charAt(0).toUpperCase() + summary.sourceType.slice(1)}
                    </Typography>
                  </Box>
                </Box>

                {summary.sourceUrl && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Source URL
                    </Typography>
                    <Typography
                      variant="body2"
                      component="a"
                      href={summary.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'primary.main', textDecoration: 'none' }}
                    >
                      {summary.sourceUrl}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    AI Provider
                  </Typography>
                  <Chip
                    label={summary.provider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Processing Time
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Timer fontSize="small" />
                    <Typography variant="body1">
                      {(summary.processingTime / 1000).toFixed(1)}s
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(summary.createdAt), 'PPpp')}
                  </Typography>
                </Box>

                {summary.metadata && (
                  <>
                    <Divider />
                    <Typography variant="subtitle2" gutterBottom>
                      Statistics
                    </Typography>
                    
                    {summary.metadata.wordCount && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Original Words:
                        </Typography>
                        <Typography variant="body2">
                          {summary.metadata.wordCount.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    
                    {summary.metadata.summaryWordCount && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Summary Words:
                        </Typography>
                        <Typography variant="body2">
                          {summary.metadata.summaryWordCount.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    
                    {summary.metadata.compressionRatio && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Compression:
                        </Typography>
                        <Typography variant="body2">
                          {Math.round(summary.metadata.compressionRatio * 100)}%
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Summary</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Anyone with this link can view the summary:
          </Typography>
          <TextField
            fullWidth
            value={shareUrl}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopyShareLink}>
                  <ContentCopy />
                </IconButton>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Summary</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this summary? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SummaryDetail;