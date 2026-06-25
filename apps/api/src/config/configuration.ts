export default () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  database: {
    url: process.env.DATABASE_URL,
  },

  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? "change-me",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },

  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
  },

  chimege: {
    apiKey: process.env.CHIMEGE_API_KEY,
    apiUrl: process.env.CHIMEGE_API_URL,
  },

  mapbox: {
    secretToken: process.env.MAPBOX_SECRET_TOKEN,
  },

  weather: {
    apiKey: process.env.WEATHER_API_KEY,
    apiUrl: process.env.WEATHER_API_URL,
  },

  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
  },
});
