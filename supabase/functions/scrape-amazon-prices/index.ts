import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Amazon Price Scraper Edge Function
 *
 * Conservative scraping strategy:
 * - Max 8 products per run (stays under 60s timeout)
 * - Random 5-8 second delays between requests
 * - Rotating user agents
 * - Batch rotation for full coverage over multiple days
 *
 * Authentication: X-Cron-Secret header (no JWT required for cron jobs)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-cron-secret, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rotating user agents to appear as different browsers
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

// Price regex patterns for different currencies
const PRICE_PATTERNS = [
  // US Dollar: $29.99, $ 29.99, $29, $1,299.99
  /\$\s*([\d,]+\.?\d*)/,
  // Euro: €29.99, 29,99 €, EUR 29.99
  /€\s*([\d,]+[.,]?\d*)|(\d+[.,]\d+)\s*€|EUR\s*([\d,]+[.,]?\d*)/i,
  // British Pound: £29.99, GBP 29.99
  /£\s*([\d,]+\.?\d*)|GBP\s*([\d,]+\.?\d*)/i,
  // Australian Dollar: A$29.99, AUD 29.99
  /A\$\s*([\d,]+\.?\d*)|AUD\s*([\d,]+\.?\d*)/i,
  // Canadian Dollar: C$29.99, CAD 29.99
  /C\$\s*([\d,]+\.?\d*)|CAD\s*([\d,]+\.?\d*)/i,
];

// Amazon price-specific selectors to look for in HTML
const PRICE_SELECTORS = [
  'priceblock_ourprice',
  'priceblock_dealprice',
  'priceblock_saleprice',
  'a]price-whole',
  'a]price',
  'corePrice_feature_div',
  'corePriceDisplay_desktop_feature_div',
  'price',
  'buyNewSection',
  'apex_desktop',
];

interface Product {
  id: string;
  title: string;
  affiliate_url: string;
  price: number | null;
  currency: string | null;
  scrape_batch_number: number;
  api_error_count: number;
}

interface ScrapeResult {
  product_id: string;
  title: string;
  success: boolean;
  old_price: number | null;
  new_price: number | null;
  currency: string | null;
  price_changed: boolean;
  error?: string;
}

// Random delay between requests (5-8 seconds)
function randomDelay(): Promise<void> {
  const ms = 5000 + Math.random() * 3000; // 5000-8000ms
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Parse price from various formats
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = priceStr.replace(/[€£$A$C$]/g, '').trim();

  // Handle European format (1.234,56 -> 1234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // If comma comes after dot, it's European format
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // American format, just remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Could be European decimal or American thousand separator
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 2) {
      // Likely European decimal (29,99)
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely American thousand separator (1,299)
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

// Detect currency from price string or URL
function detectCurrency(priceStr: string, url: string): string {
  if (priceStr.includes('€') || priceStr.includes('EUR')) return 'EUR';
  if (priceStr.includes('£') || priceStr.includes('GBP')) return 'GBP';
  if (priceStr.includes('A$') || priceStr.includes('AUD')) return 'AUD';
  if (priceStr.includes('C$') || priceStr.includes('CAD')) return 'CAD';

  // Detect from URL domain
  if (url.includes('amazon.co.uk')) return 'GBP';
  if (url.includes('amazon.de') || url.includes('amazon.fr') || url.includes('amazon.es') || url.includes('amazon.it')) return 'EUR';
  if (url.includes('amazon.com.au')) return 'AUD';
  if (url.includes('amazon.ca')) return 'CAD';

  return 'USD'; // Default
}

// Extract price from Amazon HTML
function extractPriceFromHtml(html: string, url: string): { price: number | null; currency: string; rawPrice: string | null } {
  let rawPrice: string | null = null;

  // Method 1: Look for price in specific Amazon elements
  for (const selector of PRICE_SELECTORS) {
    // Look for the selector in various HTML patterns
    const patterns = [
      new RegExp(`id="${selector}"[^>]*>([^<]+)<`, 'i'),
      new RegExp(`class="[^"]*${selector}[^"]*"[^>]*>([^<]+)<`, 'i'),
      new RegExp(`data-a-color="price"[^>]*>([^<]*\\$[\\d,.]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const price = parsePrice(match[1]);
        if (price && price > 0 && price < 100000) {
          rawPrice = match[1].trim();
          return { price, currency: detectCurrency(rawPrice, url), rawPrice };
        }
      }
    }
  }

  // Method 2: Look for price spans with specific patterns
  const priceSpanPattern = /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>(\d+)<\/span>[^<]*<span[^>]*class="[^"]*a-price-fraction[^"]*"[^>]*>(\d+)<\/span>/i;
  const priceSpanMatch = html.match(priceSpanPattern);
  if (priceSpanMatch) {
    const whole = priceSpanMatch[1];
    const fraction = priceSpanMatch[2];
    rawPrice = `${whole}.${fraction}`;
    const price = parseFloat(rawPrice);
    if (!isNaN(price)) {
      return { price, currency: detectCurrency('$', url), rawPrice };
    }
  }

  // Method 3: Generic price pattern search
  for (const pattern of PRICE_PATTERNS) {
    const matches = html.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      for (const match of matches) {
        const price = parsePrice(match);
        if (price && price > 0.99 && price < 100000) {
          rawPrice = match;
          return { price, currency: detectCurrency(match, url), rawPrice };
        }
      }
    }
  }

  return { price: null, currency: 'USD', rawPrice: null };
}

// Scrape a single product
async function scrapeProduct(product: Product): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    product_id: product.id,
    title: product.title,
    success: false,
    old_price: product.price,
    new_price: null,
    currency: product.currency,
    price_changed: false,
  };

  try {
    console.log(`Scraping: ${product.title.substring(0, 50)}...`);

    const response = await fetch(product.affiliate_url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Check for CAPTCHA or bot detection
    if (html.includes('captcha') || html.includes('robot') || html.includes('automated access')) {
      throw new Error('Bot detection triggered - CAPTCHA required');
    }

    // Extract price
    const { price, currency, rawPrice } = extractPriceFromHtml(html, product.affiliate_url);

    if (price === null) {
      throw new Error('Could not extract price from page');
    }

    result.success = true;
    result.new_price = price;
    result.currency = currency;

    // Check if price changed (with 1 cent tolerance for floating point)
    if (product.price !== null) {
      const diff = Math.abs(price - product.price);
      result.price_changed = diff > 0.01;
    } else {
      result.price_changed = true; // First price recorded
    }

    console.log(`  Found price: ${currency} ${price} (raw: ${rawPrice}), changed: ${result.price_changed}`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  Error: ${result.error}`);
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication: Cron secret only (no JWT for cron jobs)
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');

    if (!cronSecret || cronSecret !== expectedCronSecret) {
      console.error('Invalid or missing cron secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid cron secret' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated via cron secret');

    // Parse parameters
    const url = new URL(req.url);
    const batchSize = Math.min(parseInt(url.searchParams.get('batch_size') || '8'), 12); // Max 12
    const forceAll = url.searchParams.get('force_all') === 'true';

    // Determine which batch to process (rotate through 0-9)
    const { data: lastBatch } = await supabase
      .from('affiliate_products')
      .select('scrape_batch_number')
      .eq('is_active', true)
      .order('last_price_check', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    const currentBatch = ((lastBatch?.scrape_batch_number || 0) + 1) % 10;

    // Fetch products to scrape (oldest checked first, or by batch)
    let query = supabase
      .from('affiliate_products')
      .select('id, title, affiliate_url, price, currency, scrape_batch_number, api_error_count')
      .eq('is_active', true)
      .eq('affiliate_provider', 'amazon');

    if (!forceAll) {
      // Prioritize products with errors < 5 and oldest checked
      query = query
        .lt('api_error_count', 5)
        .order('last_price_check', { ascending: true, nullsFirst: true });
    }

    const { data: products, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      console.log('No products to scrape');
      return new Response(
        JSON.stringify({
          message: 'No products to scrape',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${products.length} products (batch ${currentBatch})`);

    const results: ScrapeResult[] = [];
    let pricesUpdated = 0;
    let errorsCount = 0;

    // Process products with delays
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Add delay before request (except first)
      if (i > 0) {
        await randomDelay();
      }

      // Check if we're running out of time (leave 10s buffer)
      const elapsed = Date.now() - startTime;
      if (elapsed > 50000) { // 50 seconds
        console.log(`Time limit approaching (${elapsed}ms), stopping early`);
        break;
      }

      const result = await scrapeProduct(product);
      results.push(result);

      // Update database
      if (result.success) {
        const updates: Record<string, unknown> = {
          last_price_check: new Date().toISOString(),
          api_error_count: 0,
          api_last_error: null,
          scrape_batch_number: currentBatch,
        };

        if (result.price_changed && result.new_price !== null) {
          updates.price = result.new_price;
          updates.currency = result.currency;
          updates.last_scraped_price = result.new_price;
          updates.price_change_detected = true;
          pricesUpdated++;

          // Log price change to history
          const changePercent = result.old_price
            ? ((result.new_price - result.old_price) / result.old_price) * 100
            : null;

          await supabase.from('product_price_history').insert({
            product_id: product.id,
            old_price: result.old_price,
            new_price: result.new_price,
            currency: result.currency,
            price_change_percent: changePercent,
            source: 'scrape',
            checked_at: new Date().toISOString(),
          });

          console.log(`  Price changed: ${result.old_price} -> ${result.new_price} (${changePercent?.toFixed(2)}%)`);
        }

        await supabase
          .from('affiliate_products')
          .update(updates)
          .eq('id', product.id);

      } else {
        errorsCount++;
        await supabase
          .from('affiliate_products')
          .update({
            last_price_check: new Date().toISOString(),
            api_error_count: (product.api_error_count || 0) + 1,
            api_last_error: result.error,
            scrape_batch_number: currentBatch,
          })
          .eq('id', product.id);
      }
    }

    const elapsed = Date.now() - startTime;

    const summary = {
      success: true,
      batch: currentBatch,
      products_processed: results.length,
      prices_updated: pricesUpdated,
      errors: errorsCount,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        title: r.title.substring(0, 40),
        success: r.success,
        price_changed: r.price_changed,
        new_price: r.new_price,
        error: r.error,
      })),
    };

    console.log(`Completed: ${results.length} products, ${pricesUpdated} prices updated, ${errorsCount} errors, ${elapsed}ms`);

    return new Response(
      JSON.stringify(summary, null, 2),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraper failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
