import { Radio, ServerCrash } from 'lucide-react';

export default function LivesView() {
  return (
    <div className="m-4 flex flex-col items-center gap-4 rounded-2xl bg-nc-surface p-6 text-center animate-fade-up">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-nc-cyan/10 text-nc-cyan">
        <Radio className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <p className="font-display text-base font-bold tracking-wide text-nc-text">Lives indisponibles</p>
        <p className="text-sm leading-relaxed text-nc-muted">
          La diffusion en direct demande un service vidéo dédié (serveur de diffusion). Ce service n'est pas encore
          raccordé à NexChat, donc aucun live ne peut être lancé ou rejoint pour le moment.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-nc-warning/40 px-3 py-1.5 text-xs font-medium text-nc-warning">
        <ServerCrash className="h-3.5 w-3.5" />
        Configuration serveur requise
      </div>
    </div>
  );
}
