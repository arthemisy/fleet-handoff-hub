import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Frota · EletroMW" },
      { name: "description", content: "Gestores, veículos, checklists e gastos da frota EletroMW em tempo real." },
      { property: "og:title", content: "Controle de Frota · EletroMW" },
      { property: "og:description", content: "Gestores, veículos, checklists e gastos da frota EletroMW." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
