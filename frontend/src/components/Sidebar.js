import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
    description: 'Overview and statistics',
  },
  {
    id: 'upload',
    label: 'Upload',
    path: '/upload',
    icon: UploadIcon,
    description: 'Upload files for processing',
    badge: 'New',
  },
  {
    id: 'summaries',
    label: 'Summaries',
    path: '/summaries',
    icon: DescriptionIcon,
    description: 'View and manage summaries',
  },
];

const secondaryItems = [
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: AnalyticsIcon,
    description: 'Usage analytics',
    disabled: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
    description: 'App settings',
  },
  {
    id: 'help',
    label: 'Help',
    path: '/help',
    icon: HelpIcon,
    description: 'Documentation and support',
  },
];

const Sidebar = ({ onItemClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleItemClick = (path) => {
    navigate(path);
    if (onItemClick) {
      onItemClick();
    }
  };

  const renderNavItem = (item, index) => {
    const isActive = location.pathname === item.path;
    const IconComponent = item.icon;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick(item.path)}
            disabled={item.disabled}
            sx={{
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              minHeight: 48,
              bgcolor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              '&:hover': {
                bgcolor: isActive ? 'primary.dark' : 'action.hover',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isActive ? 'primary.contrastText' : 'text.secondary',
              }}
            >
              <IconComponent fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={!isActive ? item.description : null}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isActive ? 600 : 400,
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                sx: { display: { xs: 'none', sm: 'block' } },
              }}
            />
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                color="secondary"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      </motion.div>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      <List>
        {navigationItems.map((item, index) => renderNavItem(item, index))}
      </List>

      <Divider sx={{ mx: 2, my: 2 }} />

      <List>
        {secondaryItems.map((item, index) => 
          renderNavItem(item, navigationItems.length + index)
        )}
      </List>

      <Box sx={{ px: 2, py: 3, mt: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            textAlign: 'center',
          }}
        >
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
            Powered by
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
            <Chip label="Gemini" size="small" variant="outlined" />
            <Chip label="GPT" size="small" variant="outlined" />
          </Box>
          <Box sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
            v1.0.0
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;