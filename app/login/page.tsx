import { loadConfig } from "@/lib/config";

import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}): Promise<React.JSX.Element> {
  const { error } = await searchParams;
  return <LoginForm oidcEnabled={loadConfig().oidc !== null} error={error} />;
}
