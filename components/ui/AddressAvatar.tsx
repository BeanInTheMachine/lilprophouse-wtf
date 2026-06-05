interface AddressAvatarProps {
  address: string;
  size?: number;
  className?: string;
}

const COLORS = ['#8a2be2', '#e02ecf', '#cba727', '#50ba9a', '#e02e2e', '#666666'];

function hashAddress(addr: string): number {
  let hash = 0;
  for (let i = 2; i < addr.length; i++) {
    hash = ((hash << 5) - hash + addr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export default function AddressAvatar({ address, size = 40, className = '' }: AddressAvatarProps) {
  const addr = address.toLowerCase();
  const hash = hashAddress(addr);
  const color = COLORS[hash % COLORS.length];
  const fontSize = Math.max(size / 2.5, 12);

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize }}
    >
      {addr.slice(2, 4).toUpperCase()}
    </div>
  );
}
