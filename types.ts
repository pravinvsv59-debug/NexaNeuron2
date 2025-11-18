
export enum Feature {
  CHATBOT = 'NexaNeuron Ai',
  IMAGE_GENERATOR = 'Image Generation',
  IMAGE_ANALYZER = 'Image Analysis',
  VIDEO_GENERATOR = 'Video Generation',
  VIDEO_ANALYZER = 'Video Analysis',
  VIDEO_EDITING = 'Video Editing',
  LIVE_AGENT = 'Live Conversation',
  GROUNDING_SEARCH = 'Grounded Search',
  COMPLEX_TASK_SOLVER = 'Complex Task Solver',
  TEXT_TO_SPEECH = 'Text to Speech',
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  imagePreview?: string;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface GroundingSource {
  title: string;
  uri: string;
}