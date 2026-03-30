import { redirect } from "next/navigation";

/** Evita criar escritório em duplicado ao atualizar ou favoritar esta URL; use o botão «Novo Escritório» na lista. */
export default async function NovoEscritorioRedirectPage() {
  redirect("/admin/escritorios");
}
