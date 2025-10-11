import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  EventNote as EventNoteIcon,
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'employee' | 'feature' | 'help';
  path: string;
  icon: React.ReactElement;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);

  // Search employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'search', searchTerm],
    queryFn: () => employeeApi.getAll({ search: searchTerm, limit: 5 }),
    enabled: searchTerm.length > 2,
  });

  // Static search results for features and help
  const staticResults: SearchResult[] = [
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'Check in/out, view attendance records',
      type: 'feature',
      path: '/attendance',
      icon: <AccessTimeIcon />,
    },
    {
      id: 'leave',
      title: 'Leave Management',
      description: 'Apply for leave, view leave balance',
      type: 'feature',
      path: '/leave',
      icon: <EventNoteIcon />,
    },
    {
      id: 'payroll',
      title: 'Payroll',
      description: 'View salary slips, payroll reports',
      type: 'feature',
      path: '/payroll',
      icon: <AttachMoneyIcon />,
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Performance reviews and goals',
      type: 'feature',
      path: '/performance',
      icon: <TrendingUpIcon />,
    },
    {
      id: 'recruitment',
      title: 'Recruitment',
      description: 'Job postings and candidate management',
      type: 'feature',
      path: '/recruitment',
      icon: <WorkIcon />,
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help with using the system',
      type: 'help',
      path: '/help',
      icon: <HelpIcon />,
    },
  ];

  useEffect(() => {
    if (!searchTerm) {
      setFilteredResults([]);
      return;
    }

    const results: SearchResult[] = [];

    // Add employee results
    if (employeesData?.data) {
      employeesData.data.forEach((employee: any) => {
        results.push({
          id: employee.employee_id,
          title: `${employee.first_name} ${employee.last_name}`,
          description: `${employee.job_title} - ${employee.department_name || 'No Department'}`,
          type: 'employee',
          path: `/employees/${employee.employee_id}`,
          icon: <PeopleIcon />,
        });
      });
    }

    // Add feature results
    const matchingFeatures = staticResults.filter(
      (result) =>
        result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    results.push(...matchingFeatures);

    setFilteredResults(results);
  }, [searchTerm, employeesData]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    onClose();
    setSearchTerm('');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'employee':
        return 'primary';
      case 'feature':
        return 'secondary';
      case 'help':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <TextField
          fullWidth
          placeholder="Search employees, features, or get help..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </DialogTitle>
      <DialogContent>
        {searchTerm.length > 0 && (
          <Box>
            {filteredResults.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No results found for &quot;{searchTerm}&quot;
              </Typography>
            ) : (
              <List>
                {filteredResults.map((result, index) => (
                  <React.Fragment key={result.id}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleResultClick(result)}>
                        <ListItemIcon>{result.icon}</ListItemIcon>
                        <ListItemText
                          primary={result.title}
                          secondary={result.description}
                        />
                        <Chip
                          label={result.type}
                          size="small"
                          color={getTypeColor(result.type) as any}
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < filteredResults.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}

        {searchTerm.length === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Quick Access
            </Typography>
            <List>
              {staticResults.slice(0, 4).map((result) => (
                <ListItem key={result.id} disablePadding>
                  <ListItemButton onClick={() => handleResultClick(result)}>
                    <ListItemIcon>{result.icon}</ListItemIcon>
                    <ListItemText
                      primary={result.title}
                      secondary={result.description}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
