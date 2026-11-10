// Cities offered for manual selection. Coordinates are city centres; each time zone is
// cross-checked against the zone AlAdhan derives from the coordinates by
// scripts/verify-live-apis.mjs.
export type SupportedLocation = { id: string; city: string; country: string; latitude: number; longitude: number; timezone: string };

export const supportedLocations: SupportedLocation[] = [
  { id: "karachi", city: "Karachi", country: "Pakistan", latitude: 24.8607, longitude: 67.0011, timezone: "Asia/Karachi" },
  { id: "lahore", city: "Lahore", country: "Pakistan", latitude: 31.5204, longitude: 74.3587, timezone: "Asia/Karachi" },
  { id: "islamabad", city: "Islamabad", country: "Pakistan", latitude: 33.6844, longitude: 73.0479, timezone: "Asia/Karachi" },
  { id: "peshawar", city: "Peshawar", country: "Pakistan", latitude: 34.0151, longitude: 71.5249, timezone: "Asia/Karachi" },
  { id: "quetta", city: "Quetta", country: "Pakistan", latitude: 30.1798, longitude: 66.975, timezone: "Asia/Karachi" },
  { id: "multan", city: "Multan", country: "Pakistan", latitude: 30.1575, longitude: 71.5249, timezone: "Asia/Karachi" },
  { id: "faisalabad", city: "Faisalabad", country: "Pakistan", latitude: 31.4504, longitude: 73.135, timezone: "Asia/Karachi" },
  { id: "makkah", city: "Makkah", country: "Saudi Arabia", latitude: 21.4225, longitude: 39.8262, timezone: "Asia/Riyadh" },
  { id: "madinah", city: "Madinah", country: "Saudi Arabia", latitude: 24.4672, longitude: 39.6111, timezone: "Asia/Riyadh" },
  { id: "riyadh", city: "Riyadh", country: "Saudi Arabia", latitude: 24.7136, longitude: 46.6753, timezone: "Asia/Riyadh" },
  { id: "dubai", city: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { id: "doha", city: "Doha", country: "Qatar", latitude: 25.2854, longitude: 51.531, timezone: "Asia/Qatar" },
  { id: "istanbul", city: "Istanbul", country: "Türkiye", latitude: 41.0082, longitude: 28.9784, timezone: "Europe/Istanbul" },
  { id: "cairo", city: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo" },
  { id: "delhi", city: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
  { id: "mumbai", city: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { id: "dhaka", city: "Dhaka", country: "Bangladesh", latitude: 23.8103, longitude: 90.4125, timezone: "Asia/Dhaka" },
  { id: "jakarta", city: "Jakarta", country: "Indonesia", latitude: -6.2088, longitude: 106.8456, timezone: "Asia/Jakarta" },
  { id: "kuala-lumpur", city: "Kuala Lumpur", country: "Malaysia", latitude: 3.139, longitude: 101.6869, timezone: "Asia/Kuala_Lumpur" },
  { id: "singapore", city: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { id: "london", city: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { id: "birmingham", city: "Birmingham", country: "United Kingdom", latitude: 52.4862, longitude: -1.8904, timezone: "Europe/London" },
  { id: "new-york", city: "New York", country: "United States", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { id: "chicago", city: "Chicago", country: "United States", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { id: "los-angeles", city: "Los Angeles", country: "United States", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { id: "toronto", city: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { id: "sydney", city: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
  { id: "lagos", city: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792, timezone: "Africa/Lagos" },
  { id: "johannesburg", city: "Johannesburg", country: "South Africa", latitude: -26.2041, longitude: 28.0473, timezone: "Africa/Johannesburg" },
];
