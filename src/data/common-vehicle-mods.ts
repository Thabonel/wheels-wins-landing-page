/**
 * Common vehicle modifications for overlanding/RV builds
 * Pre-populated templates to speed up modification planning
 */

export interface CommonMod {
  name: string;
  category: 'power' | 'water' | 'comfort' | 'safety' | 'storage' | 'exterior' | 'other';
  priority: 'essential' | 'important' | 'nice-to-have';
  estimated_cost: number;
  time_required_hours: number;
  diy_feasible: boolean;
  description: string;
  vendor_links?: { name: string; url: string }[];
  dependencies?: string[];
}

export const COMMON_VEHICLE_MODS: CommonMod[] = [
  // Power Systems
  {
    name: 'Solar Panel System (400W)',
    category: 'power',
    priority: 'essential',
    estimated_cost: 3500,
    time_required_hours: 16,
    diy_feasible: true,
    description: '400W solar panel array with MPPT controller for off-grid power generation',
    vendor_links: [
      { name: 'Renogy', url: 'https://www.renogy.com' },
      { name: 'Victron', url: 'https://www.victronenergy.com' },
    ],
  },
  {
    name: 'Lithium Battery Bank (200Ah)',
    category: 'power',
    priority: 'essential',
    estimated_cost: 2800,
    time_required_hours: 8,
    diy_feasible: true,
    description: 'LiFePO4 battery bank for energy storage with BMS',
    vendor_links: [
      { name: 'Battle Born', url: 'https://www.battlebornnatteries.com' },
      { name: 'Renogy', url: 'https://www.renogy.com' },
    ],
  },
  {
    name: 'Inverter 2000W Pure Sine',
    category: 'power',
    priority: 'important',
    estimated_cost: 1200,
    time_required_hours: 6,
    diy_feasible: true,
    description: 'Pure sine wave inverter for running AC appliances',
    vendor_links: [
      { name: 'Victron', url: 'https://www.victronenergy.com' },
    ],
  },
  {
    name: 'Battery Monitor/Shunt',
    category: 'power',
    priority: 'important',
    estimated_cost: 300,
    time_required_hours: 4,
    diy_feasible: true,
    description: 'Battery monitor to track power consumption and state of charge',
    dependencies: ['Lithium Battery Bank (200Ah)'],
  },

  // Water Systems
  {
    name: 'Water Filtration System',
    category: 'water',
    priority: 'essential',
    estimated_cost: 800,
    time_required_hours: 8,
    diy_feasible: true,
    description: 'Dual-stage water filter for safe drinking water from any source',
    vendor_links: [
      { name: 'Berkey', url: 'https://www.berkeyfilters.com' },
    ],
  },
  {
    name: 'Fresh Water Tank (100L)',
    category: 'water',
    priority: 'essential',
    estimated_cost: 600,
    time_required_hours: 12,
    diy_feasible: true,
    description: 'Freshwater storage tank with level sensors',
  },
  {
    name: 'Hot Water Heater',
    category: 'water',
    priority: 'important',
    estimated_cost: 1500,
    time_required_hours: 10,
    diy_feasible: true,
    description: 'On-demand propane or diesel water heater for hot showers',
  },
  {
    name: 'Gray Water Tank',
    category: 'water',
    priority: 'essential',
    estimated_cost: 500,
    time_required_hours: 10,
    diy_feasible: true,
    description: 'Gray water holding tank for sink/shower drainage',
  },

  // Comfort Systems
  {
    name: 'Diesel Heater (5kW)',
    category: 'comfort',
    priority: 'important',
    estimated_cost: 1200,
    time_required_hours: 12,
    diy_feasible: true,
    description: 'Chinese diesel heater (Espar/Webasto style) for cold weather camping',
    vendor_links: [
      { name: 'Amazon', url: 'https://www.amazon.com/s?k=diesel+heater' },
    ],
  },
  {
    name: 'Roof Vent Fan',
    category: 'comfort',
    priority: 'important',
    estimated_cost: 400,
    time_required_hours: 6,
    diy_feasible: true,
    description: 'MaxxFan or similar for ventilation and cooling',
    vendor_links: [
      { name: 'MaxxAir', url: 'https://www.maxxair.com' },
    ],
  },
  {
    name: 'Insulation Upgrade',
    category: 'comfort',
    priority: 'important',
    estimated_cost: 800,
    time_required_hours: 40,
    diy_feasible: true,
    description: 'Spray foam or rigid foam insulation for temperature control',
  },
  {
    name: 'Portable AC Unit',
    category: 'comfort',
    priority: 'nice-to-have',
    estimated_cost: 600,
    time_required_hours: 2,
    diy_feasible: true,
    description: 'Small portable AC for extreme heat',
    dependencies: ['Inverter 2000W Pure Sine', 'Solar Panel System (400W)'],
  },

  // Safety & Recovery
  {
    name: 'MaxTrax Recovery Boards',
    category: 'safety',
    priority: 'essential',
    estimated_cost: 350,
    time_required_hours: 1,
    diy_feasible: false,
    description: 'Recovery boards for getting unstuck in sand, mud, or snow',
    vendor_links: [
      { name: 'MaxTrax', url: 'https://www.maxtrax.com' },
    ],
  },
  {
    name: 'Hi-Lift Jack',
    category: 'safety',
    priority: 'essential',
    estimated_cost: 200,
    time_required_hours: 2,
    diy_feasible: false,
    description: 'High-lift jack for vehicle recovery and tire changes',
  },
  {
    name: 'Fire Extinguisher (ABC)',
    category: 'safety',
    priority: 'essential',
    estimated_cost: 80,
    time_required_hours: 1,
    diy_feasible: false,
    description: 'ABC-rated fire extinguisher mounted in cabin',
  },
  {
    name: 'First Aid Kit (Comprehensive)',
    category: 'safety',
    priority: 'essential',
    estimated_cost: 150,
    time_required_hours: 1,
    diy_feasible: false,
    description: 'Comprehensive first aid kit for remote travel',
  },
  {
    name: 'Snatch Strap & Shackles',
    category: 'safety',
    priority: 'essential',
    estimated_cost: 180,
    time_required_hours: 1,
    diy_feasible: false,
    description: 'Recovery straps and rated shackles for vehicle extraction',
  },
  {
    name: 'Tire Repair Kit',
    category: 'safety',
    priority: 'important',
    estimated_cost: 120,
    time_required_hours: 1,
    diy_feasible: false,
    description: 'Plug kit and air compressor for tire repairs',
  },

  // Storage Solutions
  {
    name: 'Roof Rack System',
    category: 'storage',
    priority: 'important',
    estimated_cost: 2500,
    time_required_hours: 20,
    diy_feasible: false,
    description: 'Heavy-duty roof rack for storage and rooftop tent mounting',
    vendor_links: [
      { name: 'Front Runner', url: 'https://www.frontrunneroutfitters.com' },
      { name: 'Rhino-Rack', url: 'https://www.rhinorack.com' },
    ],
  },
  {
    name: 'Drawer System',
    category: 'storage',
    priority: 'important',
    estimated_cost: 1800,
    time_required_hours: 30,
    diy_feasible: true,
    description: 'Custom drawer system for organized gear storage',
  },
  {
    name: 'Jerry Can Holders',
    category: 'storage',
    priority: 'important',
    estimated_cost: 300,
    time_required_hours: 4,
    diy_feasible: true,
    description: 'Secure mounting for fuel/water jerry cans',
  },

  // Exterior Modifications
  {
    name: 'LED Light Bar',
    category: 'exterior',
    priority: 'important',
    estimated_cost: 450,
    time_required_hours: 6,
    diy_feasible: true,
    description: 'LED light bar for night driving and camp illumination',
  },
  {
    name: 'Awning',
    category: 'exterior',
    priority: 'nice-to-have',
    estimated_cost: 1200,
    time_required_hours: 8,
    diy_feasible: true,
    description: '270° or side awning for outdoor living space',
    vendor_links: [
      { name: 'ARB', url: 'https://www.arbusa.com' },
    ],
  },
  {
    name: 'Rock Sliders',
    category: 'exterior',
    priority: 'important',
    estimated_cost: 1500,
    time_required_hours: 6,
    diy_feasible: false,
    description: 'Steel rock sliders for body protection on trails',
  },
  {
    name: 'Mud Flaps',
    category: 'exterior',
    priority: 'nice-to-have',
    estimated_cost: 150,
    time_required_hours: 2,
    diy_feasible: true,
    description: 'Heavy-duty mud flaps to protect paintwork',
  },
];

// Helper function to get mods by category
export const getModsByCategory = (category: string) => {
  return COMMON_VEHICLE_MODS.filter(mod => mod.category === category);
};

// Helper function to get essential mods
export const getEssentialMods = () => {
  return COMMON_VEHICLE_MODS.filter(mod => mod.priority === 'essential');
};

// Helper function to estimate total cost for all essential mods
export const getEssentialModsCost = () => {
  return getEssentialMods().reduce((sum, mod) => sum + mod.estimated_cost, 0);
};
