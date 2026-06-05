import { getActiveRounds } from '@/lib/services/roundService';
import RoundList from '@/components/RoundList';

export default async function BrowsePage() {
  let rounds: any[] = [];
  let error: string | null = null;

  try {
    rounds = await getActiveRounds();
  } catch (e) {
    error = 'Failed to load rounds. Is the database running?';
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-londrina text-3xl text-brand-black mb-2">Browse Rounds</h1>
      <p className="text-brand-gray mb-8">Discover active funding rounds accepting proposals.</p>

      {error && (
        <div className="text-center py-16 text-brand-gray">
          <p className="text-lg font-medium">{error}</p>
        </div>
      )}

      {!error && (
        <RoundList
          rounds={rounds.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            state: r.state,
            fundingAmount: Number(r.fundingAmount),
            currencyType: r.currencyType,
            numWinners: r.numWinners,
            startTime: new Date(r.startTime),
            proposalEndTime: r.proposalEndTime ? new Date(r.proposalEndTime) : null,
            votingEndTime: r.votingEndTime ? new Date(r.votingEndTime) : null,
            proposalCount: r.proposals?.length ?? 0,
          }))}
          emptyMessage="No active rounds right now. Check back soon or create your own!"
        />
      )}
    </div>
  );
}
