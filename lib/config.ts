export type AppConfig = Readonly<{
  mxrouteServer: string;
  mxrouteUsername: string;
  mxrouteApiKey: string;
  adminPassword: string;
  sessionSecret: string;
}>;

export class ConfigurationError extends Error {
  override name = "ConfigurationError";
}

const required = (env: NodeJS.ProcessEnv, key: string): string => {
  const value = env[key];
  if (!value) throw new ConfigurationError(`${key} is required`);
  return value;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = {
    mxrouteServer: required(env, "MXROUTE_SERVER"),
    mxrouteUsername: required(env, "MXROUTE_USERNAME"),
    mxrouteApiKey: required(env, "MXROUTE_API_KEY"),
    adminPassword: required(env, "ADMIN_PASSWORD"),
    sessionSecret: required(env, "SESSION_SECRET"),
  };

  if (config.sessionSecret.length < 32) {
    throw new ConfigurationError("SESSION_SECRET must be at least 32 characters");
  }

  return Object.freeze(config);
}
