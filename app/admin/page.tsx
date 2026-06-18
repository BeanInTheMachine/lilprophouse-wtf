'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAdmin } from '@/lib/admin';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';
import dayjs from 'dayjs';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!address || !isAdmin(address)) { setLoading(false); return; }
    setLoading(true);
    fetch('/api/admin/rounds')
      .then((r) => r.json())
      .then(setRounds)
      .catch(() => setError('Failed to load rounds'))
      .finally(() => setLoading(false));
  }, [address]);

  async function handleRemove(roundId: number) {
    setRemoving(roundId);
    try {
      const res = await fetch('/api/admin/rounds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, address }),
      });
      if (!res.ok) throw new Error();
      setRounds((prev) => prev.filter((r) => r.id !== roundId));
    } catch {
      setError('Failed to remove round');
    } finally {
      setRemoving(null);
      setConfirmId(null);
    }
  }

  if (!isConnected || !isAdmin(address)) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-londrina text-3xl text-brand-black mb-2">Admin Dashboard</h1>
        <p className="text-brand-gray">{!isConnected ? 'Connect your wallet to continue.' : 'You are not authorized.'}</p>
      </div>
    );
  }

  const filtered = rounds.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-londrina text-3xl text-brand-black mb-2">Admin Dashboard</h1>
      <p className="text-brand-gray mb-6">Remove malicious or spam rounds.</p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search rounds..."
        className="w-full max-w-md mb-6 px-4 py-2 rounded-xl border border-border-med text-sm focus:outline-none focus:border-brand-purple"
      />

      {error && (
        <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm text-brand-red mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {loading && <LoadingIndicator />}

      {!loading && filtered.length === 0 && (
        <p className="text-brand-gray text-center py-8">No rounds found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light text-left text-brand-gray uppercase text-xs tracking-wider">
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">House</th>
                <th className="py-3 pr-4">State</th>
                <th className="py-3 pr-4">Creator</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((round) => (
                <tr key={round.id} className="border-b border-border-light">
                  <td className="py-3 pr-4">
                    <Link href={`/rounds/${round.id}`} className="font-bold text-brand-black hover:text-brand-purple truncate max-w-[200px] block">
                      {round.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-brand-gray">{round.house?.name ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                      round.state === 'ACCEPTING_PROPOSALS' ? 'bg-brand-green-hint text-brand-green' :
                      round.state === 'VOTING' ? 'bg-brand-purple-hint text-brand-purple' :
                      round.state === 'COMPLETED' ? 'bg-border-med text-brand-black' :
                      'bg-brand-red-hint text-brand-red'
                    }`}>
                      {round.state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-brand-gray">
                    {round.proposals?.[0]?.address?.slice(0, 6)}...{round.proposals?.[0]?.address?.slice(-4) ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-brand-gray">{dayjs(round.createdAt).format('MMM D, YYYY')}</td>
                  <td className="py-3">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmId(round.id)}
                      disabled={removing === round.id}
                      className="border-brand-red text-brand-red hover:bg-brand-red-hint text-xs px-3 py-1"
                    >
                      {removing === round.id ? 'Removing...' : 'Remove'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="p-6 text-center">
          <p className="text-brand-black font-bold text-lg mb-2">Remove this round?</p>
          <p className="text-brand-gray text-sm mb-6">
            This will hide the round from the site. This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button onClick={() => confirmId && handleRemove(confirmId)} className="bg-brand-red hover:bg-brand-red-semi-transparent">Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
