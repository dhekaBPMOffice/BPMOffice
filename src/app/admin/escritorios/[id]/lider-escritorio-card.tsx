"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil, KeyRound, Trash2 } from "lucide-react";
import { CadastrarLiderForm } from "./cadastrar-lider-form";
import { EditarLiderForm, type LeaderData } from "./editar-lider-form";
import { RedefinirSenhaForm } from "./redefinir-senha-form";
import { deleteLeader } from "@/app/admin/escritorios/actions";

interface LiderEscritorioCardProps {
  officeId: string;
  leaders: LeaderData[];
  activeLeaderCount: number;
}

export function LiderEscritorioCard({ officeId, leaders, activeLeaderCount }: LiderEscritorioCardProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingLeader, setEditingLeader] = useState<LeaderData | null>(null);
  const [resettingLeader, setResettingLeader] = useState<LeaderData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(leader: LeaderData) {
    if (!confirm(`Tem certeza que deseja excluir o líder "${leader.full_name}"? Esta ação não pode ser desfeita e o usuário perderá o acesso ao sistema.`)) {
      return;
    }
    setDeletingId(leader.id);
    const result = await deleteLeader(leader.id, officeId);
    setDeletingId(null);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? "Erro ao excluir líder.");
    }
  }

  if (showForm) {
    return (
      <CadastrarLiderForm
        officeId={officeId}
        onSuccess={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {leaders.length > 0 ? (
        <ul className="space-y-3">
          {leaders.map((leader) => (
            <li
              key={leader.id}
              className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{leader.full_name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {leader.email}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLeader(leader)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResettingLeader(leader)}
                    title="Redefinir senha"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(leader)}
                    disabled={deletingId === leader.id || activeLeaderCount <= 1}
                    title="Excluir"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum líder cadastrado.</p>
      )}

      <Button
        type="button"
        variant={leaders.length > 0 ? "outline" : "default"}
        size={leaders.length > 0 ? "sm" : "default"}
        onClick={() => setShowForm(true)}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {leaders.length > 0 ? "Adicionar outro líder" : "Cadastrar líder"}
      </Button>

      {editingLeader && (
        <EditarLiderForm
          officeId={officeId}
          leader={editingLeader}
          open={!!editingLeader}
          onOpenChange={(open) => !open && setEditingLeader(null)}
        />
      )}
      {resettingLeader && (
        <RedefinirSenhaForm
          officeId={officeId}
          profileId={resettingLeader.id}
          leaderName={resettingLeader.full_name}
          open={!!resettingLeader}
          onOpenChange={(open) => !open && setResettingLeader(null)}
        />
      )}
    </div>
  );
}
