import { PrismaClient, RoundType, RoundState } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const existing = await prisma.house.findFirst({ where: { name: 'Nouns DAO' } });
  if (existing) {
    console.log('Seed data already exists — skipping.');
    return;
  }

  const house = await prisma.house.create({
    data: {
      contractAddress: '0x0000000000000000000000000000000000000000',
      name: 'Nouns DAO',
      profileImageUrl: 'https://example.com/nouns.png',
      description: 'The original Nouns DAO community on Prop House.',
    },
  });

  const round = await prisma.round.create({
    data: {
      type: RoundType.TIMED,
      title: 'Build the Nouns Ecosystem',
      description: 'Submit your best ideas for growing the Nouns ecosystem.',
      fundingAmount: 5,
      currencyType: 'ETH',
      numWinners: 3,
      startTime: new Date('2026-06-01'),
      proposalEndTime: new Date('2026-06-15'),
      votingEndTime: new Date('2026-06-30'),
      state: RoundState.ACCEPTING_PROPOSALS,
      houseId: house.id,
      propStrategy: { type: 'all' },
      voteStrategy: { type: 'erc721', address: '0x0000000000000000000000000000000000000000' },
    },
  });

  console.log({ house, round });
  console.log('Seeding complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
