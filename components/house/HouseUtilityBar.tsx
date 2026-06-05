import Link from 'next/link';
import Button from '@/components/ui/Button';

interface HouseUtilityBarProps {
  houseAddress: string;
  showCreateRound?: boolean;
}

export default function HouseUtilityBar({ houseAddress, showCreateRound = false }: HouseUtilityBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div />
      {showCreateRound && (
        <Link href={`/create/round?house=${houseAddress}`}>
          <Button variant="primary">Create Round</Button>
        </Link>
      )}
    </div>
  );
}
