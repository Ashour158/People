import React, { Suspense, lazy, ComponentType } from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

interface LazyRouteProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  minHeight?: number;
}

const DefaultFallback: React.FC<{ minHeight?: number }> = ({ minHeight = 400 }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight,
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

const SkeletonFallback: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Skeleton variant="rectangular" width="30%" height={100} />
      <Skeleton variant="rectangular" width="30%" height={100} />
      <Skeleton variant="rectangular" width="30%" height={100} />
    </Box>
  </Box>
);

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component,
  fallback,
  minHeight,
}) => {
  const LazyComponent = lazy(component);

  return (
    <Suspense fallback={fallback || <DefaultFallback minHeight={minHeight} />}>
      <LazyComponent />
    </Suspense>
  );
};

// Pre-configured lazy components for common routes
export const LazyAnalytics = lazy(() => import('../../pages/analytics/AnalyticsDashboard'));
export const LazyReports = lazy(() => import('../../pages/reports/ReportBuilder'));
export const LazyIntegrations = lazy(() => import('../../pages/integrations/IntegrationsPage'));
export const LazyWorkflows = lazy(() => import('../../pages/workflows/WorkflowDesigner'));
export const LazyCompliance = lazy(() => import('../../pages/compliance/ComplianceDashboard'));

// Lazy route components with custom fallbacks
export const LazyAnalyticsRoute: React.FC = () => (
  <LazyRoute
    component={() => import('../../pages/analytics/AnalyticsDashboard')}
    fallback={<SkeletonFallback />}
  />
);

export const LazyReportsRoute: React.FC = () => (
  <LazyRoute
    component={() => import('../../pages/reports/ReportBuilder')}
    fallback={<SkeletonFallback />}
  />
);

export const LazyIntegrationsRoute: React.FC = () => (
  <LazyRoute
    component={() => import('../../pages/integrations/IntegrationsPage')}
    fallback={<SkeletonFallback />}
  />
);

// Performance monitoring for lazy loading
export const useLazyLoadingPerformance = () => {
  const [loadingTimes, setLoadingTimes] = React.useState<Record<string, number>>({});
  
  const trackLoadingTime = useCallback((componentName: string, startTime: number) => {
    const endTime = performance.now();
    const loadingTime = endTime - startTime;
    
    setLoadingTimes(prev => ({
      ...prev,
      [componentName]: loadingTime,
    }));
    
    // Log performance metrics
    console.log(`Lazy loading ${componentName}: ${loadingTime.toFixed(2)}ms`);
  }, []);
  
  return { loadingTimes, trackLoadingTime };
};
