import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Phone as PhoneIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm({
    defaultValues: {
      phone: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data.phone, data.password);
      if (result.success) {
        toast.success('환영합니다!');
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 100);
      } else {
        // Handle login failure
        if (result.error && result.error.includes('Invalid')) {
          setError('root', {
            message: '전화번호 또는 비밀번호가 올바르지 않습니다'
          });
        } else if (result.error && result.error.includes('deactivated')) {
          setError('root', {
            message: '계정이 비활성화되었습니다'
          });
        } else {
          setError('root', {
            message: result.error || '로그인에 실패했습니다. 다시 시도해주세요.'
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('root', {
        message: '예기치 않은 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              로그인
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lilys AI 계정으로 로그인하세요
            </Typography>
          </Box>

          {errors.root && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.root.message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="전화번호"
              autoComplete="tel"
              autoFocus
              placeholder="01012345678"
              type="tel"
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" />
                  </InputAdornment>
                )
              }}
              error={!!errors.phone}
              helperText={errors.phone?.message}
              {...register('phone', {
                required: '전화번호를 입력해주세요',
                pattern: {
                  value: /^01[0-9]{8,9}$/,
                  message: '올바른 전화번호 형식이 아닙니다 (예: 01012345678)'
                }
              })}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="비밀번호"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password', {
                required: '비밀번호를 입력해주세요',
                minLength: {
                  value: 6,
                  message: '비밀번호는 최소 6자 이상이어야 합니다'
                }
              })}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '로그인'
              )}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{ display: 'block', mb: 1 }}
              >
                비밀번호를 잊으셨나요?
              </Link>
              <Typography variant="body2" color="text.secondary">
                계정이 없으신가요?{' '}
                <Link component={RouterLink} to="/register" variant="body2">
                  회원가입
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;