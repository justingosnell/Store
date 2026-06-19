import { spawn } from "child_process";

async function resolveAndStart() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log("DATABASE_URL not set, starting normally...");
    startApp();
    return;
  }
  
  // Skip DNS resolution - let postgres handle it with NODE_OPTIONS flag
  // Attempting DNS resolution can fail with ENODATA on Render infrastructure
  console.log("🚀 Starting app (DNS resolution handled by postgres library)...\n");
  startApp();
}


function startApp() {
  // Start npm start as a child process with IPv4 preference
  const env = {
    ...process.env,
    NODE_OPTIONS: "--dns-result-order=ipv4first",
  };
  
  const proc = spawn("npm", ["start"], {
    stdio: "inherit",
    shell: true,
    env,
  });
  
  proc.on("exit", (code) => {
    process.exit(code || 0);
  });
}

resolveAndStart().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});