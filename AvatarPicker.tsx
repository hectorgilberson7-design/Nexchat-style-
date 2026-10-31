import { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { validateAvatarFile } from '@/lib/avatarService';

type Props = {
  initials: string;
  src: string | null;
  busy: boolean;
  onSelect: (file: File) => void;
  onError: (message: string) => void;
};

export default function AvatarPicker({ initials, src, busy, onSelect, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (file: File | undefined) => {
    if (!file) return;
    const problem = validateAvatarFile(file);
    if (problem) {
      onError(problem);
      return;
    }
    onSelect(file);
  };

  return (
    <div className="relative">
      <Avatar initials={initials} src={src} size="lg" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Changer la photo"
        className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-nc-cyan text-nc-bg shadow-neon transition-all duration-200 hover:scale-105 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handleChange(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
