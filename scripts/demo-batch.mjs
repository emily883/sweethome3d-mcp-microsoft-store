// Dibuja una casita de dos cuartos en Sweet Home 3D usando solo herramientas
// que funcionan en la versión de Microsoft Store (sin catálogo de muebles):
// create_wall, connect_walls, create_room_polygon, generate_shape, add_label,
// add_dimension_line, save_home y export_plan_image.
//
// ⚠ Empieza con clear_scene: borra lo que tengas abierto. Guarda antes.
//
// Uso:
//   node scripts/demo-batch.mjs                                  (solo dibuja)
//   node scripts/demo-batch.mjs "C:\Users\TU_USUARIO\Documents\demo-mcp.sh3d"   (dibuja y guarda .sh3d + .png)

import { Sh3dMcpClient } from "./mcp-client.mjs";

const savePath = process.argv[2];
const c = new Sh3dMcpClient();
await c.initialize("sh3d-mcp-demo");

const H = 250; // alto de pared en cm

// Casita: 600 × 400 cm interiores, con un tabique a x=300 y una puerta de 90 en el tabique.
// Las coordenadas de create_wall son el eje central de la pared. Y crece hacia abajo.
const walls = [
  { name: "norte", xStart: -7.5, yStart: -7.5, xEnd: 607.5, yEnd: -7.5, thickness: 15 },
  { name: "este", xStart: 607.5, yStart: -7.5, xEnd: 607.5, yEnd: 407.5, thickness: 15 },
  { name: "sur", xStart: 607.5, yStart: 407.5, xEnd: -7.5, yEnd: 407.5, thickness: 15 },
  { name: "oeste", xStart: -7.5, yStart: 407.5, xEnd: -7.5, yEnd: -7.5, thickness: 15 },
  // tabique con hueco de puerta entre y=150 y y=240
  { name: "tabique_a", xStart: 300, yStart: 0, xEnd: 300, yEnd: 150, thickness: 10 },
  { name: "tabique_b", xStart: 300, yStart: 240, xEnd: 300, yEnd: 400, thickness: 10 },
];

let r = await c.call("clear_scene", {});
r = await c.call("batch_commands", {
  commands: walls.map(({ name, ...w }) => ({ action: "create_wall", params: { ...w, height: H } })),
});
const ids = Object.fromEntries(r.data.results.map((res, i) => [walls[i].name, res.data?.id]));
console.log(`paredes: ${r.data.succeeded}/${r.data.total}`);

// Esquinas limpias en el perímetro
await c.call("batch_commands", {
  commands: [
    ["norte", "este"], ["este", "sur"], ["sur", "oeste"], ["oeste", "norte"],
  ].map(([a, b]) => ({ action: "connect_walls", params: { wall1Id: ids[a], wall2Id: ids[b] } })),
});

r = await c.call("batch_commands", {
  commands: [
    // habitaciones con color de piso y área visible
    { action: "create_room_polygon", params: { name: "Sala", floorColor: "#F1EEE6", areaVisible: true,
      points: [{ x: 0, y: 0 }, { x: 295, y: 0 }, { x: 295, y: 400 }, { x: 0, y: 400 }] } },
    { action: "create_room_polygon", params: { name: "Cuarto", floorColor: "#ECE8F2", areaVisible: true,
      points: [{ x: 305, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 400 }, { x: 305, y: 400 }] } },

    // puerta: el hueco ya está en el tabique; la hoja abierta es una caja de 90 × 4 × 205
    { action: "generate_shape", params: { mode: "box", name: "Puerta 90 (hoja abierta)", width: 4, depth: 90, height: 205,
      x: 307, y: 195, color: "#C9A66B" } },

    // ventana: vidrio translúcido dentro del espesor de la pared norte, antepecho a 100
    { action: "generate_shape", params: { mode: "box", name: "Ventana 120 × 110", width: 120, depth: 6, height: 110,
      x: 150, y: -7.5, elevation: 100, color: "#9ECAE1", transparency: 0.45 } },

    // un mueble con medidas reales, como caja
    { action: "generate_shape", params: { mode: "box", name: "Escritorio 140 × 70 × 75", width: 140, depth: 70, height: 75,
      x: 450, y: 60, color: "#C8B48A" } },

    // cotas y etiquetas
    { action: "add_dimension_line", params: { xStart: 0, yStart: 0, xEnd: 600, yEnd: 0, offset: -40 } },
    { action: "add_dimension_line", params: { xStart: 0, yStart: 0, xEnd: 0, yEnd: 400, offset: 40 } },
    { action: "add_label", params: { text: "Demo dibujado por MCP · medidas en cm", x: 300, y: -70, fontSize: 24, bold: true } },
    { action: "add_label", params: { text: "puerta 90", x: 330, y: 195, fontSize: 12 } },
  ],
});
console.log(`habitaciones, puerta, ventana, mueble, cotas y textos: ${r.data.succeeded}/${r.data.total}`);
for (const res of r.data.results) if (res.status !== "ok") console.log("  falló:", res.action, res.message);

if (savePath) {
  const saved = await c.call("save_home", { filePath: savePath });
  console.log("save_home →", saved.data);
  const png = await c.call("export_plan_image", { filePath: savePath.replace(/\.sh3d$/i, "") + ".png", width: 1600 });
  console.log("export_plan_image →", png.data);
}
