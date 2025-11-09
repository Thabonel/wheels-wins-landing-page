#!/usr/bin/env node
/**
 * Script to audit trip templates and identify missing images
 * Connects directly to Supabase to check image_url status
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:')
  console.error('   VITE_SUPABASE_URL =', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY =', supabaseKey ? '✅' : '❌')
  console.error('   Note: Using anon key may have limited permissions')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function auditTripTemplates() {
  try {
    console.log('🔍 Auditing trip templates for missing images...\n')

    // Fetch all public templates
    const { data: templates, error } = await supabase
      .from('trip_templates')
      .select('id, name, image_url, thumbnail_url, image_source, is_public, category, template_data')
      .eq('is_public', true)
      .order('name')

    if (error) {
      console.error('❌ Failed to fetch templates:', error)
      return
    }

    if (!templates || templates.length === 0) {
      console.log('⚠️  No public templates found')
      return
    }

    // Analyze templates
    const withImages = templates.filter(t => t.image_url)
    const withoutImages = templates.filter(t => !t.image_url)
    const withThumbnails = templates.filter(t => t.thumbnail_url)

    console.log('📊 **Template Image Status Summary**')
    console.log(`   Total templates: ${templates.length}`)
    console.log(`   With images: ${withImages.length}`)
    console.log(`   Without images: ${withoutImages.length}`)
    console.log(`   With thumbnails: ${withThumbnails.length}`)
    console.log()

    // Templates WITH images
    if (withImages.length > 0) {
      console.log('✅ **Templates WITH Images:**')
      withImages.forEach(template => {
        const source = template.image_source || 'unknown'
        console.log(`   • ${template.name} (${template.id}) - ${source}`)
        if (template.image_url) {
          console.log(`     URL: ${template.image_url.substring(0, 80)}...`)
        }
      })
      console.log()
    }

    // Templates WITHOUT images
    if (withoutImages.length > 0) {
      console.log('❌ **Templates WITHOUT Images:**')
      withoutImages.forEach(template => {
        const region = template.template_data?.region || 'Unknown'
        const category = template.category || 'uncategorized'
        console.log(`   • ${template.name} (${template.id})`)
        console.log(`     Region: ${region}, Category: ${category}`)
      })
      console.log()
    }

    // Image sources breakdown
    const sources = withImages.reduce((acc, t) => {
      const source = t.image_source || 'unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    if (Object.keys(sources).length > 0) {
      console.log('🎯 **Image Sources:**')
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`   • ${source}: ${count} templates`)
      })
      console.log()
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: templates.length,
        withImages: withImages.length,
        withoutImages: withoutImages.length,
        withThumbnails: withThumbnails.length
      },
      sources,
      templatesWithImages: withImages.map(t => ({
        id: t.id,
        name: t.name,
        source: t.image_source,
        hasImage: !!t.image_url,
        hasThumbnail: !!t.thumbnail_url
      })),
      templatesWithoutImages: withoutImages.map(t => ({
        id: t.id,
        name: t.name,
        region: t.template_data?.region,
        category: t.category
      }))
    }

    const reportPath = 'docs/trip-template-image-audit.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 Detailed report saved to: ${reportPath}`)

    // Return summary for further processing
    return {
      totalTemplates: templates.length,
      missingImages: withoutImages.length,
      templatesWithoutImages: withoutImages
    }

  } catch (error) {
    console.error('💥 Unexpected error during audit:', error)
    throw error
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  auditTripTemplates()
    .then(result => {
      if (result) {
        console.log(`\n🎯 **Action Required**: ${result.missingImages} templates need images`)
        process.exit(result.missingImages > 0 ? 1 : 0)
      }
    })
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export default auditTripTemplates