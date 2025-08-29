
export const regionCenters: Record<string, [number, number]> = {
  Australia: [133.7751, -25.2744],
  US: [-98.5795, 39.8283],
  Canada: [-106.3468, 56.1304],
  NZ: [174.8860, -40.9006],
  UK: [-3.435973, 55.378051],
};

export const modes = [
  { label: "Off-grid", value: "off-grid" },
  { label: "Luxury", value: "luxury" },
  { label: "Fastest (routing)", value: "fastest" },
  { label: "Shortest (routing)", value: "shortest" },
  { label: "Scenic (routing)", value: "scenic" },
];
