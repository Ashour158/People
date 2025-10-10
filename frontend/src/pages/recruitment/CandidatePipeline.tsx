import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

interface Candidate {
  candidate_id: string;
  name: string;
  email: string;
  phone: string;
  job_title: string;
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  applied_date: string;
  experience_years: number;
  location: string;
}

export const CandidatePipeline: React.FC = () => {
  const { data: candidates, isLoading } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: async () => {
      return [
        {
          candidate_id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          phone: '+1234567890',
          job_title: 'Senior Software Engineer',
          stage: 'interview',
          applied_date: '2025-10-01',
          experience_years: 5,
          location: 'San Francisco',
        },
        {
          candidate_id: '2',
          name: 'Bob Smith',
          email: 'bob@example.com',
          phone: '+1234567891',
          job_title: 'Product Manager',
          stage: 'screening',
          applied_date: '2025-10-05',
          experience_years: 7,
          location: 'New York',
        },
        {
          candidate_id: '3',
          name: 'Carol White',
          email: 'carol@example.com',
          phone: '+1234567892',
          job_title: 'Senior Software Engineer',
          stage: 'offer',
          applied_date: '2025-09-28',
          experience_years: 6,
          location: 'Remote',
        },
      ];
    },
  });

  const stages = [
    { key: 'applied', label: 'Applied', color: '#e3f2fd' },
    { key: 'screening', label: 'Screening', color: '#fff3e0' },
    { key: 'interview', label: 'Interview', color: '#f3e5f5' },
    { key: 'offer', label: 'Offer', color: '#e8f5e9' },
    { key: 'hired', label: 'Hired', color: '#c8e6c9' },
  ];

  const getCandidatesByStage = (stage: string) => {
    return candidates?.filter((c) => c.stage === stage) || [];
  };

  const getStageCount = (stage: string) => {
    return getCandidatesByStage(stage).length;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Candidate Pipeline</Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />}>
          Add Candidate
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Candidates
              </Typography>
              <Typography variant="h4">{candidates?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {stages.map((stage) => (
          <Grid item xs={12} md={2.4} key={stage.key}>
            <Card sx={{ bgcolor: stage.color }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {stage.label}
                </Typography>
                <Typography variant="h4">{getStageCount(stage.key)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isLoading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {stages.map((stage) => (
            <Grid item xs={12} md={2.4} key={stage.key}>
              <Paper sx={{ p: 2, minHeight: 500, bgcolor: stage.color }}>
                <Typography variant="h6" gutterBottom>
                  {stage.label} ({getStageCount(stage.key)})
                </Typography>
                {getCandidatesByStage(stage.key).map((candidate) => (
                  <Card key={candidate.candidate_id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ mr: 2 }}>
                          {candidate.name.split(' ').map((n) => n[0]).join('')}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2">{candidate.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {candidate.job_title}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="caption">{candidate.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="caption">{candidate.phone}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Chip label={`${candidate.experience_years}y exp`} size="small" />
                        <Chip label={candidate.location} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                        Applied: {new Date(candidate.applied_date).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};
