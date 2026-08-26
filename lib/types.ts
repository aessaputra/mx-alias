export type Forwarder = Readonly<{
  alias: string;
  email: string;
  destinations: string[];
}>;

export type MxrouteErrorKind =
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server"
  | "timeout"
  | "network"
  | "invalid_response";
