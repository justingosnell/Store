import postgres from "postgres";
import fs from "fs";
import { resolveDatabase } from "./server/ipv4-resolver";

async function applySchemaFix() {
  console.log("🔧 Applying schema fix to users table...\n");
  
  // Resolve DATABASE_URL hostname to IPv4
  const resolvedUrl = await resolveDatabase();
  
  // Create connection with resolved IPv4 address
  const sql = postgres(resolvedUrl, {
    ssl: { rejectUnauthorized: false },
  });
  
    try {
      // Read the SQL file
      const fixSql = fs.readFileSync("./fix-schema.sql", "utf-8");
      
      // Split by newlines and execute each statement
      const statements = fixSql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        await sql.unsafe(statement);
      }

      console.log("\n✅ Schema fix applied successfully!");
      console.log("✅ All missing columns have been added to users table\n");
      
      // Verify the columns exist
      const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY column_name;
      `;
      
      console.log("Users table columns:");
      result.forEach(row => console.log(`  - ${row.column_name}`));
      
    } catch (error) {
      console.error("❌ Error applying schema fix:", error);
      process.exit(1);
    } finally {
      await sql.end();
    }
  }

// Run the schema fix
applySchemaFix().catch(error => {
  console.error("❌ Failed to apply schema fix:", error);
  process.exit(1);
});