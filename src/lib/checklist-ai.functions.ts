import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ParsedChecklist = {
  plate: string | null;
  model: string | null;
  responsible: string | null;
  obra: string | null;
  checked_at: string | null;
  km: number | null;
  next_belt_km: number | null;
  next_oil_km: number | null;
  items: { label: string; ok: boolean; note: string | null }[];
  notes: string | null;
};

const nul = (type: string) => ({ type: [type, "null"] });
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["plate", "model", "responsible", "obra", "checked_at", "km", "next_belt_km", "next_oil_km", "items", "notes"],
  properties: {
    plate: nul("string"),
    model: nul("string"),
    responsible: nul("string"),
    obra: nul("string"),
    checked_at: nul("string"),
    km: nul("integer"),
    next_belt_km: nul("integer"),
    next_oil_km: nul("integer"),
    notes: nul("string"),
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "ok", "note"],
        properties: { label: { type: "string" }, ok: { type: "boolean" }, note: nul("string") },
      },
    },
  },
};

const PROMPT = `Você lê checklists de conferência de veículos da empresa EletroMW (mensagens de WhatsApp, texto colado ou prints).
Extraia: placa (formato AAA-0000 ou AAA-0A00, maiúsculas com hífen), modelo do carro, responsável (RES./NOME), obra/destino, data e horário como texto, KM atual (inteiro, "308.000" = 308000), próxima troca de correia dentada e de óleo em KM (inteiros; "252.00" perto de 248.185 significa 252000).
Liste cada item conferido em "items": 🆗/OK/✅ = ok true; ⛔/🔴/❌/"pingando"/problema = ok false. Coloque marcas e detalhes (ex: "marca COMFORT", "trocado") em note.
Observações gerais (amassados, riscos, "OBS.") vão em notes. Use null para o que não existir.`;

export const parseChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; images: string[] }) => {
    if (typeof d.text !== "string" || d.text.length > 20000) throw new Error("Texto inválido");
    if (!Array.isArray(d.images) || d.images.length > 8) throw new Error("Máximo de 8 imagens");
    if (!d.text.trim() && d.images.length === 0) throw new Error("Cole o texto ou envie um print");
    d.images.forEach((i) => {
      if (typeof i !== "string" || !i.startsWith("data:image/")) throw new Error("Imagem inválida");
    });
    return d;
  })
  .handler(async ({ data }): Promise<ParsedChecklist> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Leitura automática não configurada");
    const content: Record<string, unknown>[] = [
      { type: "input_text", text: data.text.trim() ? `Mensagem do checklist:\n${data.text}` : "Leia o checklist das imagens." },
      ...data.images.map((url) => ({ type: "input_image", image_url: url })),
    ];
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: PROMPT,
        input: [{ role: "user", content }],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "checklist", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Muitas leituras agora, tente de novo em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
      console.error("AI gateway", res.status, body.slice(0, 500));
      throw new Error(`Não foi possível ler o checklist (${res.status}).`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed")
            throw new Error(ev.error?.message ?? ev.response?.error?.message ?? "Falha na leitura");
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
    if (!text.trim()) throw new Error("A leitura não retornou dados. Confira o print e tente outro.");
    return JSON.parse(text) as ParsedChecklist;
  });
