import http from "node:http";

const VALID_SERVER = "test-server";
const VALID_USERNAME = "test-user";
const VALID_API_KEY = "test-api-key-12345678";

type Forwarder = { alias: string; email: string; destinations: string[] };

const state = {
  domains: ["example.com", "mail.example.org"] as string[],
  forwarders: new Map<string, Forwarder[]>(),
};

function resetState() {
  state.domains = ["example.com", "mail.example.org"];
  state.forwarders.clear();
}

function checkAuth(req: http.IncomingMessage): boolean {
  return (
    req.headers["x-server"] === VALID_SERVER &&
    req.headers["x-username"] === VALID_USERNAME &&
    req.headers["x-api-key"] === VALID_API_KEY
  );
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function decodePath(url: string): string {
  return decodeURIComponent(url.split("?")[0]);
}

export function createMockServer(): http.Server {
  resetState();

  const server = http.createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const rawUrl = req.url ?? "/";
    const path = decodePath(rawUrl);

    // OPTIONS passthrough for CORS/CSRF tests
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "http://evil.example.com",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      return res.end();
    }

    if (!checkAuth(req)) return sendJson(res, 401, { success: false, message: "Unauthorized" });

    // GET /domains
    if (method === "GET" && path === "/domains") {
      return sendJson(res, 200, { success: true, data: state.domains });
    }

    // GET /domains/:domain/forwarders
    const listMatch = path.match(/^\/domains\/([^/]+)\/forwarders$/);
    if (method === "GET" && listMatch) {
      const domain = decodeURIComponent(listMatch[1]);
      const forwarders = state.forwarders.get(domain) ?? [];
      return sendJson(res, 200, { success: true, data: forwarders });
    }

    // POST /domains/:domain/forwarders
    if (method === "POST" && listMatch) {
      const domain = decodeURIComponent(listMatch[1]);
      const body = JSON.parse(await readBody(req));
      const alias: string = body.alias;
      const destinations: string[] = body.destinations ?? [];

      const existing = state.forwarders.get(domain) ?? [];
      if (existing.some((f) => f.alias === alias)) {
        return sendJson(res, 409, { success: false, message: "Alias already exists" });
      }

      const forwarder: Forwarder = {
        alias,
        email: `${alias}@${domain}`,
        destinations,
      };
      state.forwarders.set(domain, [...existing, forwarder]);
      return sendJson(res, 200, { success: true });
    }

    // DELETE /domains/:domain/forwarders/:alias
    const deleteMatch = path.match(/^\/domains\/([^/]+)\/forwarders\/([^/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const domain = decodeURIComponent(deleteMatch[1]);
      const alias = decodeURIComponent(deleteMatch[2]);
      const existing = state.forwarders.get(domain) ?? [];
      const filtered = existing.filter((f) => f.alias !== alias);
      if (filtered.length === existing.length) {
        return sendJson(res, 404, { success: false, message: "Not found" });
      }
      state.forwarders.set(domain, filtered);
      return sendJson(res, 200, { success: true });
    }

    sendJson(res, 404, { success: false, message: "Not found" });
  });

  return server;
}

// CLI entry point: start mock server
if (process.argv[1]?.includes("mock-mxroute")) {
  const PORT = Number(process.env.MOCK_PORT) || 3099;
  const server = createMockServer();
  server.listen(PORT, () => {
    console.log(`Mock MXroute running on port ${PORT}`);
  });
}
