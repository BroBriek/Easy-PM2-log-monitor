export interface Process {
  name: string;
  pm_id: number;
  status: string;
  memory: number;
  cpu: number;
  uptime: number;
  pm_out_log_path: string;
  pm_err_log_path: string;
}

export interface LogData {
  type: 'out' | 'err';
  process_name: string;
  pm_id: number;
  data: string;
  timestamp: string;
}
