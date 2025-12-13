import React from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemText, 
  ListItemIcon, Typography, Box, Divider 
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import type { Process } from '../types';

interface SidebarProps {
  processes: Process[];
  selectedPmId: number | null;
  onSelectProcess: (pm_id: number) => void;
}

const drawerWidth = 280;

const Sidebar: React.FC<SidebarProps> = ({ processes, selectedPmId, onSelectProcess }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircleIcon color="success" fontSize="small" />;
      case 'errored': return <ErrorIcon color="error" fontSize="small" />;
      case 'stopped': return <PauseCircleIcon color="disabled" fontSize="small" />;
      default: return <MemoryIcon fontSize="small" />;
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" noWrap component="div">
          Easy PM2 Monitor
        </Typography>
      </Box>
      <Divider />
      <List>
        {processes.map((proc) => (
          <ListItem key={proc.pm_id} disablePadding>
            <ListItemButton 
              selected={selectedPmId === proc.pm_id}
              onClick={() => onSelectProcess(proc.pm_id)}
            >
              <ListItemIcon sx={{ minWidth: 35 }}>
                {getStatusIcon(proc.status)}
              </ListItemIcon>
              <ListItemText 
                primary={proc.name} 
                secondary={`ID: ${proc.pm_id} | Mem: ${(proc.memory / 1024 / 1024).toFixed(0)}MB`} 
                primaryTypographyProps={{ style: { fontWeight: selectedPmId === proc.pm_id ? 'bold' : 'normal' } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
