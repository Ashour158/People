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

  // Ultra-simplified navigation - MAX 3 items for any role
  const getMenuItems = (userRole: string): MenuItem[] => {
    if (userRole === 'employee') {
      return [
        { text: 'My Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Time & Leave', icon: <AccessTimeIcon />, path: '/attendance' },
        { text: 'My Profile', icon: <PeopleIcon />, path: '/profile' },
      ];
    }

    if (userRole === 'hr_manager') {
      return [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Team Management', icon: <PeopleIcon />, path: '/employees' },
        { text: 'HR Operations', icon: <SettingsIcon />, path: '/hr-operations' },
      ];
    }

    // Admin/Manager - Still simplified
    return [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'People', icon: <PeopleIcon />, path: '/employees' },
      { text: 'Operations', icon: <SettingsIcon />, path: '/operations' },
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
