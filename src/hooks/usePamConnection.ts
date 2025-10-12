import { useContext } from "react";
import { PamConnectionProvider } from "@/contexts/PamConnectionProvider";

// Re-export the hook from provider to match project hook conventions
export { usePamConnection } from "@/contexts/PamConnectionProvider";

// Helper export for easy provider inclusion
export const PamConnectionContextProvider = PamConnectionProvider;

