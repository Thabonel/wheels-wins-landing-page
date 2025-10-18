// PAM Chat - Simple Supabase Edge Function WITH TOOLS
// Like Barry, but with tool calling capability via backend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { message, mode = 'text', conversation_history = [] } = await req.json()

    if (mode === 'realtime') {
      // Create OpenAI Realtime session
      const openaiKey = Deno.env.get('OPENAI_API_KEY')

      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'alloy'
        })
      })

      const session = await response.json()

      return new Response(
        JSON.stringify({
          session_token: session.client_secret.value,
          model: 'gpt-4o-realtime-preview-2024-10-01'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Text chat mode WITH TOOLS + CAG
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const backendUrl = Deno.env.get('BACKEND_URL') ?? 'https://wheels-wins-backend-staging.onrender.com'

    // Get available tools from backend (only once - cached in model context via CAG)
    const toolsResponse = await fetch(`${backendUrl}/api/v1/pam/tools/list`, {
      headers: { 'Authorization': authHeader }
    })
    const toolsData = await toolsResponse.json()
    const tools = toolsData.tools || []

    // Get user profile for CAG (contextual grounding) - directly from Supabase
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, nickname, vehicle_make_model, vehicle_type, fuel_type, region, travel_style, preferred_units')
      .eq('id', user.id)
      .single()

    // Build system prompt with user context (CAG - Contextual Attribute Grounding)
    const systemPrompt = `You are PAM, a helpful AI travel assistant for RV travelers. Be friendly and concise.

USER CONTEXT (use this to personalize responses - Contextual Attribute Grounding):
- User ID: ${user.id}
- Email: ${user.email}
${userProfile ? `
- Name: ${userProfile.nickname || userProfile.full_name || 'Not set'}
- Vehicle: ${userProfile.vehicle_make_model || userProfile.vehicle_type || 'Not specified'}
- Fuel Type: ${userProfile.fuel_type || 'Not specified'}
- Region: ${userProfile.region || 'Not specified'}
- Travel Style: ${userProfile.travel_style || 'Not specified'}
- Preferred Units: ${userProfile.preferred_units || 'metric'}
` : ''}

You have access to tools that let you take actions for the user. Use the user context above to personalize your responses and tool calls. For example:
- If they ask about fuel costs, use their vehicle's fuel type
- If they ask about distances, use their preferred units
- If they're planning trips, consider their travel style and region`

    // Build conversation messages
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversation_history,
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenAI with tool definitions
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        tools: tools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        })),
        temperature: 0.7,
        max_tokens: 500
      })
    })

    const chatData = await chatResponse.json()
    const assistantMessage = chatData.choices[0].message

    // Check if OpenAI wants to use tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = []

      // Execute each tool via backend
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name
        const toolArgs = JSON.parse(toolCall.function.arguments)

        // Call backend tool execution endpoint
        const toolResponse = await fetch(`${backendUrl}/api/v1/pam/tools/execute/${toolName}`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(toolArgs)
        })

        const toolResult = await toolResponse.json()

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolName,
          content: JSON.stringify(toolResult)
        })
      }

      // Send tool results back to OpenAI for final response
      const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...messages,
            assistantMessage,
            ...toolResults
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      const finalData = await finalResponse.json()
      const finalReply = finalData.choices[0].message.content

      return new Response(
        JSON.stringify({
          response: finalReply,
          tools_used: assistantMessage.tool_calls.map(tc => tc.function.name)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No tools needed, just return response
    const reply = assistantMessage.content

    return new Response(
      JSON.stringify({ response: reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
