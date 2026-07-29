import { supabase } from "@/lib/supabase";

export async function trackUsage(userId: string, feature: string) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("user_usage")
      .select("usage_count")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error(`Supabase fetch error for user ${userId}:`, fetchError.message);
      throw new Error(`Failed to fetch usage: ${fetchError.message}`);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_usage")
        .update({ usage_count: existing.usage_count + 1 })
        .eq("user_id", userId);

      if (updateError) {
        console.error(`Supabase update error for user ${userId}:`, updateError.message);
        throw new Error(`Failed to update usage: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from("user_usage")
        .insert([{ user_id: userId, usage_count: 1, tier: "Free" }]);

      if (insertError) {
        console.error(`Supabase insert error for user ${userId}:`, insertError.message);
        throw new Error(`Failed to insert usage: ${insertError.message}`);
      }
    }
  } catch (error: any) {
    console.error(`Usage tracking failed for user ${userId}:`, error.message || error);
  }
}

export async function updateUserTierInSupabase(userId: string, tier: string) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("user_usage")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error(`Supabase fetch error for user ${userId}:`, fetchError.message);
      throw new Error(`Failed to fetch user for tier update: ${fetchError.message}`);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_usage")
        .update({ tier })
        .eq("user_id", userId);

      if (updateError) {
        console.error(`Supabase tier update error for user ${userId}:`, updateError.message);
        throw new Error(`Failed to update tier: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from("user_usage")
        .insert([{ user_id: userId, usage_count: 0, tier }]);

      if (insertError) {
        console.error(`Supabase tier insert error for user ${userId}:`, insertError.message);
        throw new Error(`Failed to insert tier: ${insertError.message}`);
      }
    }
  } catch (error: any) {
    console.error(`Tier update failed for user ${userId}:`, error.message || error);
  }
}
