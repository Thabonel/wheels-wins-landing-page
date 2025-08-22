import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NudgeEvent {
  user_id: string
  trial_id: string
  day_number: number
  nudge_type: 'email' | 'in_app'
  template: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check for trials that need nudges
    const { data: trials, error: trialsError } = await supabaseClient
      .from('trials')
      .select(`
        id,
        user_id,
        started_at,
        status,
        profiles!inner(email, full_name)
      `)
      .eq('status', 'active')

    if (trialsError) {
      throw trialsError
    }

    const nudgeEvents: NudgeEvent[] = []
    const emailsToSend = []

    for (const trial of trials || []) {
      const dayNumber = Math.ceil(
        (new Date().getTime() - new Date(trial.started_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Check if nudge should be sent for this day
      if ([3, 12, 21, 26, 28].includes(dayNumber)) {
        // Check if nudge was already sent today
        const { data: existingNudge } = await supabaseClient
          .from('trial_events')
          .select('id')
          .eq('user_id', trial.user_id)
          .eq('event_type', 'email_sent')
          .eq('day_number', dayNumber)
          .gte('created_at', new Date().toISOString().split('T')[0])
          .single()

        if (!existingNudge) {
          const template = getTemplateForDay(dayNumber)
          
          nudgeEvents.push({
            user_id: trial.user_id,
            trial_id: trial.id,
            day_number: dayNumber,
            nudge_type: 'email',
            template
          })

          // Get trial summary for email personalization
          const trialSummary = await getTrialSummary(supabaseClient, trial.user_id)
          
          emailsToSend.push({
            to: trial.profiles.email,
            user_name: trial.profiles.full_name || 'there',
            day_number: dayNumber,
            template,
            data: {
              ...trialSummary,
              days_left: 28 - dayNumber,
              progress_percent: Math.round((trialSummary.completed_milestones / 5) * 100),
              app_url: Deno.env.get('SITE_URL') || 'https://app.wheelsandwins.com',
              upgrade_url: `${Deno.env.get('SITE_URL') || 'https://app.wheelsandwins.com'}/upgrade`,
              help_url: `${Deno.env.get('SITE_URL') || 'https://app.wheelsandwins.com'}/help`
            }
          })
        }
      }
    }

    // Send emails
    for (const email of emailsToSend) {
      try {
        await sendEmail(email)
        
        // Log the email event
        await supabaseClient.rpc('log_trial_event', {
          p_user_id: nudgeEvents.find(e => e.day_number === email.day_number)?.user_id,
          p_event_type: 'email_sent',
          p_metadata: {
            template: email.template,
            day_number: email.day_number
          }
        })
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        nudges_sent: emailsToSend.length,
        message: `Processed ${trials?.length || 0} trials, sent ${emailsToSend.length} nudges`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in trial-nudges function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function getTemplateForDay(dayNumber: number): string {
  switch (dayNumber) {
    case 3: return 'day3-momentum'
    case 12: return 'day12-progress'
    case 21: return 'day21-ownership'
    case 26: return 'day26-final'
    case 28: return 'day28-expired'
    default: return 'generic'
  }
}

async function getTrialSummary(supabaseClient: any, userId: string) {
  // Get trial events and milestones
  const { data: events } = await supabaseClient
    .from('trial_events')
    .select('event_type, metadata, created_at')
    .eq('user_id', userId)

  const { data: milestones } = await supabaseClient
    .from('trial_milestones')
    .select('milestone_type, completed_at')
    .eq('user_id', userId)

  return {
    routes_saved: events?.filter((e: any) => e.event_type === 'route_saved').length || 0,
    expenses_tracked: events?.filter((e: any) => e.event_type === 'import_done').length || 0,
    total_expenses: events?.reduce((sum: number, e: any) => 
      e.event_type === 'import_done' ? sum + (e.metadata?.amount || 0) : sum, 0) || 0,
    fuel_insights: events?.filter((e: any) => e.event_type === 'fuel_linked').length || 0,
    days_active: events ? new Set(events.map((e: any) => 
      e.created_at.split('T')[0])).size : 0,
    completed_milestones: milestones?.filter((m: any) => m.completed_at).length || 0,
    milestones: [
      { 
        title: 'Import Expenses', 
        completed: milestones?.some((m: any) => m.milestone_type === 'import_expenses' && m.completed_at),
        order: 1
      },
      { 
        title: 'Save First Route', 
        completed: milestones?.some((m: any) => m.milestone_type === 'save_route' && m.completed_at),
        order: 2
      },
      { 
        title: 'Set Monthly Budget', 
        completed: milestones?.some((m: any) => m.milestone_type === 'set_budget' && m.completed_at),
        order: 3
      },
      { 
        title: 'Link Fuel Data', 
        completed: milestones?.some((m: any) => m.milestone_type === 'link_fuel' && m.completed_at),
        order: 4
      },
      { 
        title: 'Enable Reminders', 
        completed: milestones?.some((m: any) => m.milestone_type === 'enable_reminders' && m.completed_at),
        order: 5
      }
    ]
  }
}

async function sendEmail(emailData: any) {
  const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
  const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')
  
  if (!mailgunApiKey || !mailgunDomain) {
    console.warn('Mailgun not configured, skipping email send')
    return
  }

  // Load HTML template
  const templatePath = `./templates/${emailData.template}.html`
  let htmlContent = ''
  
  try {
    htmlContent = await Deno.readTextFile(templatePath)
  } catch {
    console.warn(`Template ${emailData.template} not found, using fallback`)
    htmlContent = getFallbackTemplate(emailData)
  }

  // Replace template variables
  htmlContent = htmlContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return emailData.data[key] || emailData[key] || match
  })

  const formData = new FormData()
  formData.append('from', `Wheels & Wins <noreply@${mailgunDomain}>`)
  formData.append('to', emailData.to)
  formData.append('subject', getSubjectForTemplate(emailData.template, emailData.day_number))
  formData.append('html', htmlContent)
  formData.append('o:tag', 'trial-nudge')
  formData.append('o:tag', emailData.template)

  const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Mailgun error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

function getSubjectForTemplate(template: string, dayNumber: number): string {
  switch (template) {
    case 'day3-momentum': return '⚡ Build your momentum - Quick wins available'
    case 'day12-progress': return '🚀 Amazing progress! You\'re building great habits'
    case 'day21-ownership': return '🏆 This is your data now - keep it safe'
    case 'day26-final': return '⏰ 2 days left - Keep everything you\'ve built'
    case 'day28-expired': return '🔒 Your trial ended - Your data is safe'
    default: return `Day ${dayNumber} - Your Wheels & Wins journey continues`
  }
}

function getFallbackTemplate(emailData: any): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1>Day ${emailData.day_number} Update</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hey ${emailData.user_name},</h2>
          <p>You're ${emailData.day_number} days into your trial! Keep up the great work building your travel habits.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailData.data.app_url}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">Continue Your Journey</a>
          </div>
        </div>
      </body>
    </html>
  `
}