import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Sidebar from './components/Sidebar';
import LogViewer from './components/LogViewer';
import type { Process, LogData } from './types';
import io from 'socket.io-client';
import axios from 'axios';

// In production (served by node), URL is relative. In dev, points to port 3000.
const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

function App() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedPmId, setSelectedPmId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Initial Data Fetch & Polling for process list updates
  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000); // Poll every 5s for status updates
    return () => clearInterval(interval);
  }, []);

  const fetchProcesses = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/processes`);
      setProcesses(res.data);
      // Auto-select first process if none selected
      if (selectedPmId === null && res.data.length > 0) {
        setSelectedPmId(res.data[0].pm_id);
      }
    } catch (err) {
      console.error("Failed to fetch processes", err);
    }
  };

  // Socket.io Connection for Real-time Logs
  useEffect(() => {
    const socket = io(SERVER_URL || undefined);

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('log', (newLog: LogData) => {
      // Only append log if it belongs to the selected process
      // OR we could store all and filter in UI. Storing all might be memory heavy.
      // For this app, let's append to global store but only show selected.
      // Actually, better to append to state, but let's be careful about memory.
      // Optimization: Only add if matches current view or keeps a limited buffer.
      
      setLogs(prev => {
        // Limit buffer size to 2000 lines to prevent crashing
        const newLogs = [...prev, newLog];
        if (newLogs.length > 2000) return newLogs.slice(newLogs.length - 2000);
        return newLogs;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch Historical Logs when process changes
  useEffect(() => {
    if (selectedPmId === null) return;

    const fetchHistory = async () => {
      setLoadingLogs(true);
      setLogs([]); // Clear current view while loading history
      try {
        // Fetch stdout and stderr
        const [outRes, errRes] = await Promise.all([
          axios.get(`${SERVER_URL}/api/logs/${selectedPmId}?type=out&lines=50`),
          axios.get(`${SERVER_URL}/api/logs/${selectedPmId}?type=err&lines=50`)
        ]);

        const formatLogs = (raw: string, type: 'out' | 'err'): LogData[] => {
          if (!raw) return [];
          return raw.split('\n').filter(l => l).map(line => ({
            type,
            process_name: 'history', // Placeholder
            pm_id: selectedPmId,
            data: line,
            timestamp: new Date().toISOString() // History doesn't have timestamps in file usually unless configured. Using current for sort order relative to new logs? 
            // Better: just display as is. If timestamps are in text, they are in data.
            // For this UI, we need a timestamp field. Let's assume 'now' for history order or try to parse.
            // Simple approach: Use 'Historical' as timestamp or just 0.
          }));
        };
        
        // Combine and sort? File logs don't have atomic timestamps per line easily parseable unless formatted.
        // We will just concat them for now.
        const histLogs = [
            ...formatLogs(outRes.data.logs, 'out'),
            ...formatLogs(errRes.data.logs, 'err')
        ];
        
        setLogs(histLogs);
      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchHistory();
  }, [selectedPmId]);

  // Filter logs for the selected process
  const displayLogs = logs.filter(l => l.pm_id === selectedPmId);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar 
        processes={processes} 
        selectedPmId={selectedPmId} 
        onSelectProcess={setSelectedPmId} 
      />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 0 }}>
        {selectedPmId !== null ? (
          <LogViewer logs={displayLogs} loading={loadingLogs} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Typography variant="h6" color="text.secondary">
              {processes.length === 0 ? "No PM2 processes found." : "Select a process to view logs."}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;