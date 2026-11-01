export type DraftChecklistItem = { label: string; ok: boolean | null; note: string | null };

// Consolidated from every saved conference and its original message; logistics
// and mileage remain in their existing fields, not as approval points.
export const CHECKLIST_GROUPS = [
  { title: "Documentos, cartões e ferramentas", labels: ["Documento / CRLV", "Cartão de abastecimento", "Sem Parar", "Chave canivete", "Chave reserva", "Estepe", "Macaco", "Chave de roda", "Triângulo", "Cintas de amarração"] },
  { title: "Pneus e carroceria", labels: ["Pneu dianteiro esquerdo", "Pneu dianteiro direito", "Pneu traseiro esquerdo", "Pneu traseiro direito", "Lataria / pintura", "Rack", "Calha de chuva", "Vedação do veículo", "Caixa de ar"] },
  { title: "Luzes e sinalização", labels: ["Luz alta", "Luz baixa", "Luz de freio", "Luz de ré", "Luz da placa", "Luz interna", "Luzes do painel", "Lanternas traseiras", "Pisca / seta esquerda", "Pisca / seta direita", "Pisca-alerta", "Buzina"] },
  { title: "Vidros, portas e visibilidade", labels: ["Para-brisa", "Vidros laterais", "Vidro traseiro", "Retrovisores", "Vidros elétricos", "Botões dos vidros elétricos", "Máquina / módulo dos vidros", "Maçanetas internas", "Maçanetas externas", "Puxadores internos das portas", "Fechaduras", "Travas das portas", "Limpador / palhetas", "Esguicho do para-brisa", "Mangueira do esguicho", "Tampa do reservatório do esguicho"] },
  { title: "Interior e conforto", labels: ["Bancos", "Cintos de segurança", "Tapetes", "Quebra-sol", "Teto interno", "Rádio", "Ar-condicionado", "Limpeza / lavação"] },
  { title: "Motor, manutenção e combustível", labels: ["Óleo do motor", "Vazamento de óleo", "Água / aditivo do radiador", "Sistema de arrefecimento", "Bateria", "Correia dentada", "Filtro de ar", "Filtro de combustível", "Filtro de óleo", "Freios", "Direção / rolamento", "Motor de arranque", "Funcionamento do motor", "Câmbio", "Tanque / nível de combustível", "Consumo de combustível"] },
] as const;

export function checklistGroup(label: string): string {
  return CHECKLIST_GROUPS.find((group) => group.labels.some((value) => value === label))?.title ?? "Outros itens";
}

export function createManualItems(): DraftChecklistItem[] {
  return CHECKLIST_GROUPS.flatMap((group) => group.labels.map((label) => ({ label, ok: null, note: null })));
}

export function reviewedItems(items: DraftChecklistItem[]) {
  const pending = items.find((item) => item.ok === null);
  if (pending) throw new Error(`Marque OK ou X em: ${pending.label || "novo item"}`);
  return items.map((item) => ({ label: item.label, ok: item.ok === true, note: item.note }));
}