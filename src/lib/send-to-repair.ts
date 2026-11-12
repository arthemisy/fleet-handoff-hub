import { supabase } from "@/integrations/supabase/client";
import { normPlate } from "./fleet";

/** Sends a car to the mechanic: marks it "in" with the shop name and opens a repair period. */
export async function sendVehicleToRepair(plate: string, shop: string, day = new Date().toLocaleDateString("sv-SE")) {
  const { data: vs, error: e1 } = await supabase.from("vehicles").select("id, plate");
  if (e1) throw e1;
  const v = vs?.find((x) => normPlate(x.plate) === normPlate(plate));
  if (!v) throw new Error("Placa não encontrada na frota");
  const { error } = await supabase.from("vehicles").update({ mechanic_manual: "in", mechanic_shop: shop, mechanic_changed_at: new Date().toISOString(), mechanic_since: day }).eq("id", v.id);
  if (error) throw error;
  const { data: open } = await supabase.from("mechanic_visits").select("id, plate").is("end_date", null);
  if (!open?.some((x) => normPlate(x.plate) === normPlate(plate)))
    await supabase.from("mechanic_visits").insert({ plate: v.plate, start_date: day, shop });
}
