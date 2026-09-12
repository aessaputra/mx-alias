export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

const invalid = (message: string): ValidationResult => ({ ok: false, message });

export const normalizeAlias = (value: string): string =>
  value.trim().toLowerCase();

export function validateAlias(value: string): ValidationResult {
  const alias = normalizeAlias(value);
  return /^[a-z0-9._-]{1,64}$/.test(alias)
    ? { ok: true, value: alias }
    : invalid("Alias must be 1-64 lowercase letters, numbers, dots, underscores, or hyphens");
}

export function validateDestination(value: string): ValidationResult {
  const destination = value.trim();
  const validAddress = /^[^\s@<>:,.]+(?:\.[^\s@<>:,.]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

  if (
    destination.length > 254 ||
    /[\x00-\x1f\x7f]/.test(value) ||
    destination === ":fail:" ||
    destination === ":blackhole:" ||
    !validAddress.test(destination)
  ) {
    return invalid("Destination must be one valid email address");
  }

  return { ok: true, value: destination };
}

export function validateDomain(
  value: string,
  allowed: readonly string[],
): ValidationResult {
  const domain = value.trim().toLowerCase();
  return allowed.includes(domain)
    ? { ok: true, value: domain }
    : invalid("Domain is not allowed");
}

// ponytail: exact lowercase match only, no wildcard/subdomain support. Upgrade to glob when needed.
export function filterDisallowed(
  domains: readonly string[],
  disallowed: readonly string[],
): string[] {
  const denied = new Set(disallowed.map((domain) => domain.toLowerCase()));
  return domains.filter((domain) => !denied.has(domain.toLowerCase()));
}

export function resolveActiveDomain(
  requested: string | undefined,
  domains: readonly string[],
): string | undefined {
  const selected = requested ? validateDomain(requested, domains) : undefined;
  return selected?.ok ? selected.value : domains[0];
}
