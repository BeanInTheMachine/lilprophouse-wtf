import { PrismaClient, RoundType, RoundState, Direction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const house = await prisma.house.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contractAddress: '0x0000000000000000000000000000000000000000',
      name: 'Nouns DAO',
      profileImageUrl: 'https://example.com/nouns.png',
      description: 'The original Nouns DAO community on Prop House.',
    },
  });

  const round = await prisma.round.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      type: RoundType.TIMED,
      title: 'Build the Nouns Ecosystem',
      description: 'Submit your best ideas for growing the Nouns ecosystem.',
      fundingAmount: 5,
      currencyType: 'ETH',
      numWinners: 3,
      startTime: new Date('2024-01-01'),
      proposalEndTime: new Date('2024-02-01'),
      votingEndTime: new Date('2024-02-15'),
      state: RoundState.ACCEPTING_PROPOSALS,
      houseId: 1,
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
