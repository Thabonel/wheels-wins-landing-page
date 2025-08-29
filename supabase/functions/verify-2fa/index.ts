
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticator } from 'https://esm.sh/otplib@12.0.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, token } = await req.json()

    if (!user_id || !token) {
      return new Response(
        JSON.stringify({ error: 'User ID and token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the secret from database
    const { data: twoFactorData, error: fetchError } = await supabase
      .from('user_two_factor_auth')
      .select('secret_key, backup_codes')
      .eq('user_id', user_id)
      .single()

    if (fetchError || !twoFactorData) {
      return new Response(
        JSON.stringify({ error: 'No 2FA setup found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the token
    const isValid = authenticator.verify({
      token,
      secret: twoFactorData.secret_key
    })

    // Check if token is a backup code
    const isBackupCode = twoFactorData.backup_codes?.includes(token.toUpperCase())

    if (!isValid && !isBackupCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If using backup code, remove it from the list
    let updatedBackupCodes = twoFactorData.backup_codes
    if (isBackupCode) {
      updatedBackupCodes = twoFactorData.backup_codes?.filter(code => code !== token.toUpperCase())
    }

    // Enable 2FA
    const { error: updateError } = await supabase
      .from('user_two_factor_auth')
      .update({
        enabled: true,
        verified_at: new Date().toISOString(),
        backup_codes: updatedBackupCodes
      })
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to enable 2FA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
