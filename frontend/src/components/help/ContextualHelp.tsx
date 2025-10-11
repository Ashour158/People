import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  Help as HelpIcon,
  Lightbulb as LightbulbIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'video' | 'article' | 'chat';
  action: () => void;
}

interface ContextualHelpProps {
  context: string; // Current page/feature context
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ context }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Context-specific help items
  const getContextualHelp = (context: string): HelpItem[] => {
    const helpItems: Record<string, HelpItem[]> = {
      dashboard: [
        {
          id: 'dashboard-overview',
          title: 'Dashboard Overview',
          description: 'Learn how to navigate your personal dashboard',
          type: 'tip',
          action: () => console.log('Dashboard help'),
        },
        {
          id: 'quick-actions',
          title: 'Quick Actions Guide',
          description: 'Master the quick action buttons',
          type: 'video',
          action: () => console.log('Quick actions video'),
        },
      ],
      attendance: [
        {
          id: 'check-in-out',
          title: 'How to Check In/Out',
          description: 'Step-by-step guide for time tracking',
          type: 'article',
          action: () => console.log('Check-in guide'),
        },
        {
          id: 'attendance-rules',
          title: 'Attendance Policies',
          description: 'Understand your company\'s attendance rules',
          type: 'tip',
          action: () => console.log('Attendance policies'),
        },
      ],
      leave: [
        {
          id: 'apply-leave',
          title: 'Apply for Leave',
          description: 'How to request time off',
          type: 'video',
          action: () => console.log('Leave application'),
        },
        {
          id: 'leave-balance',
          title: 'Check Leave Balance',
          description: 'View your available leave days',
          type: 'tip',
          action: () => console.log('Leave balance'),
        },
      ],
      employees: [
        {
          id: 'add-employee',
          title: 'Add New Employee',
          description: 'Complete guide to adding team members',
          type: 'article',
          action: () => console.log('Add employee'),
        },
        {
          id: 'employee-management',
          title: 'Employee Management',
          description: 'Best practices for managing your team',
          type: 'tip',
          action: () => console.log('Employee management'),
        },
      ],
    };

    return helpItems[context] || [
      {
        id: 'general-help',
        title: 'General Help',
        description: 'Get help with this feature',
        type: 'chat',
        action: () => console.log('General help'),
      },
    ];
  };

  const helpItems = getContextualHelp(context);

  const getIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <LightbulbIcon />;
      case 'video':
        return <VideoIcon />;
      case 'article':
        return <ArticleIcon />;
      case 'chat':
        return <ChatIcon />;
      default:
        return <HelpIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tip':
        return 'success';
      case 'video':
        return 'primary';
      case 'article':
        return 'info';
      case 'chat':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Tooltip title="Get help with this page">
        <IconButton
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: 'primary.main',
            color: 'white',
            width: 56,
            height: 56,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'scale(1.05)',
            },
            zIndex: 1000,
          }}
        >
          <HelpIcon />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPopover-paper': {
            width: 320,
            maxHeight: 400,
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Help & Support
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Get help with {context} features
          </Typography>

          <List dense>
            {helpItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      item.action();
                      handleClose();
                    }}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getIcon(item.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 500,
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: 'text.secondary',
                      }}
                    />
                    <Chip
                      label={item.type}
                      size="small"
                      color={getTypeColor(item.type) as any}
                      sx={{ ml: 1 }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < helpItems.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </React.Fragment>
            ))}
          </List>

          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Need more help? Contact support
            </Typography>
          </Box>
        </Box>
      </Popover>
    </>
  );
};
