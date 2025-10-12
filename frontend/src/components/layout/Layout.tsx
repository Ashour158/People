import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  EventNote as EventNoteIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
  AttachMoney as AttachMoneyIcon,
  Poll as PollIcon,
  AccountTree as AccountTreeIcon,
  Receipt as ReceiptIcon,
  HelpCenter as HelpCenterIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { GlobalSearch } from '../common/GlobalSearch';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { HelpSystem } from '../help/HelpSystem';
import { ContextualHelp } from '../help/ContextualHelp';

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path?: string;
  children?: MenuItem[];
}

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Check if user needs onboarding
  React.useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hrms-onboarding-completed');
    if (!hasSeenOnboarding && user) {
      setOnboardingOpen(true);
    }
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hrms-onboarding-completed', 'true');
    setOnboardingOpen(false);
  };

  const handleMenuToggle = (text: string) => {
    setOpenMenus((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  // Comprehensive role-based navigation
  const getMenuItems = (userRole: string): MenuItem[] => {
    if (userRole === 'employee') {
      return [
        { text: 'My Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'My Profile', icon: <PeopleIcon />, path: '/profile' },
        { text: 'Time & Attendance', icon: <AccessTimeIcon />, path: '/attendance' },
        { text: 'Leave Management', icon: <EventNoteIcon />, path: '/leave' },
        { text: 'My Goals', icon: <TrendingUpIcon />, path: '/performance/goals' },
        { text: 'My Reviews', icon: <PollIcon />, path: '/performance/reviews' },
        { text: 'My Payslips', icon: <AttachMoneyIcon />, path: '/payroll/slips' },
        { text: 'My Expenses', icon: <ReceiptIcon />, path: '/expenses/claims' },
        { text: 'Support', icon: <HelpCenterIcon />, path: '/helpdesk/tickets' },
        { text: 'My Documents', icon: <FolderIcon />, path: '/documents/library' },
        { text: 'Surveys', icon: <PollIcon />, path: '/surveys/list' },
      ];
    }

    if (userRole === 'hr_manager') {
      return [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Employees', icon: <PeopleIcon />, path: '/employees' },
        { text: 'Attendance', icon: <AccessTimeIcon />, path: '/attendance' },
        { text: 'Leave Management', icon: <EventNoteIcon />, path: '/leave' },
        { 
          text: 'Performance', 
          icon: <TrendingUpIcon />, 
          children: [
            { text: 'Goals', path: '/performance/goals' },
            { text: 'Reviews', path: '/performance/reviews' },
            { text: 'Feedback', path: '/performance/feedback' },
            { text: 'KPIs', path: '/performance/kpi' },
          ]
        },
        { 
          text: 'Recruitment', 
          icon: <WorkIcon />, 
          children: [
            { text: 'Job Postings', path: '/recruitment/jobs' },
            { text: 'Candidates', path: '/recruitment/pipeline' },
            { text: 'Interviews', path: '/recruitment/interviews' },
            { text: 'Offers', path: '/recruitment/offers' },
          ]
        },
        { 
          text: 'Payroll', 
          icon: <AttachMoneyIcon />, 
          children: [
            { text: 'Dashboard', path: '/payroll/dashboard' },
            { text: 'Processing', path: '/payroll/processing' },
            { text: 'Salary Slips', path: '/payroll/slips' },
          ]
        },
        { 
          text: 'Workflows', 
          icon: <AccountTreeIcon />, 
          children: [
            { text: 'Designer', path: '/workflows/designer' },
            { text: 'Active', path: '/workflows/active' },
            { text: 'Templates', path: '/workflows/templates' },
          ]
        },
        { 
          text: 'Expenses', 
          icon: <ReceiptIcon />, 
          children: [
            { text: 'Claims', path: '/expenses/claims' },
            { text: 'Approval', path: '/expenses/approval' },
            { text: 'Reports', path: '/expenses/reports' },
            { text: 'Categories', path: '/expenses/categories' },
          ]
        },
        { 
          text: 'Helpdesk', 
          icon: <HelpCenterIcon />, 
          children: [
            { text: 'Tickets', path: '/helpdesk/tickets' },
            { text: 'Create Ticket', path: '/helpdesk/create' },
            { text: 'Knowledge Base', path: '/helpdesk/kb' },
          ]
        },
        { 
          text: 'Documents', 
          icon: <FolderIcon />, 
          children: [
            { text: 'Library', path: '/documents/library' },
            { text: 'Upload', path: '/documents/upload' },
          ]
        },
        { 
          text: 'Surveys', 
          icon: <PollIcon />, 
          children: [
            { text: 'Builder', path: '/surveys/builder' },
            { text: 'List', path: '/surveys/list' },
            { text: 'Results', path: '/surveys/results' },
          ]
        },
        { text: 'Analytics', icon: <TrendingUpIcon />, path: '/analytics' },
        { 
          text: 'Settings', 
          icon: <SettingsIcon />, 
          children: [
            { text: 'Company', path: '/settings/company' },
            { text: 'Users', path: '/settings/users' },
            { text: 'Roles', path: '/settings/roles' },
            { text: 'System', path: '/settings/system' },
          ]
        },
      ];
    }

    // Admin - Full system access
    return [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Employees', icon: <PeopleIcon />, path: '/employees' },
      { text: 'Attendance', icon: <AccessTimeIcon />, path: '/attendance' },
      { text: 'Leave Management', icon: <EventNoteIcon />, path: '/leave' },
      { 
        text: 'Performance', 
        icon: <TrendingUpIcon />, 
        children: [
          { text: 'Goals', path: '/performance/goals' },
          { text: 'Reviews', path: '/performance/reviews' },
          { text: 'Feedback', path: '/performance/feedback' },
          { text: 'KPIs', path: '/performance/kpi' },
        ]
      },
      { 
        text: 'Recruitment', 
        icon: <WorkIcon />, 
        children: [
          { text: 'Job Postings', path: '/recruitment/jobs' },
          { text: 'Candidates', path: '/recruitment/pipeline' },
          { text: 'Interviews', path: '/recruitment/interviews' },
          { text: 'Offers', path: '/recruitment/offers' },
        ]
      },
      { 
        text: 'Payroll', 
        icon: <AttachMoneyIcon />, 
        children: [
          { text: 'Dashboard', path: '/payroll/dashboard' },
          { text: 'Processing', path: '/payroll/processing' },
          { text: 'Salary Slips', path: '/payroll/slips' },
        ]
      },
      { 
        text: 'Workflows', 
        icon: <AccountTreeIcon />, 
        children: [
          { text: 'Designer', path: '/workflows/designer' },
          { text: 'Active', path: '/workflows/active' },
          { text: 'Templates', path: '/workflows/templates' },
        ]
      },
      { 
        text: 'Expenses', 
        icon: <ReceiptIcon />, 
        children: [
          { text: 'Claims', path: '/expenses/claims' },
          { text: 'Approval', path: '/expenses/approval' },
          { text: 'Reports', path: '/expenses/reports' },
          { text: 'Categories', path: '/expenses/categories' },
        ]
      },
      { 
        text: 'Helpdesk', 
        icon: <HelpCenterIcon />, 
        children: [
          { text: 'Tickets', path: '/helpdesk/tickets' },
          { text: 'Create Ticket', path: '/helpdesk/create' },
          { text: 'Knowledge Base', path: '/helpdesk/kb' },
        ]
      },
      { 
        text: 'Documents', 
        icon: <FolderIcon />, 
        children: [
          { text: 'Library', path: '/documents/library' },
          { text: 'Upload', path: '/documents/upload' },
        ]
      },
      { 
        text: 'Surveys', 
        icon: <PollIcon />, 
        children: [
          { text: 'Builder', path: '/surveys/builder' },
          { text: 'List', path: '/surveys/list' },
          { text: 'Results', path: '/surveys/results' },
        ]
      },
      { text: 'Analytics', icon: <TrendingUpIcon />, path: '/analytics' },
      { text: 'Integrations', icon: <WorkIcon />, path: '/integrations' },
      { 
        text: 'System Admin', 
        icon: <SettingsIcon />, 
        children: [
          { text: 'User Management', path: '/settings/users' },
          { text: 'Role Management', path: '/settings/roles' },
          { text: 'System Configuration', path: '/settings/system' },
          { text: 'Company Settings', path: '/settings/company' },
        ]
      },
    ];
  };

  const menuItems = getMenuItems(user?.role || 'employee');

  const renderMenuItem = (item: MenuItem) => {
    if (item.children) {
      return (
        <React.Fragment key={item.text}>
          <ListItemButton onClick={() => handleMenuToggle(item.text)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
            {openMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openMenus[item.text]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => (
                <ListItemButton
                  key={child.text}
                  sx={{ pl: 4 }}
                  onClick={() => child.path && navigate(child.path)}
                >
                  <ListItemText primary={child.text} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem key={item.text} disablePadding>
        <ListItemButton onClick={() => item.path && navigate(item.path)}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          HR System
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => renderMenuItem(item))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            HR Management System
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setSearchOpen(true)}
            sx={{ mr: 1 }}
            title="Search (Ctrl+K)"
          >
            <SearchIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={() => setHelpOpen(true)}
            sx={{ mr: 1 }}
            title="Help & Support"
          >
            <HelpIcon />
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username}
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <OnboardingTour 
        open={onboardingOpen} 
        onClose={() => setOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
      <HelpSystem open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ContextualHelp context="dashboard" />
    </Box>
  );
};
