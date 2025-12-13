const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for now, lock down in prod
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Connect to PM2
pm2.connect((err) => {
  if (err) {
    console.error('Error connecting to PM2:', err);
    process.exit(2);
  }
  
  console.log('PM2 connected');

  // Start Log Streaming
  pm2.launchBus((err, bus) => {
    if (err) {
      console.error('Error launching PM2 bus:', err);
      return;
    }

    console.log('PM2 Bus launched, listening for logs...');

    bus.on('log:out', (packet) => {
      io.emit('log', {
        type: 'out',
        process_name: packet.process.name,
        pm_id: packet.process.pm_id,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });

    bus.on('log:err', (packet) => {
      io.emit('log', {
        type: 'err',
        process_name: packet.process.name,
        pm_id: packet.process.pm_id,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });
  });
});

// API: List Processes
app.get('/api/processes', (req, res) => {
  pm2.list((err, list) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const processes = list.map(proc => ({
      name: proc.name,
      pm_id: proc.pm_id,
      status: proc.pm2_env.status,
      memory: proc.monit.memory,
      cpu: proc.monit.cpu,
      uptime: proc.pm2_env.pm_uptime,
      pm_out_log_path: proc.pm2_env.pm_out_log_path,
      pm_err_log_path: proc.pm2_env.pm_err_log_path
    }));
    res.json(processes);
  });
});

// API: Get Historical Logs
app.get('/api/logs/:pm_id', (req, res) => {
  const pm_id = req.params.pm_id;
  const type = req.query.type || 'out'; // 'out' or 'err'
  const lines = parseInt(req.query.lines) || 100;

  pm2.describe(pm_id, (err, list) => {
    if (err || list.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }

    const proc = list[0];
    const logPath = type === 'err' ? proc.pm2_env.pm_err_log_path : proc.pm2_env.pm_out_log_path;

    if (!logPath || !fs.existsSync(logPath)) {
      return res.json({ logs: [] });
    }

    // Simple implementation: Read last N lines. 
    // For production with huge files, `read-last-lines` package or stream reading is better.
    // Here we'll read the file and slice, but limit file read size for safety.
    
    // Safety check: if file is > 10MB, warn or handle carefully. 
    // For this prototype, we'll try to read a chunk from the end.
    
    const stats = fs.statSync(logPath);
    const fileSize = stats.size;
    const bufferSize = 100 * 1024; // Read last 100KB
    const start = Math.max(0, fileSize - bufferSize);
    
    const stream = fs.createReadStream(logPath, { 
      start: start, 
      end: fileSize 
    });
    
    let data = '';
    stream.on('data', chunk => data += chunk);
    stream.on('end', () => {
      const allLines = data.split('\n');
      const lastLines = allLines.slice(-lines);
      res.json({ logs: lastLines.join('\n') });
    });
    stream.on('error', (e) => res.status(500).json({ error: e.message }));
  });
});

// Serve Static Frontend Files
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  // Catch-all route to serve React app for non-API requests
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.log("Client build not found. API mode only.");
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
