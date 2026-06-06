import Link from 'next/link';
import Button from '@/components/ui/Button';

interface HouseUtilityBarProps {
  houseId: number;
  houseAddress: string;
  showCreateRound?: boolean;
}

export default function HouseUtilityBar({ houseId, houseAddress, showCreateRound = false }: HouseUtilityBarProps) {
  return (
    <div className="flex items-center justify-between">
      <Link href={`/houses/${houseAddress}/manage`}>
        <Button variant="outline">Manage</Button>
      </Link>
      {showCreateRound && (
        <Link href={`/create/round?houseId=${houseId}`}>
          <Button variant="primary">Create Round</Button>
        </Link>
      )}
    </div>
  );
}
