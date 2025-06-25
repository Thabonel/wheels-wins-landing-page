
export const formatEventTime = (start: string, end: string) => {
  const startHour = parseInt(start.split(':')[0]);
  const startDisplay = startHour === 0 && end === "23:59" ? "All day" :
                        startHour === 12 ? "12 PM" : 
                        startHour > 12 ? `${startHour - 12}:${start.split(':')[1]} PM` : 
                        `${startHour}:${start.split(':')[1]} AM`;
  return startDisplay;
};

export const getFormattedTime = (date: Date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
