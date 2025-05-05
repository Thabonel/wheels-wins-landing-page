
export const getQuickReplies = (region: string) => {
  const commonReplies = [
    "Add new event to calendar",
    "Where am I headed next?"
  ];
  
  const regionSpecificReplies: Record<string, string[]> = {
    "Australia": [
      "Show this week's spending in AUD",
      "Find cheapest fuel in Australia"
    ],
    "New Zealand": [
      "Show this week's spending in NZD",
      "Find DOC campsites nearby"
    ],
    "United States": [
      "Show this week's spending in USD",
      "Find cheapest diesel in this state"
    ],
    "Canada": [
      "Show this week's spending in CAD",
      "Find provincial parks nearby"
    ],
    "United Kingdom": [
      "Show this week's spending in GBP",
      "Find caravan parks in the area"
    ]
  };
  
  return [...commonReplies, ...regionSpecificReplies[region as keyof typeof regionSpecificReplies]];
};
