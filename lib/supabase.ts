import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase credentials not set. Comments/replies will be unavailable until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.',
  );
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function getReplies(proposalId: number) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reply')
    .select('*')
    .eq('proposalId', proposalId)
    .order('createdAt', { ascending: true });

  if (error) {
    console.error('Supabase getReplies error:', error);
    return [];
  }

  return data;
}

export async function insertReply(reply: {
  proposalId: number;
  content: string;
  address: string;
  communityAddress: string;
  blockTag: number;
  signature: string;
  signedMessage: string;
}) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('reply')
    .insert({
      proposalId: reply.proposalId,
      content: reply.content,
      address: reply.address.toLowerCase(),
      communityAddress: reply.communityAddress.toLowerCase(),
      blockTag: reply.blockTag,
      signature: reply.signature,
      signedMessage: reply.signedMessage,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insertReply error:', error);
    throw new Error(error.message);
  }

  return data;
}
