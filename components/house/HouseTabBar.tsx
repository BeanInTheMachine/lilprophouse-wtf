interface HouseTabBarProps {
  activeTab: 'rounds' | 'proposals';
  onTabChange: (tab: 'rounds' | 'proposals') => void;
  roundCount?: number;
  proposalCount?: number;
}

const tabs: { key: 'rounds' | 'proposals'; label: string }[] = [
  { key: 'rounds', label: 'Rounds' },
  { key: 'proposals', label: 'Proposals' },
];

export default function HouseTabBar({ activeTab, onTabChange, roundCount, proposalCount }: HouseTabBarProps) {
  return (
    <div className="flex gap-1 bg-border-light rounded-xl p-1">
      {tabs.map((tab) => {
        const count = tab.key === 'rounds' ? roundCount : proposalCount;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'bg-surface-light text-brand-black shadow-low'
                : 'text-brand-gray hover:text-brand-black'
            }`}
          >
            {tab.label}
            {count !== undefined && (
              <span className="ml-1.5 text-xs font-normal text-brand-gray">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
