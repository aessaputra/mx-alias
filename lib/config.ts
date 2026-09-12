export type OidcConfig = Readonly<{
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  allowedEmail: string;
}>;

export type AppConfig = Readonly<{
  mxrouteServer: string;
  mxrouteUsername: string;
  mxrouteApiKey: string;
  adminPassword: string;
  sessionSecret: string;
  disallowedDomains: readonly string[];
  oidc: OidcConfig | null;
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

  const oidcVars = {
    issuerUrl: env["OIDC_ISSUER_URL"],
    clientId: env["OIDC_CLIENT_ID"],
    clientSecret: env["OIDC_CLIENT_SECRET"],
    allowedEmail: env["OIDC_ALLOWED_EMAIL"],
  } as const;
  const provided = (Object.keys(oidcVars) as (keyof typeof oidcVars)[]).filter(
    (key) => oidcVars[key],
  );
  let oidc: OidcConfig | null = null;
  if (provided.length > 0) {
    const missing: Record<keyof typeof oidcVars, string> = {
      issuerUrl: "OIDC_ISSUER_URL",
      clientId: "OIDC_CLIENT_ID",
      clientSecret: "OIDC_CLIENT_SECRET",
      allowedEmail: "OIDC_ALLOWED_EMAIL",
    };
    for (const key of Object.keys(missing) as (keyof typeof missing)[]) {
      if (!oidcVars[key]) throw new ConfigurationError(`${missing[key]} is required`);
    }
    oidc = {
      issuerUrl: oidcVars.issuerUrl!.replace(/\/+$/, ""),
      clientId: oidcVars.clientId!,
      clientSecret: oidcVars.clientSecret!,
      allowedEmail: oidcVars.allowedEmail!,
    };
  }

  const disallowedDomains = Object.freeze(
    (env["DISALLOWED_DOMAINS"] ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter((domain) => domain.length > 0),
  );

  return Object.freeze({ ...config, disallowedDomains, oidc });
}
