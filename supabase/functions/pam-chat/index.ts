// PAM Chat - Modular Architecture with Context Gatherers
// Design Principles:
// 1. Separation of Concerns (Core vs Gatherers)
// 2. Fail-Safe Design (Isolated gatherers)
// 3. Composable Context (Easy to extend)
// 4. Single LLM Call (ONE call with all context)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { gatherAllContext } from './context-gatherers.ts'
import { buildSystemPrompt, buildMessages } from './prompt-builder.ts'
import { getTools } from './tool-registry.ts'

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

    // Get tools using modular tool registry
    const tools = await getTools(authHeader, backendUrl)

    // ============================================================================
    // COMPOSABLE CONTEXT GATHERING (Modular Architecture)
    // ============================================================================
    // Gather all external context (user profile, RPS, WIS, recent activity, etc.)
    // Each gatherer is isolated and fail-safe - returns null on error
    // Easy to add new context sources without changing core logic
    const externalContext = await gatherAllContext(
      user.id,
      user.email,
      message,
      authHeader
    )

    // Build system prompt using modular prompt builder
    const systemPrompt = buildSystemPrompt(externalContext)

    // Build conversation messages using prompt builder
    const messages = buildMessages(systemPrompt, conversation_history, message)

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
        tools: tools.length > 0 ? tools : undefined, // Already formatted by tool-registry
        temperature: 0.7,
        max_tokens: 500
      })
    })

    // ✅ Check if API call succeeded
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text()
      console.error('❌ OpenAI API error:', {
        status: chatResponse.status,
        statusText: chatResponse.statusText,
        error: errorText
      })
      return new Response(
        JSON.stringify({
          error: 'Failed to get AI response',
          details: `OpenAI API returned ${chatResponse.status}: ${errorText.substring(0, 200)}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const chatData = await chatResponse.json()
    console.log('OpenAI response structure:', Object.keys(chatData))

    // ✅ Check if response has expected structure
    if (!chatData.choices || chatData.choices.length === 0) {
      console.error('Invalid OpenAI response:', chatData)
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

        // ✅ Check if tool execution succeeded
        if (!toolResponse.ok) {
          const errorText = await toolResponse.text()
          console.error(`Tool ${toolName} execution failed:`, errorText)
          // Continue with error result instead of crashing
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: JSON.stringify({ error: `Tool execution failed: ${errorText}` })
          })
          continue
        }

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

      // ✅ Check if final API call succeeded
      if (!finalResponse.ok) {
        const errorText = await finalResponse.text()
        console.error('❌ OpenAI final response error:', {
          status: finalResponse.status,
          statusText: finalResponse.statusText,
          error: errorText
        })
        return new Response(
          JSON.stringify({
            error: 'Failed to get final AI response',
            details: `OpenAI API returned ${finalResponse.status}: ${errorText.substring(0, 200)}`
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const finalData = await finalResponse.json()

      // ✅ Check if final response has expected structure
      if (!finalData.choices || finalData.choices.length === 0) {
        console.error('Invalid final OpenAI response:', finalData)
        return new Response(
          JSON.stringify({ error: 'Invalid final AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

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
