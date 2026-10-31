import { useState } from 'react';

type Props = {
  initials: string;
  src?: string | null;
  online?: boolean;
  size?: 'md' | 'lg';
};

export default function Avatar({ initials, src, online = false, size = 'md' }: Props) {
  const [failed, setFailed] = useState(false);
  const dimension = size === 'lg' ? 'h-24 w-24 text-2xl' : 'h-12 w-12 text-sm';
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative shrink-0">
      <div
        className={`flex items-center justify-center overflow-hidden rounded-full bg-nc-raised font-semibold text-nc-muted ${dimension}`}
      >
        {showImage ? (
          <img
            src={src ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-nc-bg bg-nc-success" />
      )}
    </div>
  );
}
