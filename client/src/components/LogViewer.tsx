import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, FormControlLabel, Switch, Chip, Stack, Button } from '@mui/material';
import type { LogData } from '../types';

interface LogViewerProps {
  logs: LogData[];
  loading: boolean;
  onClear: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, loading, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [showOut, setShowOut] = useState(true);
  const [showErr, setShowErr] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Filter logs based on toggles
  const filteredLogs = logs.filter(log => {
    if (log.type === 'out' && !showOut) return false;
    if (log.type === 'err' && !showErr) return false;
    return true;
  });

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
    if (bottom) {
      setAutoScroll(true);
    } else {
      setAutoScroll(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Controls */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Log Console</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="warning" onClick={onClear}>
            Clear
          </Button>
           <FormControlLabel 
            control={<Switch checked={showOut} onChange={(e) => setShowOut(e.target.checked)} color="info" />} 
            label="Stdout" 
          />
           <FormControlLabel 
            control={<Switch checked={showErr} onChange={(e) => setShowErr(e.target.checked)} color="error" />} 
            label="Stderr" 
          />
          <Chip 
            label={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"} 
            color={autoScroll ? "success" : "default"} 
            variant="outlined"
            onClick={() => setAutoScroll(!autoScroll)}
          />
        </Stack>
      </Box>

      {/* Terminal Window */}
      <Paper 
        sx={{ 
          flexGrow: 1, 
          bgcolor: '#0d0d0d', 
          color: '#e0e0e0', 
          p: 2, 
          overflowY: 'auto', 
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          borderRadius: 2,
          border: '1px solid #333'
        }}
        onScroll={handleScroll}
      >
        {loading && <Typography sx={{color: 'gray'}}>Loading historical logs...</Typography>}
        
        {filteredLogs.length === 0 && !loading && (
          <Typography sx={{color: 'gray', fontStyle: 'italic'}}>No logs to display...</Typography>
        )}

        {filteredLogs.map((log, index) => (
          <div key={index} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
            <span style={{ color: '#666', marginRight: '10px', fontSize: '0.8rem' }}>
              [{new Date(log.timestamp).toLocaleTimeString()}]
            </span>
            <span style={{ 
              color: log.type === 'err' ? '#ff5252' : '#69f0ae', 
              fontWeight: 'bold', 
              marginRight: '10px' 
            }}>
              [{log.type.toUpperCase()}]
            </span>
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {log.data}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </Paper>
    </Box>
  );
};

export default LogViewer;
