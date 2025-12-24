
export interface InterviewConfig {
  role: string;
  company: string;
  experience: string;
}

export interface TranscriptionItem {
  type: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export enum InterviewStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}
