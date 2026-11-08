// Comprueba que el plugin MCP de Sweet Home 3D responde y cuánto catálogo ve.
// Uso:  node scripts/smoke-test.mjs
// Sweet Home 3D tiene que estar abierto (el servidor vive dentro de la app).

import { Sh3dMcpClient } from "./mcp-client.mjs";

const c = new Sh3dMcpClient();

const health = await c.health();
console.log(`GET /health → ${health.status} ${health.body}`);

const init = await c.initialize("sh3d-mcp-smoke-test");
console.log(`initialize → protocolo ${init.protocolVersion}, servidor ${init.serverInfo.name} ${init.serverInfo.version}`);
console.log(`sesión: ${c.sessionId}`);

const tools = await c.listTools();
console.log(`tools/list → ${tools.length} herramientas`);
console.log("  " + tools.map((t) => t.name).sort().join(", "));

const cats = await c.call("list_categories", {});
const total = cats.data?.totalItems ?? "?";
console.log(`list_categories → ${total} piezas en el catálogo`);
if (total === 0) {
  console.log("  Catálogo vacío. En la versión de Microsoft Store esto es lo esperado:");
  console.log("  place_furniture y place_door_or_window no van a funcionar; usa generate_shape.");
}

const state = await c.call("get_state", {});
const s = state.data;
console.log(`get_state → ${s.wallCount} paredes, ${s.roomCount} habitaciones, ${s.furnitureCount} piezas, ${s.labelCount} etiquetas`);
