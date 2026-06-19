const { defineConfig, loadEnv } = require("@medusajs/utils")

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:5173",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:3000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000,http://localhost:3000",
      jwtSecret: process.env.JWT_SECRET || "change-me-in-medusa-env",
      cookieSecret: process.env.COOKIE_SECRET || "change-me-in-medusa-env",
    },
  },
})
