export interface Officer {
    id: string;
    name: string;
    online: boolean;
    prefix: string;
  }
  
  export interface QueueItem {
    id: string;
    number: string;
    officerId: string;
    timestamp: Date;
  }
  
  export interface LastUpdated {
    officerName: string;
    queueNumber: string;
    action: "added" | "removed" | "reset";
    timestamp: Date;
  }
  
  export interface QueueData {
    officers: Officer[];
    queues: { [key: string]: QueueItem[] };
    queueCounters: { [key: string]: number };
    lastUpdated: LastUpdated | null;
  }