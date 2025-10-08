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
  Grid,
} from '@mui/material';
import { authApi, RegisterData } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import type { ApiResponse, AuthResponse } from '../../types';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState<RegisterData>({
    organization_name: '',
    organization_code: '',
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: ApiResponse<AuthResponse>) => {
      setAuth(data.data.user, data.data.token);
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const handleChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <LanguageSelector />
          </Box>
          <Typography variant="h4" align="center" gutterBottom>
            {t('auth.createAccount')}
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('employees.department')}
                  value={formData.organization_name}
                  onChange={handleChange('organization_name')}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization Code"
                  value={formData.organization_code}
                  onChange={handleChange('organization_code')}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('employees.firstName')}
                  value={formData.first_name}
                  onChange={handleChange('first_name')}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('employees.lastName')}
                  value={formData.last_name}
                  onChange={handleChange('last_name')}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={handleChange('username')}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('auth.email')}
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('auth.password')}
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('employees.phone')}
                  value={formData.phone_number}
                  onChange={handleChange('phone_number')}
                />
              </Grid>
            </Grid>

            {registerMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : t('auth.registerError')}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? t('common.loading') : t('auth.register')}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  {t('auth.login')}
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};
