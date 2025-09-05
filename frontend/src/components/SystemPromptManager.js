import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';

const SystemPromptManager = () => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Typography variant="h6">시스템 프롬프트 관리</Typography>
        </Box>
        <Typography>시스템 프롬프트 컴포넌트가 성공적으로 렌더링되었습니다!</Typography>
      </CardContent>
    </Card>
  );
};

export default SystemPromptManager;