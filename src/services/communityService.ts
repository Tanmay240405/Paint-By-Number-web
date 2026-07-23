import { supabase } from '../supabase/supabaseClient';

/**
 * Uploads a base64 data URL image to Supabase Storage.
 * @param dataUrl Base64 string from canvas/image
 * @param path Storage path (e.g. userId/paintingId/template.png)
 */
export async function uploadImageFromDataUrl(dataUrl: string, path: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  try {
    // Convert base64 to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const { error } = await supabase.storage
      .from('paintings')
      .upload(path, blob, {
        upsert: true,
        contentType: 'image/png',
      });

    if (error) {
      console.warn('Storage upload error (using fallback data URL):', error.message);
      return dataUrl;
    }

    const { data: urlData } = supabase.storage
      .from('paintings')
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.warn('Failed to upload image to storage, using fallback:', err);
    return dataUrl;
  }
}

export interface PaintingRecord {
  id?: string;
  user_id: string;
  name: string;
  original_image_url: string;
  template_image_url: string;
  palette_image_url: string;
  reference_image_url: string;
  painted_canvas_url: string;
  palette_json: any;
  metrics_json: any;
  completed: boolean;
  submitted: boolean;
  created_at?: string;
  last_saved?: string;
}

export async function savePaintingProgress(
  painting: PaintingRecord,
  paintedCanvasDataUrl: string
): Promise<PaintingRecord> {
  const timestamp = new Date().getTime();
  const folderId = painting.id || `new_${timestamp}`;
  const basePath = `${painting.user_id}/${folderId}`;

  // Upload main painted canvas
  const canvasUrl = await uploadImageFromDataUrl(paintedCanvasDataUrl, `${basePath}/canvas.png`);

  // Upload original, template, palette, reference if they are raw data URLs
  const originalUrl = await uploadImageFromDataUrl(painting.original_image_url, `${basePath}/original.png`);
  const templateUrl = await uploadImageFromDataUrl(painting.template_image_url, `${basePath}/template.png`);
  const paletteUrl = await uploadImageFromDataUrl(painting.palette_image_url, `${basePath}/palette.png`);
  const referenceUrl = painting.reference_image_url 
    ? await uploadImageFromDataUrl(painting.reference_image_url, `${basePath}/reference.png`) 
    : '';

  const recordToSave = {
    ...painting,
    original_image_url: originalUrl,
    template_image_url: templateUrl,
    palette_image_url: paletteUrl,
    reference_image_url: referenceUrl,
    painted_canvas_url: canvasUrl,
    last_saved: new Date().toISOString(),
  };

  if (painting.id) {
    // Update existing
    const { data, error } = await supabase
      .from('paintings')
      .update(recordToSave)
      .eq('id', painting.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('paintings')
      .insert(recordToSave)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
}

export async function getUserPaintings(userId: string): Promise<PaintingRecord[]> {
  const { data, error } = await supabase
    .from('paintings')
    .select('*')
    .eq('user_id', userId)
    .order('last_saved', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPaintingById(id: string): Promise<PaintingRecord | null> {
  const { data, error } = await supabase
    .from('paintings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

export async function deletePainting(id: string): Promise<void> {
  const { error } = await supabase.from('paintings').delete().eq('id', id);
  if (error) throw error;
}

// ─── Community Gallery ──────────────────────────────────────────

export interface CommunityPostSubmission {
  id: number;
  month: string;
  painting_id: string;
  user_id: string;
  user_display_name: string;
  submitted_at: string;
  votes: number;
  is_winner: boolean;
  paintings: PaintingRecord; // joined relation
}

export async function postPaintingToCommunity(
  paintingId: string,
  userId: string,
  displayName: string,
  month: string
): Promise<void> {
  const { error } = await supabase.from('monthly_draws').insert({
    painting_id: paintingId,
    user_id: userId,
    user_display_name: displayName,
    month: month,
  });

  if (error) throw error;

  // Mark as submitted
  await supabase.from('paintings').update({ submitted: true }).eq('id', paintingId);
}

export async function getCommunityPosts(month: string): Promise<CommunityPostSubmission[]> {
  const { data, error } = await supabase
    .from('monthly_draws')
    .select(`
      *,
      paintings (*)
    `)
    .eq('month', month)
    .order('votes', { ascending: false });

  if (error) throw error;
  return data as any;
}

export async function upvotePost(postId: number, userId: string): Promise<void> {
  // Insert vote
  const { error: voteError } = await supabase.from('draw_votes').insert({
    draw_id: postId,
    user_id: userId,
  });
  if (voteError) throw voteError; // likely a duplicate vote error (violates unique constraint)

  // Increment vote count
  const { data } = await supabase.from('monthly_draws').select('votes').eq('id', postId).single();
  if (data) {
    await supabase.from('monthly_draws').update({ votes: data.votes + 1 }).eq('id', postId);
  }
}

export async function getFeaturedPost(month: string): Promise<CommunityPostSubmission | null> {
  const { data, error } = await supabase
    .from('monthly_draws')
    .select(`
      *,
      paintings (*)
    `)
    .eq('month', month)
    .eq('is_winner', true)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return data as any;
}
