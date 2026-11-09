type ShareInput = {
  plate: string; model?: string | null; when: string; obra?: string | null;
  gestor?: string | null; employee?: string | null; km?: number | null;
  items: { label: string; ok: boolean; note?: string | null }[]; notes?: string | null;
};

/** Public EletroMW logo, shown as link preview at the end of the WhatsApp message. */
export const LOGO_URL =
  "https://fleet-handoff-hub.lovable.app/__l5e/assets-v1/2dd71ec1-f3d8-4008-9b00-3fe7ccc2e6ab/logo-eletromw.png";

/** WhatsApp text summary: header + only the failed points, so the team sees what needs attention. */
export function checklistWhatsAppText(c: ShareInput): string {
  const bad = c.items.filter((i) => !i.ok);
  const lines = [
    `🚗 *CHECKLIST*`,
    ``,
    `🔷 *PLACA: ${c.plate.toUpperCase()}* 🔷`,
    ...(c.model ? [`${c.model}`] : []),
    `━━━━━━━━━━━━━━`,
    `Data: ${c.when}`,
  ];
  if (c.obra) lines.push(`Obra: ${c.obra}`);
  if (c.gestor) lines.push(`Gestor: ${c.gestor}`);
  if (c.employee) lines.push(`Funcionário: ${c.employee}`);
  if (c.km != null) lines.push(`KM: ${c.km.toLocaleString("pt-BR")}`);
  lines.push("");
  if (bad.length) {
    lines.push(`*${bad.length} ${bad.length > 1 ? "itens reprovados" : "item reprovado"}:*`);
    bad.forEach((i) => lines.push(`❌ ${i.label}${i.note ? ` — _${i.note}_` : ""}`));
  } else {
    lines.push(c.items.length ? `✅ *Todos os ${c.items.length} itens OK*` : "Nenhum item marcado");
  }
  if (c.notes) lines.push("", `Obs: ${c.notes}`);
  lines.push("", "_Controle de Frota · EletroMW_", LOGO_URL);
  return lines.join("\n");
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
