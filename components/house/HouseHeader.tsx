import Image from 'next/image';

interface HouseHeaderProps {
  name: string;
  profileImageUrl: string;
  description: string | null;
  contractAddress: string;
  roundCount?: number;
  activeRoundCount?: number;
}

export default function HouseHeader({
  name,
  profileImageUrl,
  description,
  roundCount = 0,
  activeRoundCount = 0,
}: HouseHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-5">
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-border-light flex-shrink-0">
        {profileImageUrl ? (
          <Image src={profileImageUrl} alt={name} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-purple font-londrina text-2xl">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <div>
        <h1 className="font-londrina text-3xl text-brand-black mb-2">{name}</h1>
        {description && (
          <p className="text-brand-gray leading-relaxed max-w-2xl">{description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span>
            <span className="font-bold text-brand-black">{roundCount}</span>{' '}
            <span className="text-brand-gray">rounds</span>
          </span>
          {activeRoundCount > 0 && (
            <span>
              <span className="w-2 h-2 inline-block rounded-full bg-brand-green mr-1" />
              <span className="font-bold text-brand-green">{activeRoundCount}</span>{' '}
              <span className="text-brand-gray">active</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
