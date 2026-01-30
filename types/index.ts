export interface Theme {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  requiresSearch?: boolean;
  searchQuery?: string;
}

export interface Sentence {
  id: number;
  text: string;
  translation?: string;
}

export interface Script {
  theme: string;
  sentences: Sentence[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentSentenceIndex: number;
  speed: number;
}

export interface RecordingState {
  isRecording: boolean;
  recordedAudio: Blob | null;
  recordedUrl: string | null;
}

export const PRESET_THEMES: Theme[] = [
  // Basic conversation themes (no search needed)
  {
    id: "meeting",
    name: "Meeting",
    nameJa: "会議進行",
    description: "Phrases for running and participating in meetings",
  },
  {
    id: "business",
    name: "Business",
    nameJa: "ビジネス",
    description: "General business communication and negotiations",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    nameJa: "レストラン",
    description: "Ordering food, making reservations, and dining out",
  },
  {
    id: "travel",
    name: "Travel",
    nameJa: "旅行",
    description: "Airport, hotel, and travel-related conversations",
  },
  {
    id: "shopping",
    name: "Shopping",
    nameJa: "ショッピング",
    description: "Shopping, asking prices, and making purchases",
  },
  {
    id: "smalltalk",
    name: "Small Talk",
    nameJa: "雑談",
    description: "Casual conversations and making friends",
  },
  {
    id: "japan",
    name: "About Japan",
    nameJa: "日本紹介",
    description: "Explaining Japanese culture, traditions, and attractions",
  },

  // Knowledge-building themes (search-powered)
  // Note: searchQuery will have today's date appended dynamically
  {
    id: "ai-trends",
    name: "AI Trends",
    nameJa: "AI最新動向",
    description: "Latest AI and machine learning news",
    requiresSearch: true,
    searchQuery: "AI artificial intelligence news today",
  },
  {
    id: "tech-news",
    name: "Tech News",
    nameJa: "テックニュース",
    description: "Latest technology and startup news",
    requiresSearch: true,
    searchQuery: "technology startup news today",
  },
  {
    id: "bestsellers",
    name: "Bestseller Books",
    nameJa: "話題の本",
    description: "Current bestselling books and their summaries",
    requiresSearch: true,
    searchQuery: "New York Times bestseller books this week",
  },
  {
    id: "japan-news",
    name: "Japan Headlines",
    nameJa: "日本ニュース",
    description: "Today's top news from Japan",
    requiresSearch: true,
    searchQuery: "Japan news today breaking",
  },
  {
    id: "science",
    name: "Science News",
    nameJa: "科学ニュース",
    description: "Latest scientific discoveries and research",
    requiresSearch: true,
    searchQuery: "science discovery research news today",
  },
  {
    id: "business-news",
    name: "Business News",
    nameJa: "経済ニュース",
    description: "Latest business and economic news",
    requiresSearch: true,
    searchQuery: "business economic market news today",
  },
];

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5];
