-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('TIMED', 'INFINITE');

-- CreateEnum
CREATE TYPE "RoundState" AS ENUM ('NOT_STARTED', 'ACCEPTING_PROPOSALS', 'VOTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateTable
CREATE TABLE "House" (
    "id" SERIAL NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "contractAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileImageUrl" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "type" "RoundType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fundingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currencyType" TEXT,
    "numWinners" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "proposalEndTime" TIMESTAMP(3),
    "votingEndTime" TIMESTAMP(3),
    "balanceBlockTag" INTEGER NOT NULL DEFAULT 0,
    "propStrategy" JSONB NOT NULL,
    "voteStrategy" JSONB NOT NULL,
    "propStrategyDescription" TEXT,
    "voteStrategyDescription" TEXT,
    "displayComments" BOOLEAN NOT NULL DEFAULT true,
    "quorumFor" INTEGER,
    "quorumAgainst" INTEGER,
    "votingPeriod" INTEGER,
    "state" "RoundState" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "houseId" INTEGER NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tldr" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reqAmount" DECIMAL(65,30),
    "voteCountFor" INTEGER NOT NULL DEFAULT 0,
    "voteCountAgainst" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roundId" INTEGER NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "direction" "Direction" NOT NULL,
    "weight" INTEGER NOT NULL,
    "blockHeight" INTEGER NOT NULL DEFAULT 0,
    "address" TEXT NOT NULL,
    "communityAddress" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposalId" INTEGER NOT NULL,
    "roundId" INTEGER NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "ipfsHash" TEXT NOT NULL,
    "pinSize" TEXT NOT NULL,
    "ipfsTimestamp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

