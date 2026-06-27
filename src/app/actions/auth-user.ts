'use server';

import { createServerSupabaseClient } from '@/lib/auth';

export async function ensureUserProfile() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const userId = userData.user.id;
    const fullName = userData.user.user_metadata?.full_name || 'User';
    const avatarUrl = userData.user.user_metadata?.avatar_url || null;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // Create profile if doesn't exist
    if (!existingProfile) {
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }
    }

    return { id: userId, full_name: fullName, avatar_url: avatarUrl };
  } catch (error) {
    console.error('Error ensuring profile:', error);
    return null;
  }
}
