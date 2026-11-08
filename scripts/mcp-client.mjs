// Cliente mínimo para el plugin MCP de Sweet Home 3D (Streamable HTTP).
// Node 18 o más nuevo, sin dependencias.
//
// Variables de entorno opcionales:
//   SH3D_MCP_URL    por defecto http://127.0.0.1:9877
//   SH3D_MCP_TOKEN  solo si activaste "Require a token" en Tools → MCP Server

export class Sh3dMcpClient {
  constructor(baseUrl = process.env.SH3D_MCP_URL || "http://127.0.0.1:9877", token = process.env.SH3D_MCP_TOKEN) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
    this.sessionId = null;
    this.nextId = 1;
  }

  async health() {
    const r = await fetch(`${this.baseUrl}/health`);
    return { status: r.status, body: await r.text() };
  }

  async rpc(method, params = {}, { notification = false } = {}) {
    const body = { jsonrpc: "2.0", method, params };
    if (!notification) body.id = this.nextId++;
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const r = await fetch(`${this.baseUrl}/mcp`, { method: "POST", headers, body: JSON.stringify(body) });
    const sid = r.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    if (r.status === 401) throw new Error("401: el servidor pide token. Pásalo en SH3D_MCP_TOKEN.");
    if (notification) return null;

    const text = await r.text();
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("text/event-stream")) {
      // Cada evento trae "data: {...}". Nos quedamos con el último mensaje con id.
      const messages = text
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => JSON.parse(l.slice(5).trim()));
      return messages.find((m) => m.id !== undefined) ?? messages.at(-1);
    }
    return text ? JSON.parse(text) : null;
  }

  async initialize(clientName = "sh3d-mcp-scripts") {
    const res = await this.rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: clientName, version: "1.0.0" },
    });
    await this.rpc("notifications/initialized", {}, { notification: true });
    return res.result;
  }

  async listTools() {
    const res = await this.rpc("tools/list", {});
    return res.result.tools;
  }

  // Devuelve el contenido de texto de la herramienta ya parseado como JSON cuando se puede.
  async call(name, args = {}) {
    const res = await this.rpc("tools/call", { name, arguments: args });
    if (res.error) throw new Error(`${name}: ${res.error.message}`);
    const text = (res.result.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    let data = text;
    try { data = JSON.parse(text); } catch { /* texto plano */ }
    return { isError: Boolean(res.result.isError), data };
  }
}
