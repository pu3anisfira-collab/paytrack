export interface VehicleClassConfig {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  code: string;
  name: string;
  category: 'car' | 'motorcycle';
  engineCapacity: string;
  rateSen: number;
  rateRm: number;
  label: string;
  examples: string[];
}

export const VEHICLE_CLASSES: VehicleClassConfig[] = [
  {
    id: 'A',
    code: 'Class A',
    name: 'Class A - 1400 cc and above',
    category: 'car',
    engineCapacity: '1400 cc and above',
    rateSen: 85,
    rateRm: 0.85,
    label: 'Class A - 1400 cc and above (RM 0.85/km)',
    examples: ['Toyota Vios', 'Honda City', 'Proton Saga 1.5L', 'Perodua Myvi 1.5L', 'Honda Civic', 'Toyota Corolla'],
  },
  {
    id: 'B',
    code: 'Class B',
    name: 'Class B - 1000 cc and above',
    category: 'car',
    engineCapacity: '1000 cc and above',
    rateSen: 75,
    rateRm: 0.75,
    label: 'Class B - 1000 cc and above (RM 0.75/km)',
    examples: ['Perodua Myvi 1.3L', 'Perodua Bezza 1.3L', 'Perodua Axia 1.0L', 'Proton Saga 1.3L', 'Perodua Alza 1.3L'],
  },
  {
    id: 'C',
    code: 'Class C',
    name: 'Class C - Below 1000 cc',
    category: 'car',
    engineCapacity: 'Below 1000 cc',
    rateSen: 65,
    rateRm: 0.65,
    label: 'Class C - Below 1000 cc (RM 0.65/km)',
    examples: ['Perodua Kancil 660/850', 'Perodua Viva 850cc', 'Perodua Kelisa 850cc', 'Kia Picanto 1.0L'],
  },
  {
    id: 'D',
    code: 'Class D',
    name: 'Class D - Not less than 175 cc',
    category: 'motorcycle',
    engineCapacity: 'Not less than 175 cc',
    rateSen: 60,
    rateRm: 0.60,
    label: 'Class D - Not less than 175 cc (RM 0.60/km)',
    examples: ['Yamaha Y15ZR', 'Honda RS150R', 'Kawasaki Ninja 250', 'Yamaha R25', 'Honda CBR250R'],
  },
  {
    id: 'E',
    code: 'Class E',
    name: 'Class E - Below 175 cc',
    category: 'motorcycle',
    engineCapacity: 'Below 175 cc',
    rateSen: 55,
    rateRm: 0.55,
    label: 'Class E - Below 175 cc (RM 0.55/km)',
    examples: ['Honda EX5', 'Yamaha LC135', 'Modenas Kriss', 'Honda Wave', 'Sym Bonus'],
  },
];

export function getVehicleClassById(id: string): VehicleClassConfig {
  const found = VEHICLE_CLASSES.find((c) => c.id === id || c.code === id);
  return found || VEHICLE_CLASSES[0];
}

export function calculateMileageClaim(distanceKm: number, rateRm: number): number {
  return Math.round(distanceKm * rateRm * 100) / 100;
}
