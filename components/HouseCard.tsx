import Card from '@/components/ui/Card';
import Image from 'next/image';

interface HouseCardProps {
  id: number;
  contractAddress: string;
  name: string;
  profileImageUrl: string;
  description: string | null;
  roundCount?: number;
  activeRoundCount?: number;
}

export default function HouseCard({
  contractAddress,
  name,
  profileImageUrl,
  description,
  roundCount = 0,
  activeRoundCount = 0,
}: HouseCardProps) {
  return (
    <Card href={`/houses/${contractAddress}`} className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-border-light flex-shrink-0">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-purple font-londrina text-xl">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-brand-black truncate">{name}</h3>
          {description && (
            <p className="text-sm text-brand-gray line-clamp-2 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-brand-black">{roundCount}</span>
          <span className="text-brand-gray">rounds</span>
        </div>
        {activeRoundCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green" />
            <span className="font-bold text-brand-green">{activeRoundCount}</span>
            <span className="text-brand-gray">active</span>
          </div>
        )}
      </div>
    </Card>
  );
}
