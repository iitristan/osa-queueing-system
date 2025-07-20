export interface Officer {
  id: string;
  name: string;
  online: boolean;
  prefix: string;
  role: string;
  counter_type: string;
}

export interface QueueItem {
  id: string;
  officer_id: string;
  number: number;
  status: 'waiting' | 'served' | 'no_show' | 'transferred';
  is_prioritized: boolean;
  created_at: string;
  full_name?: string;
  college?: string;
  waiting_start_time?: string;
  total_waiting_time?: number;
  consultation_start_time?: string;
  total_consultation_time?: number;
}

export interface QueueStats {
  total: number;
  served: number;
  no_show: number;
  waiting: number;
  last_served: string | null;
}

export interface LastUpdate {
  officerName: string;
  queueNumber: string;
  action: "added" | "removed" | "reset" | "transferred";
  timestamp: string;
} 