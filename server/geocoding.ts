/**
 * Geocoding service using OpenStreetMap Nominatim
 * Converts city/state to latitude/longitude coordinates
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE = new Map<string, { latitude: number; longitude: number }>();

// Add rate limiting to respect Nominatim's 1 request/second limit
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryGeocodeQuery(query: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Rate limiting - wait if needed
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }

    lastRequestTime = Date.now();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.append("q", query);
    url.searchParams.append("format", "json");
    url.searchParams.append("limit", "1");
    url.searchParams.append("countrycodes", "us,ca"); // Restrict to US and Canada

    console.log(`🌍 Trying geocoding query: ${query}`);
    console.log(`   URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "RoadsideMap/1.0",
      },
    });

    console.log(`   Response status: ${response.status}`);

    if (!response.ok) {
      console.warn(`⚠️ Geocoding API error: ${response.status} for ${query}`);
      return null;
    }

    const results = await response.json();
    console.log(`   Results count: ${Array.isArray(results) ? results.length : 'not array'}`);

    if (Array.isArray(results) && results.length > 0) {
      const result = results[0];
      const coords = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      };
      
      console.log(`   Raw coords: (${coords.latitude}, ${coords.longitude})`);
      console.log(`   US bounds check: ${isValidUSCoordinates(coords.latitude, coords.longitude)}`);

      // Validate coordinates
      if (
        !isNaN(coords.latitude) &&
        !isNaN(coords.longitude) &&
        coords.latitude >= -90 &&
        coords.latitude <= 90 &&
        coords.longitude >= -180 &&
        coords.longitude <= 180 &&
        isValidUSCoordinates(coords.latitude, coords.longitude)
      ) {
        console.log(`✅ Geocoded ${query}: (${coords.latitude}, ${coords.longitude})`);
        return coords;
      } else {
        console.warn(`⚠️ Invalid coordinates for ${query}: (${coords.latitude}, ${coords.longitude}) - not in valid US bounds`);
      }
    } else {
      console.log(`   No results in array for query: ${query}`);
    }

    return null;
  } catch (error) {
    console.error(`❌ Geocoding error for query ${query}:`, error);
    return null;
  }
}

export async function geocodeLocation(
  city: string,
  state: string,
  country: string = "USA"
): Promise<{ latitude: number; longitude: number } | null> {
  if (!city?.trim() || !state?.trim()) {
    console.warn(`⚠️ Missing city or state for geocoding: city="${city}", state="${state}"`);
    return null;
  }

  try {
    // Create cache key
    const cacheKey = `${city}|${state}|${country}`.toLowerCase();

    // Check cache first
    if (CACHE.has(cacheKey)) {
      const cached = CACHE.get(cacheKey);
      if (cached) {
        console.log(`✓ Cache hit for ${city}, ${state}`);
        return cached;
      }
    }

    // Try multiple query formats in order of preference
    const queries = [
      `${city}, ${state}, ${country}`,           // Full format
      `${city}, ${state}`,                       // City, State
      `${city} ${state}`,                        // City State (no comma)
      `${state}, ${country}`,                    // State, Country (fallback)
    ];

    for (const query of queries) {
      const result = await tryGeocodeQuery(query);
      if (result) {
        // Cache the result
        CACHE.set(cacheKey, result);
        return result;
      }
    }

    console.warn(`⚠️ No valid geocoding results found for ${city}, ${state} after trying ${queries.length} queries`);
    return null;
  } catch (error) {
    console.error(`❌ Geocoding error for ${city}, ${state}:`, error);
    return null;
  }
}

export function clearGeocodeCache(): void {
  CACHE.clear();
  console.log("🗑️ Geocode cache cleared");
}

export function getGeocodeCache(): Map<string, { latitude: number; longitude: number }> {
  return CACHE;
}

/**
 * Check if coordinates are within reasonable bounds for US/Canada locations
 * This helps detect geocoding errors that place markers in wrong continents
 */
export function isValidUSCoordinates(latitude: number, longitude: number): boolean {
  // US and Canada bounds
  const minLat = 18.0;  // Southern Florida
  const maxLat = 84.0;  // Northern Canada
  const minLon = -180.0; // Western Pacific
  const maxLon = -50.0;  // Eastern Atlantic

  return (
    latitude >= minLat &&
    latitude <= maxLat &&
    longitude >= minLon &&
    longitude <= maxLon &&
    // Exclude obvious non-US/Canada locations (e.g., Africa would be around 0,0 to 40,40)
    !(latitude >= -10 && latitude <= 40 && longitude >= -20 && longitude <= 50)
  );
}