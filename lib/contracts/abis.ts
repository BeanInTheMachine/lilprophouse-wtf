import { PropHouse__factory } from '@prophouse/protocol/dist/typechain/factories/PropHouse__factory';
import { TimedRound__factory } from '@prophouse/protocol/dist/typechain/factories/TimedRound__factory';
import { InfiniteRound__factory } from '@prophouse/protocol/dist/typechain/factories/InfiniteRound__factory';
import { CommunityHouse__factory } from '@prophouse/protocol/dist/typechain/factories/CommunityHouse__factory';
import { CreatorPassIssuer__factory } from '@prophouse/protocol/dist/typechain/factories/CreatorPassIssuer__factory';

export const PROP_HOUSE_ABI = PropHouse__factory.abi;
export const TIMED_ROUND_ABI = TimedRound__factory.abi;
export const INFINITE_ROUND_ABI = InfiniteRound__factory.abi;
export const COMMUNITY_HOUSE_ABI = CommunityHouse__factory.abi;
export const CREATOR_PASS_ISSUER_ABI = CreatorPassIssuer__factory.abi;
