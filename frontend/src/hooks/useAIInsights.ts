import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService, AIInsight, AIPrediction } from '../services/ai/aiService';

interface UseAIInsightsOptions {
  employeeId?: string;
  organizationId?: string;
  enableRealTime?: boolean;
  refreshInterval?: number;
}

export const useAIInsights = (options: UseAIInsightsOptions = {}) => {
  const { employeeId, organizationId, enableRealTime = false, refreshInterval = 300000 } = options;
  const queryClient = useQueryClient();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);

  // Employee insights query
  const { data: employeeInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights', employeeId],
    queryFn: () => aiService.getEmployeeInsights(employeeId!),
    enabled: !!employeeId,
    refetchInterval: enableRealTime ? refreshInterval : false,
  });

  // Attrition risk prediction
  const { data: attritionRisk, isLoading: attritionLoading } = useQuery({
    queryKey: ['ai-attrition-risk', employeeId],
    queryFn: () => aiService.predictAttritionRisk(employeeId!),
    enabled: !!employeeId,
    refetchInterval: enableRealTime ? refreshInterval : false,
  });

  // Performance prediction
  const { data: performancePrediction, isLoading: performanceLoading } = useQuery({
    queryKey: ['ai-performance-prediction', employeeId],
    queryFn: () => aiService.predictPerformance(employeeId!, 'quarter'),
    enabled: !!employeeId,
    refetchInterval: enableRealTime ? refreshInterval : false,
  });

  // Skill gap analysis
  const skillGapMutation = useMutation({
    mutationFn: ({ employeeId, roleId }: { employeeId: string; roleId: string }) =>
      aiService.analyzeSkillGaps(employeeId, roleId),
    onSuccess: (data) => {
      setInsights(prev => [...prev, ...data]);
    },
  });

  // Resume analysis
  const resumeAnalysisMutation = useMutation({
    mutationFn: (resumeFile: File) => aiService.analyzeResume(resumeFile),
    onSuccess: (data) => {
      // Handle resume analysis results
      console.log('Resume analysis completed:', data);
    },
  });

  // Workforce planning
  const workforcePlanningMutation = useMutation({
    mutationFn: ({ organizationId, timeframe }: { organizationId: string; timeframe: number }) =>
      aiService.generateWorkforcePlan(organizationId, timeframe),
    onSuccess: (data) => {
      // Handle workforce planning results
      console.log('Workforce planning completed:', data);
    },
  });

  // Batch predictions
  const batchPredictionMutation = useMutation({
    mutationFn: (predictions: Array<{
      employeeId: string;
      model: string;
      features: Record<string, any>;
    }>) => aiService.batchPredict(predictions),
    onSuccess: (data) => {
      setPredictions(prev => [...prev, ...data]);
    },
  });

  // Update insights when data changes
  useEffect(() => {
    if (employeeInsights) {
      setInsights(employeeInsights);
    }
  }, [employeeInsights]);

  // Update predictions when data changes
  useEffect(() => {
    const newPredictions: AIPrediction[] = [];
    
    if (attritionRisk) {
      newPredictions.push(attritionRisk);
    }
    
    if (performancePrediction) {
      newPredictions.push(performancePrediction);
    }
    
    if (newPredictions.length > 0) {
      setPredictions(prev => [...prev, ...newPredictions]);
    }
  }, [attritionRisk, performancePrediction]);

  // Analyze skill gaps
  const analyzeSkillGaps = useCallback((employeeId: string, roleId: string) => {
    skillGapMutation.mutate({ employeeId, roleId });
  }, [skillGapMutation]);

  // Analyze resume
  const analyzeResume = useCallback((resumeFile: File) => {
    resumeAnalysisMutation.mutate(resumeFile);
  }, [resumeAnalysisMutation]);

  // Generate workforce plan
  const generateWorkforcePlan = useCallback((organizationId: string, timeframe: number) => {
    workforcePlanningMutation.mutate({ organizationId, timeframe });
  }, [workforcePlanningMutation]);

  // Batch predict
  const batchPredict = useCallback((predictions: Array<{
    employeeId: string;
    model: string;
    features: Record<string, any>;
  }>) => {
    batchPredictionMutation.mutate(predictions);
  }, [batchPredictionMutation]);

  // Refresh all insights
  const refreshInsights = useCallback(() => {
    if (employeeId) {
      queryClient.invalidateQueries(['ai-insights', employeeId]);
      queryClient.invalidateQueries(['ai-attrition-risk', employeeId]);
      queryClient.invalidateQueries(['ai-performance-prediction', employeeId]);
    }
  }, [employeeId, queryClient]);

  // Get insights by type
  const getInsightsByType = useCallback((type: string) => {
    return insights.filter(insight => insight.type === type);
  }, [insights]);

  // Get predictions by model
  const getPredictionsByModel = useCallback((model: string) => {
    return predictions.filter(prediction => prediction.model === model);
  }, [predictions]);

  // Get high-confidence insights
  const getHighConfidenceInsights = useCallback((threshold: number = 0.8) => {
    return insights.filter(insight => insight.confidence >= threshold);
  }, [insights]);

  // Get risk insights
  const getRiskInsights = useCallback(() => {
    return insights.filter(insight => 
      insight.type === 'attrition_risk' && insight.confidence > 0.7
    );
  }, [insights]);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    return insights.filter(insight => 
      insight.type === 'performance_prediction' || insight.type === 'engagement'
    );
  }, [insights]);

  // Get skill gap insights
  const getSkillGapInsights = useCallback(() => {
    return insights.filter(insight => insight.type === 'skill_gap');
  }, [insights]);

  return {
    // Data
    insights,
    predictions,
    employeeInsights,
    attritionRisk,
    performancePrediction,
    
    // Loading states
    insightsLoading,
    attritionLoading,
    performanceLoading,
    skillGapLoading: skillGapMutation.isPending,
    resumeAnalysisLoading: resumeAnalysisMutation.isPending,
    workforcePlanningLoading: workforcePlanningMutation.isPending,
    batchPredictionLoading: batchPredictionMutation.isPending,
    
    // Actions
    analyzeSkillGaps,
    analyzeResume,
    generateWorkforcePlan,
    batchPredict,
    refreshInsights,
    
    // Utilities
    getInsightsByType,
    getPredictionsByModel,
    getHighConfidenceInsights,
    getRiskInsights,
    getPerformanceInsights,
    getSkillGapInsights,
    
    // Error states
    skillGapError: skillGapMutation.error,
    resumeAnalysisError: resumeAnalysisMutation.error,
    workforcePlanningError: workforcePlanningMutation.error,
    batchPredictionError: batchPredictionMutation.error,
  };
};
