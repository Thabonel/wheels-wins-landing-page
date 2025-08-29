
export interface TipData {
  id: string;
  title: string;
  content: string;
  source: string;
  likes: number;
  isNew: boolean;
}

export interface TipCategory {
  id: string;
  name: string;
  tips: TipData[];
}

export interface LeaderboardUser {
  name: string;
  points: number;
  avatar: string;
}
