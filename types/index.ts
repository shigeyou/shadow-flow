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
  {
    id: "aromatherapy",
    name: "Aromatherapy",
    nameJa: "アロマテラピー",
    description: "Essential oils, relaxation, and wellness conversations",
  },

  // Knowledge-building themes (search-powered, 12 themes)
  // Note: searchQuery will have today's date appended dynamically
  {
    id: "ai-global",
    name: "AI News (Global)",
    nameJa: "AI動向（国際）",
    description: "Global AI and machine learning news",
    requiresSearch: true,
    searchQuery: "OpenAI Anthropic Google DeepMind AI news today",
  },
  {
    id: "ai-japan",
    name: "AI News (Japan)",
    nameJa: "AI動向（国内）",
    description: "Japan AI industry and research news",
    requiresSearch: true,
    searchQuery: "日本 AI 人工知能 企業 研究 ニュース",
  },
  {
    id: "tech-global",
    name: "Tech News (Global)",
    nameJa: "テック（国際）",
    description: "Global technology and innovation news",
    requiresSearch: true,
    searchQuery: "Apple Google Microsoft Meta technology news today",
  },
  {
    id: "tech-japan",
    name: "Tech News (Japan)",
    nameJa: "テック（国内）",
    description: "Japan technology industry news",
    requiresSearch: true,
    searchQuery: "日本 テクノロジー IT企業 ソニー 任天堂 ニュース",
  },
  {
    id: "economy-global",
    name: "World Economy",
    nameJa: "世界経済",
    description: "Global economic trends and market news",
    requiresSearch: true,
    searchQuery: "world economy market stock Fed ECB news today",
  },
  {
    id: "economy-japan",
    name: "Japan Economy",
    nameJa: "日本経済",
    description: "Japan economic and market news",
    requiresSearch: true,
    searchQuery: "日本経済 日銀 円相場 株価 GDP ニュース",
  },
  {
    id: "startup-global",
    name: "Startups (Global)",
    nameJa: "スタートアップ（国際）",
    description: "Global startup funding and unicorn news",
    requiresSearch: true,
    searchQuery: "startup funding unicorn venture capital news today",
  },
  {
    id: "startup-japan",
    name: "Startups (Japan)",
    nameJa: "スタートアップ（国内）",
    description: "Japan startup ecosystem news",
    requiresSearch: true,
    searchQuery: "日本 スタートアップ ベンチャー 資金調達 ニュース",
  },
  {
    id: "science-tech",
    name: "Science & Research",
    nameJa: "科学技術",
    description: "Scientific discoveries and research breakthroughs",
    requiresSearch: true,
    searchQuery: "science discovery research breakthrough news today",
  },
  {
    id: "energy-environment",
    name: "Energy & Climate",
    nameJa: "エネルギー・環境",
    description: "Clean energy and climate news",
    requiresSearch: true,
    searchQuery: "renewable energy climate change EV solar news today",
  },
  {
    id: "finance-investment",
    name: "Finance & Investment",
    nameJa: "金融・投資",
    description: "Investment trends and financial news",
    requiresSearch: true,
    searchQuery: "investment cryptocurrency bitcoin ETF hedge fund news today",
  },
  {
    id: "business-trends",
    name: "Business Trends",
    nameJa: "ビジネストレンド",
    description: "Business strategy and industry trends",
    requiresSearch: true,
    searchQuery: "business strategy M&A corporate leadership trend news today",
  },
];

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5];
