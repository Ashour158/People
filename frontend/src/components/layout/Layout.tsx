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
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuToggle = (text: string) => {
    setOpenMenus((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  const menuItems: MenuItem[] = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Employees', icon: <PeopleIcon />, path: '/employees' },
    { text: 'Attendance', icon: <AccessTimeIcon />, path: '/attendance' },
    { text: 'Leave', icon: <EventNoteIcon />, path: '/leave' },
    {
      text: 'Performance',
      icon: <TrendingUpIcon />,
      children: [
        { text: 'Goals & OKRs', icon: <TrendingUpIcon />, path: '/performance/goals' },
        { text: 'Reviews', icon: <TrendingUpIcon />, path: '/performance/reviews' },
        { text: '360 Feedback', icon: <TrendingUpIcon />, path: '/performance/feedback' },
        { text: 'KPI Tracking', icon: <TrendingUpIcon />, path: '/performance/kpi' },
      ],
    },
    {
      text: 'Recruitment',
      icon: <WorkIcon />,
      children: [
        { text: 'Job Postings', icon: <WorkIcon />, path: '/recruitment/jobs' },
        { text: 'Candidates', icon: <WorkIcon />, path: '/recruitment/pipeline' },
        { text: 'Interviews', icon: <WorkIcon />, path: '/recruitment/interviews' },
        { text: 'Offers', icon: <WorkIcon />, path: '/recruitment/offers' },
      ],
    },
    {
      text: 'Payroll',
      icon: <AttachMoneyIcon />,
      children: [
        { text: 'Dashboard', icon: <AttachMoneyIcon />, path: '/payroll/dashboard' },
        { text: 'Salary Slips', icon: <AttachMoneyIcon />, path: '/payroll/slips' },
        { text: 'Processing', icon: <AttachMoneyIcon />, path: '/payroll/processing' },
      ],
    },
    {
      text: 'Surveys',
      icon: <PollIcon />,
      children: [
        { text: 'Builder', icon: <PollIcon />, path: '/surveys/builder' },
        { text: 'Survey List', icon: <PollIcon />, path: '/surveys/list' },
        { text: 'Results', icon: <PollIcon />, path: '/surveys/results' },
      ],
    },
    {
      text: 'Workflows',
      icon: <AccountTreeIcon />,
      children: [
        { text: 'Designer', icon: <AccountTreeIcon />, path: '/workflows/designer' },
        { text: 'Active', icon: <AccountTreeIcon />, path: '/workflows/active' },
        { text: 'Templates', icon: <AccountTreeIcon />, path: '/workflows/templates' },
      ],
    },
    {
      text: 'Expenses',
      icon: <ReceiptIcon />,
      children: [
        { text: 'Claims', icon: <ReceiptIcon />, path: '/expenses/claims' },
        { text: 'Approval', icon: <ReceiptIcon />, path: '/expenses/approval' },
        { text: 'Reports', icon: <ReceiptIcon />, path: '/expenses/reports' },
        { text: 'Categories', icon: <ReceiptIcon />, path: '/expenses/categories' },
      ],
    },
    {
      text: 'Helpdesk',
      icon: <HelpCenterIcon />,
      children: [
        { text: 'Tickets', icon: <HelpCenterIcon />, path: '/helpdesk/tickets' },
        { text: 'Create Ticket', icon: <HelpCenterIcon />, path: '/helpdesk/create' },
        { text: 'Knowledge Base', icon: <HelpCenterIcon />, path: '/helpdesk/kb' },
      ],
    },
    {
      text: 'Documents',
      icon: <FolderIcon />,
      children: [
        { text: 'Library', icon: <FolderIcon />, path: '/documents/library' },
        { text: 'Upload', icon: <FolderIcon />, path: '/documents/upload' },
      ],
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      children: [
        { text: 'Company', icon: <SettingsIcon />, path: '/settings/company' },
        { text: 'Users', icon: <SettingsIcon />, path: '/settings/users' },
        { text: 'Roles', icon: <SettingsIcon />, path: '/settings/roles' },
        { text: 'System', icon: <SettingsIcon />, path: '/settings/system' },
      ],
    },
  ];

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
    </Box>
  );
};
