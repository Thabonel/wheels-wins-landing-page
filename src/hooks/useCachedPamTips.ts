
import { useState, useEffect } from 'react';

interface CachedTip {
  id: string;
  content: string;
  timestamp: Date;
}

const DEFAULT_TIPS: CachedTip[] = [
  {
    id: '1',
    content: "Try the 2-2-2 Rule: Drive no more than 200 miles, arrive by 2 PM, and stay at least 2 nights.",
    timestamp: new Date()
  },
  {
    id: '2', 
    content: "Save money by staying at National Forest campgrounds - often $20/night vs $45+ at commercial sites.",
    timestamp: new Date()
  },
  {
    id: '3',
    content: "Check for free camping apps like FreeRoam and Campendium before booking paid sites.",
    timestamp: new Date()
  },
  {
    id: '4',
    content: "Fill up water tanks and dump waste at truck stops to avoid campground fees.",
    timestamp: new Date()
  },
  {
    id: '5',
    content: "Plan grocery shopping during travel days to take advantage of regional price differences.",
    timestamp: new Date()
  }
];

export function useCachedPamTips() {
  const [cachedTips, setCachedTips] = useState<CachedTip[]>(() => {
    const saved = localStorage.getItem('cached-pam-tips');
    return saved ? JSON.parse(saved) : DEFAULT_TIPS;
  });

  useEffect(() => {
    localStorage.setItem('cached-pam-tips', JSON.stringify(cachedTips));
  }, [cachedTips]);

  const addTip = (content: string) => {
    const newTip: CachedTip = {
      id: Date.now().toString(),
      content,
      timestamp: new Date()
    };
    setCachedTips(prev => [newTip, ...prev.slice(0, 4)]); // Keep only 5 tips
  };

  const getLatestTips = () => cachedTips.slice(0, 5);

  return {
    cachedTips: getLatestTips(),
    addTip
  };
}
