import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import jlgGreen from "@/assets/plat-jlg-green.jpg";
import jlgOrange from "@/assets/plat-jlg-orange.jpg";
import genieBlue from "@/assets/plat-genie-blue.jpg";
import haulotteYellow from "@/assets/plat-haulotte-yellow.jpg";
import cfptRed from "@/assets/plat-cfpt-red.jpg";

export type Platform = {
  id: string; number: string; model: string; catalog_key: string;
  base_height: string | null; work_height: string | null; stowed_size: string | null;
  weight: string | null; color: string | null; serial: string | null;
  location: string | null; status: string; notes: string | null; updated_at: string;
};

export const platformsQuery = queryOptions({
  queryKey: ["platforms"],
  queryFn: async () => {
    const { data, error } = await supabase.from("platforms").select("*").order("number");
    if (error) throw error;
    return data as Platform[];
  },
});

export type CatalogEntry = {
  maker: string; origin: string; kind: string; about: string;
  highlights: string[]; capacity: string;
};

/** Model "catalog": manufacturer facts researched from official spec sheets. */
export const CATALOG: Record<string, CatalogEntry> = {
  "jlg-1932e": {
    maker: "JLG Industries", origin: "Estados Unidos", kind: "Tesoura elétrica estreita",
    about: "Plataforma compacta para trabalho interno em piso firme. Passa por portas comuns e corredores apertados.",
    highlights: ["Bateria 24 V, operação silenciosa e sem fumaça", "Extensão de plataforma deslizante", "Pneus que não marcam o piso", "Duas velocidades de deslocamento"],
    capacity: "227 kg (2 pessoas)",
  },
  "jlg-2630es": {
    maker: "JLG Industries", origin: "Estados Unidos", kind: "Tesoura elétrica série ES",
    about: "Linha ES com tração elétrica: poucas mangueiras hidráulicas, menos vazamentos e mais tempo de bateria.",
    highlights: ["76 cm de largura: passa em porta de 81 cm", "Guarda-corpo dobrável", "Sensor de nivelamento e proteção contra buracos", "Sobe rampas de até 25%"],
    capacity: "363 kg",
  },
  "genie-gs2646": {
    maker: "Genie (Terex)", origin: "Estados Unidos", kind: "Tesoura elétrica E-Drive",
    about: "Uso interno e externo em piso nivelado. Motor elétrico AC com grande autonomia por carga.",
    highlights: ["Extensão de plataforma de 0,91 m", "Giro com raio interno zero", "Controle Smart Link", "Sobe rampas de até 25%"],
    capacity: "454 kg",
  },
  "jlg-2658e": {
    maker: "JLG Industries", origin: "Estados Unidos", kind: "Tesoura elétrica de base larga",
    about: "Deck mais largo (1,47 m), com espaço para dois operadores e ferramentas. Mais estável em altura.",
    highlights: ["Plataforma larga com extensão", "Operação elétrica silenciosa", "Pneus que não marcam o piso", "Indicada para instalações elétricas e calhas"],
    capacity: "340 kg",
  },
  "genie-gs3246": {
    maker: "Genie (Terex)", origin: "Estados Unidos", kind: "Tesoura elétrica E-Drive",
    about: "O modelo mais alto da linha compacta Genie: quase 12 m de trabalho em uma máquina que passa por portas duplas.",
    highlights: ["Extensão de plataforma de 0,91 m", "Protetores contra buracos", "Sensor de inclinação com alarme", "Raio interno de giro zero"],
    capacity: "318 kg",
  },
  "haulotte-compact12": {
    maker: "Haulotte Group", origin: "França", kind: "Tesoura elétrica Compact",
    about: "Plataforma europeia robusta, feita para uso interno e externo com a mesma capacidade de carga.",
    highlights: ["Base de 1,20 m", "Pode andar com a cesta no alto", "Bateria 24 V / 340 Ah: ciclos longos", "Fácil manutenção"],
    capacity: "300 kg",
  },
  "cfpt-1416": {
    maker: "Shandong Chufeng (矗峰重工)", origin: "China", kind: "Tesoura autopropelida pesada",
    about: "A nossa plataforma de maior alcance. Máquina pesada, com plataforma longa de 2,64 m para trabalhos altos.",
    highlights: ["Motor de elevação 24 V / 3,3 kW", "Plataforma 2,64 x 1,13 m", "Estrutura de vários estágios", "Indicada para galpões altos"],
    capacity: "230 kg",
  },
};

const BY_COLOR: Record<string, string> = { verde: jlgGreen, laranja: jlgOrange, azul: genieBlue, amarela: haulotteYellow, vermelha: cfptRed };
export function platformImage(p: Pick<Platform, "color">) {
  return BY_COLOR[(p.color ?? "").trim().toLowerCase()] ?? jlgOrange;
}
