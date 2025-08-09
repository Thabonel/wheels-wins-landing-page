import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

async function getIpAddress(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip;
  } catch {
    return null;
  }
}

async function getLocationInfo(): Promise<any | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function recordLogin(userId: string, session: Session) {
  const ipAddress = await getIpAddress();
  const locationInfo = await getLocationInfo();
  const userAgent = navigator.userAgent;

  const loginMethod = session.provider_token ? 'oauth' : 'password';

  await supabase.from('user_login_history').insert({
    user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    device_info: null,
    location_info: locationInfo,
    login_method: loginMethod,
    login_time: new Date().toISOString(),
    success: true,
  });

  await supabase.from('user_active_sessions').insert({
    user_id: userId,
    session_id: session.access_token,
    user_agent: userAgent,
    device_info: null,
    location_info: locationInfo,
    ip_address: ipAddress,
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    expires_at: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null,
    is_current: true,
  });
}

export async function endSession(sessionToken: string) {
  try {
    await supabase
      .from('user_active_sessions')
      .delete()
      .eq('session_id', sessionToken);
  } catch (e) {
    console.error('Failed to end session', e);
  }
}
