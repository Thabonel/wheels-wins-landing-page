
export const validateDrawerName = (name: string, existingDrawers: string[]): string | null => {
  if (!name.trim()) {
    return "Drawer name cannot be empty.";
  }
  
  if (name.trim().length < 2) {
    return "Drawer name must be at least 2 characters long.";
  }
  
  if (name.trim().length > 50) {
    return "Drawer name cannot exceed 50 characters.";
  }
  
  if (existingDrawers.includes(name.trim().toLowerCase())) {
    return "A drawer with this name already exists.";
  }
  
  return null;
};
