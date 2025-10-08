import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { authApi, LoginCredentials } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import type { ApiResponse, AuthResponse } from '../../types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: ApiResponse<AuthResponse>) => {
      setAuth(data.data.user, data.data.token);
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <LanguageSelector />
          </Box>
          <Typography variant="h4" align="center" gutterBottom>
            {t('common.appName')}
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
            {t('auth.login')}
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('auth.email')}
              type="email"
              margin="normal"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label={t('auth.password')}
              type="password"
              margin="normal"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />

            {loginMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : t('auth.loginError')}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? t('common.loading') : t('auth.login')}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                {t('auth.dontHaveAccount')}{' '}
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  {t('auth.register')}
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};
