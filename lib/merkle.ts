import { keccak256, encodePacked, type Address } from 'viem';

export interface MerkleMember {
  address: string;
  weight: string;
}

export interface MerkleTree {
  root: `0x${string}`;
  proofs: Map<string, `0x${string}`[]>;
  leaves: `0x${string}`[];
}

function hashLeaf(address: string, weight: bigint): `0x${string}` {
  return keccak256(
    encodePacked(['address', 'uint256'], [address as Address, weight])
  );
}

function sortBytes32(a: `0x${string}`, b: `0x${string}`): [typeof a, typeof b] {
  if (a <= b) return [a, b];
  return [b, a];
}

function hashPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  const [left, right] = sortBytes32(a, b);
  return keccak256(encodePacked(['bytes32', 'bytes32'], [left, right]));
}

export function buildMerkleTree(members: MerkleMember[]): MerkleTree {
  if (members.length === 0) {
    return { root: '0x0000000000000000000000000000000000000000000000000000000000000000', proofs: new Map(), leaves: [] };
  }

  const leafEntries: { leaf: `0x${string}`; address: string; weight: bigint }[] = members.map((m) => ({
    leaf: hashLeaf(m.address, BigInt(m.weight)),
    address: m.address.toLowerCase(),
    weight: BigInt(m.weight),
  }));

  leafEntries.sort((a, b) => (a.leaf <= b.leaf ? -1 : 1));

  const leaves = leafEntries.map((e) => e.leaf);
  let currentLevel = [...leaves];

  const proofCollector: Map<string, { leaf: `0x${string}`; siblings: `0x${string}`[] }> = new Map();
  for (const entry of leafEntries) {
    proofCollector.set(entry.address, { leaf: entry.leaf, siblings: [] });
  }

  while (currentLevel.length > 1) {
    const nextLevel: `0x${string}`[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

      // Add sibling to proofs for leaves tracking left or right
      for (const [addr, data] of proofCollector) {
        if (data.leaf === left) data.siblings.push(right);
        if (data.leaf === right) data.siblings.push(left);
        if (data.leaf === left && right === left) {
          data.siblings.pop();
          data.siblings.push(left);
        }
      }

      const parent = hashPair(left, right);
      nextLevel.push(parent);
    }
    currentLevel = nextLevel;
  }

  const root = currentLevel[0];
  const proofs = new Map<string, `0x${string}`[]>();
  for (const [addr, data] of proofCollector) {
    proofs.set(addr, data.siblings);
  }

  return { root, proofs, leaves };
}

export function generateMerkleProof(
  tree: MerkleTree,
  address: string
): `0x${string}`[] | null {
  const addr = address.toLowerCase();
  return tree.proofs.get(addr) ?? null;
}
