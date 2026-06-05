import Image from 'next/image';

interface HouseProfImgProps {
  name: string;
  profileImageUrl: string;
  size?: number;
  className?: string;
}

export default function HouseProfImg({ name, profileImageUrl, size = 56, className = '' }: HouseProfImgProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden bg-border-light flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {profileImageUrl ? (
        <Image src={profileImageUrl} alt={name} fill className="object-cover" sizes={`${size}px`} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-brand-purple font-londrina text-xl">
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}
