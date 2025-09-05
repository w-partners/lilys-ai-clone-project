import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Key as KeyIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      geminiApiKey: '',
      openaiApiKey: '',
      agreeToTerms: false
    }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authRegister({
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: data.password,
        geminiApiKey: data.geminiApiKey,
        openaiApiKey: data.openaiApiKey
      });
      toast.success('회원가입이 완료되었습니다! Lilys AI에 오신 것을 환영합니다!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('phone number already exists')) {
        setError('phone', {
          message: '이미 등록된 전화번호입니다'
        });
      } else if (error.message.includes('email already exists')) {
        setError('email', {
          message: '이미 등록된 이메일입니다'
        });
      } else {
        setError('root', {
          message: '회원가입에 실패했습니다. 다시 시도해주세요.'
        });
      }
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
          justifyContent: 'center',
          py: 3
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              회원가입
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lilys AI에 가입하고 콘텐츠 요약을 시작하세요
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
              id="name"
              label="이름"
              autoComplete="name"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                )
              }}
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name', {
                required: '이름을 입력해주세요',
                minLength: {
                  value: 2,
                  message: '이름은 최소 2자 이상이어야 합니다'
                }
              })}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="전화번호"
              autoComplete="tel"
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
              fullWidth
              id="email"
              label="이메일 주소 (선택사항)"
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                )
              }}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '올바른 이메일 주소가 아닙니다'
                }
              })}
            />

            <TextField
              margin="normal"
              fullWidth
              id="geminiApiKey"
              label="Gemini API 키 (선택사항)"
              autoComplete="off"
              placeholder="AIzaSy..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon color="action" />
                  </InputAdornment>
                )
              }}
              error={!!errors.geminiApiKey}
              helperText={errors.geminiApiKey?.message || 'Gemini API 키를 입력하면 더 빠른 처리가 가능합니다'}
              {...register('geminiApiKey')}
            />

            <TextField
              margin="normal"
              fullWidth
              id="openaiApiKey"
              label="OpenAI API 키 (선택사항)"
              autoComplete="off"
              placeholder="sk-..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon color="action" />
                  </InputAdornment>
                )
              }}
              error={!!errors.openaiApiKey}
              helperText={errors.openaiApiKey?.message || 'OpenAI API 키를 입력하면 GPT 모델을 사용할 수 있습니다'}
              {...register('openaiApiKey')}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="비밀번호"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
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
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                  message: '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다'
                }
              })}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="비밀번호 확인"
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: '비밀번호를 다시 입력해주세요',
                validate: value => value === password || '비밀번호가 일치하지 않습니다'
              })}
            />

            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  {...register('agreeToTerms', {
                    required: '이용약관에 동의해주세요'
                  })}
                />
              }
              label={
                <Typography variant="body2">
                  {' '}
                  <Link href="/terms" target="_blank">
                    이용약관
                  </Link>
                  에 동의합니다
                </Typography>
              }
              sx={{ mt: 1 }}
            />
            {errors.agreeToTerms && (
              <Typography variant="caption" color="error" display="block">
                {errors.agreeToTerms.message}
              </Typography>
            )}

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
                '회원가입'
              )}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                이미 계정이 있으신가요?{' '}
                <Link component={RouterLink} to="/login" variant="body2">
                  로그인
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;