interface EthAddressProps {
  address: string;
  className?: string;
}

export default function EthAddress({ address, className = '' }: EthAddressProps) {
  const addr = address.toLowerCase();
  const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <span className={`font-mono text-xs font-medium text-brand-gray ${className}`} title={addr}>
      {short}
    </span>
  );
}
