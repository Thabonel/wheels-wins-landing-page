// Admin Affiliate Products API (Edge Function)
// Provides admin-only CRUD for affiliate_products using service role
// Path: /functions/v1/admin-affiliate-products

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAuthenticatedClient, createServiceClient, corsHeaders, handleCorsPreflight, jsonResponse, errorResponse } from "../_shared/utils.ts";

type Json = Record<string, any>;

async function isAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('admin_users')
    .select('user_id, role, status')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('status', 'active')
    .maybeSingle();
  if (error) return false;
  return !!data;
}

function notAllowed() {
  return errorResponse('Forbidden', { status: 403, code: 'FORBIDDEN' });
}

async function handleGet(url: URL) {
  const service = createServiceClient();
  const provider = url.searchParams.get('provider') ?? 'amazon';
  const includeInactive = url.searchParams.get('includeInactive') === 'true';

  let query = service
    .from('affiliate_products')
    .select('*')
    .eq('affiliate_provider', provider as any)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) return errorResponse(error.message, { status: 400, code: error.code });
  return jsonResponse(data);
}

async function handlePost(req: Request) {
  const body = (await req.json()) as Json;
  const service = createServiceClient();
  const { data, error } = await service
    .from('affiliate_products')
    .insert([body])
    .select('*')
    .single();
  if (error) return errorResponse(error.message, { status: 400, code: error.code });
  return jsonResponse(data, { status: 201 });
}

async function handlePatch(req: Request, id: string) {
  const updates = (await req.json()) as Json;
  const service = createServiceClient();
  const { data, error } = await service
    .from('affiliate_products')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return errorResponse(error.message, { status: 400, code: error.code });
  return jsonResponse(data);
}

async function handleDelete(id: string) {
  const service = createServiceClient();
  const { error } = await service
    .from('affiliate_products')
    .delete()
    .eq('id', id);
  if (error) return errorResponse(error.message, { status: 400, code: error.code });
  return jsonResponse({ success: true }, { status: 200 });
}

async function handleReorder(req: Request) {
  const body = (await req.json()) as { order: { id: string; sort_order: number }[] };
  const service = createServiceClient();
  const updates = body.order || [];
  // Perform updates sequentially to avoid rate issues
  for (const row of updates) {
    const { error } = await service
      .from('affiliate_products')
      .update({ sort_order: row.sort_order })
      .eq('id', row.id);
    if (error) return errorResponse(error.message, { status: 400, code: error.code });
  }
  return jsonResponse({ success: true });
}

export async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === 'OPTIONS') return handleCorsPreflight();

    const url = new URL(req.url);
    const pathname = url.pathname; // .../functions/v1/admin-affiliate-products[/...]

    // AuthN + Admin check
    const { client } = createAuthenticatedClient(req);
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return errorResponse('Authentication required', { status: 401, code: 'UNAUTHORIZED' });
    if (!(await isAdmin(user.id))) return notAllowed();

    // Routing
    // PATCH /reorder
    if (req.method === 'PATCH' && pathname.endsWith('/reorder')) {
      return await handleReorder(req);
    }

    // Resource by ID for PATCH/DELETE
    const idMatch = pathname.match(/admin-affiliate-products\/?([^\/]*)$/);
    const maybeId = idMatch && idMatch[1] && idMatch[1] !== 'admin-affiliate-products' ? idMatch[1] : null;

    if (req.method === 'GET') {
      return await handleGet(url);
    }
    if (req.method === 'POST') {
      return await handlePost(req);
    }
    if (req.method === 'PATCH' && maybeId) {
      return await handlePatch(req, maybeId);
    }
    if (req.method === 'DELETE' && maybeId) {
      return await handleDelete(maybeId);
    }

    return errorResponse('Not found', { status: 404, code: 'NOT_FOUND' });
  } catch (err: any) {
    return errorResponse(err?.message || 'Unexpected error', { status: 500, code: 'INTERNAL' });
  }
}

// Deno deploy entry
serve(handler);
