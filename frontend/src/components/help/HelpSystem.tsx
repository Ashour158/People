import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Article as ArticleIcon,
  VideoLibrary as VideoLibraryIcon,
  ContactSupport as ContactSupportIcon,
} from '@mui/icons-material';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'faq';
  content: string;
  tags: string[];
}

interface HelpSystemProps {
  open: boolean;
  onClose: () => void;
}

export const HelpSystem: React.FC<HelpSystemProps> = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const helpItems: HelpItem[] = [
    {
      id: 'getting-started',
      title: 'Getting Started with HRMS',
      description: 'Learn the basics of using the HR Management System',
      type: 'article',
      content: 'This guide will help you understand the main features and how to navigate the system effectively.',
      tags: ['beginner', 'navigation', 'basics'],
    },
    {
      id: 'employee-management',
      title: 'Managing Employees',
      description: 'How to add, edit, and manage employee information',
      type: 'article',
      content: 'Step-by-step guide to employee management including adding new employees, updating information, and managing employee records.',
      tags: ['employees', 'management', 'data'],
    },
    {
      id: 'attendance-tracking',
      title: 'Attendance Tracking',
      description: 'Setting up and using attendance features',
      type: 'video',
      content: 'Video tutorial on how to track employee attendance, check-in/out processes, and generate attendance reports.',
      tags: ['attendance', 'tracking', 'reports'],
    },
    {
      id: 'leave-management',
      title: 'Leave Management',
      description: 'Managing employee leave requests and approvals',
      type: 'article',
      content: 'Complete guide to leave management including applying for leave, approving requests, and managing leave balances.',
      tags: ['leave', 'approval', 'balance'],
    },
    {
      id: 'payroll-setup',
      title: 'Payroll Configuration',
      description: 'Setting up payroll and salary management',
      type: 'article',
      content: 'How to configure payroll settings, manage salary structures, and process monthly payroll.',
      tags: ['payroll', 'salary', 'configuration'],
    },
    {
      id: 'reports-analytics',
      title: 'Reports and Analytics',
      description: 'Generating reports and understanding analytics',
      type: 'video',
      content: 'Learn how to generate various HR reports and understand the analytics dashboard.',
      tags: ['reports', 'analytics', 'dashboard'],
    },
  ];

  const faqItems = [
    {
      question: 'How do I add a new employee?',
      answer: 'Go to Employees > Add Employee, fill in the required information, and save. The system will automatically create a user account.',
    },
    {
      question: 'How can I check attendance records?',
      answer: 'Navigate to Attendance section to view daily, weekly, or monthly attendance reports. You can filter by employee or date range.',
    },
    {
      question: 'How do I approve leave requests?',
      answer: 'Go to Leave Management > Pending Requests to view and approve/reject leave applications.',
    },
    {
      question: 'Can I customize the dashboard?',
      answer: 'Yes, you can customize dashboard widgets by clicking the settings icon on each widget.',
    },
    {
      question: 'How do I generate payroll reports?',
      answer: 'Navigate to Payroll > Reports to generate salary slips, tax reports, and other payroll-related documents.',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Topics', count: helpItems.length },
    { id: 'employees', label: 'Employee Management', count: helpItems.filter(item => item.tags.includes('employees')).length },
    { id: 'attendance', label: 'Attendance', count: helpItems.filter(item => item.tags.includes('attendance')).length },
    { id: 'leave', label: 'Leave Management', count: helpItems.filter(item => item.tags.includes('leave')).length },
    { id: 'payroll', label: 'Payroll', count: helpItems.filter(item => item.tags.includes('payroll')).length },
  ];

  const filteredItems = helpItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
                           item.tags.some(tag => tag === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <ArticleIcon />;
      case 'video':
        return <VideoLibraryIcon />;
      case 'faq':
        return <HelpIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HelpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Help & Support</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search help articles, videos, and FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={`${category.label} (${category.count})`}
              onClick={() => setSelectedCategory(category.id)}
              color={selectedCategory === category.id ? 'primary' : 'default'}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {/* Help Articles */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Help Articles & Videos
            </Typography>
            <List>
              {filteredItems.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton>
                    <ListItemIcon>{getItemIcon(item.type)}</ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                    />
                    <PlayArrowIcon color="action" />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* FAQ Section */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Frequently Asked Questions
            </Typography>
            {faqItems.map((faq, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>

        {/* Contact Support */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ContactSupportIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Need More Help?</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Can't find what you're looking for? Contact our support team for personalized assistance.
          </Typography>
          <Button variant="contained" startIcon={<ContactSupportIcon />}>
            Contact Support
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
