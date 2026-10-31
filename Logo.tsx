import { ShieldCheck } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nc-cyan text-nc-bg">
        <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="font-display text-xl font-bold tracking-wider text-nc-cyan">NEXCHAT</span>
    </div>
  );
}
