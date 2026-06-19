import { promises as dns } from "dns";

// Helper to resolve with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

/**
 * Resolve a hostname to IPv4 address with retries and timeouts
 * This is critical for Render deployments which don't support IPv6
 * Returns null if resolution fails (will use hostname as-is)
 */
export async function resolveHostnameToIPv4(hostname: string): Promise<string | null> {
  console.log(`🔍 Resolving ${hostname} to IPv4...`);
  
  let lastError: Error | null = null;
  
  // Try up to 3 times with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Method 1: dns.lookup with family 4 (with 5s timeout)
      try {
        const result = await withTimeout(
          dns.lookup(hostname, { family: 4 }),
          5000,
          "dns.lookup"
        );
        console.log(`✅ Resolved to IPv4 via dns.lookup: ${result.address}`);
        return result.address;
      } catch (err) {
        lastError = err as Error;
        console.warn(`  Attempt ${attempt}: dns.lookup() failed - ${(err as Error).message}`);
      }
      
      // Method 2: dns.resolve4 (with 5s timeout)
      try {
        const addresses = await withTimeout(
          dns.resolve4(hostname),
          5000,
          "dns.resolve4"
        );
        if (addresses.length > 0) {
          console.log(`✅ Resolved to IPv4 via dns.resolve4: ${addresses[0]}`);
          return addresses[0];
        }
      } catch (err) {
        lastError = err as Error;
        console.warn(`  Attempt ${attempt}: dns.resolve4() failed - ${(err as Error).message}`);
      }
      
      // Method 3: dns.resolve with IPv4 filtering (with 5s timeout)
      try {
        const addresses = await withTimeout(
          dns.resolve(hostname),
          5000,
          "dns.resolve"
        );
        const ipv4Addresses = addresses.filter(addr => !addr.includes(':'));
        if (ipv4Addresses.length > 0) {
          console.log(`✅ Resolved to IPv4 via dns.resolve: ${ipv4Addresses[0]}`);
          return ipv4Addresses[0];
        }
      } catch (err) {
        lastError = err as Error;
        console.warn(`  Attempt ${attempt}: dns.resolve() failed - ${(err as Error).message}`);
      }
      
      // Wait before retry
      if (attempt < 3) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err) {
      lastError = err as Error;
    }
  }
  
  // If we get here, all methods failed - return null to signal fallback
  console.warn(`⚠️  Failed to resolve ${hostname} to IPv4 after 3 attempts`);
  if (lastError) {
    console.warn(`Last error: ${lastError.message}`);
  }
  return null;
}

/**
 * Replace hostname in DATABASE_URL with IPv4 address
 * Falls back to using hostname if resolution fails (relying on --dns-result-order=ipv4first)
 */
export async function resolveDatabase(): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const urlObj = new URL(databaseUrl);
  const hostname = urlObj.hostname;
  
  if (!hostname) {
    throw new Error("Could not extract hostname from DATABASE_URL");
  }
  
  // Check if it's already an IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    console.log(`✅ DATABASE_URL already has IPv4 address: ${hostname}`);
    return databaseUrl;
  }
  
  // Try to resolve hostname to IPv4
  const ipv4 = await resolveHostnameToIPv4(hostname);
  
  if (ipv4) {
    // Replace hostname with IPv4 in DATABASE_URL
    const resolvedUrl = databaseUrl.replace(hostname, ipv4);
    console.log(`✅ DATABASE_URL updated with IPv4 address`);
    return resolvedUrl;
  } else {
    // If DNS resolution fails, return the original URL
    // The --dns-result-order=ipv4first flag will try to prefer IPv4
    console.warn(`⚠️  Could not resolve hostname via DNS, using hostname as-is`);
    console.warn(`    Hostname: ${hostname}`);
    console.warn(`    The --dns-result-order=ipv4first flag will attempt to prefer IPv4`);
    return databaseUrl;
  }
}