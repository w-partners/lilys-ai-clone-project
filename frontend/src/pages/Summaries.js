import React from 'react';
import {
  Container,
  Typography,
  Alert
} from '@mui/material';

const Summaries = ({ isLoggedIn, user }) => {
  if (!isLoggedIn || user?.role !== 'admin') {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">관리자만 접근 가능합니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        요약 관리
      </Typography>
      <Typography variant="body1" color="text.secondary">
        요약 관리 기능은 개발 중입니다.
      </Typography>
    </Container>
  );
};

export default Summaries;