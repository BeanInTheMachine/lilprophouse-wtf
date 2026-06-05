import Link from 'next/link';
import Button from '@/components/ui/Button';

interface HouseUtilityBarProps {
  houseId: number;
  showCreateRound?: boolean;
}

export default function HouseUtilityBar({ houseId, showCreateRound = false }: HouseUtilityBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div />
      {showCreateRound && (
        <Link href={`/create/round?houseId=${houseId}`}>
          <Button variant="primary">Create Round</Button>
        </Link>
      )}
    </div>
  );
}
