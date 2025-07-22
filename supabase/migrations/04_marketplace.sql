-- Marketplace and Commerce Migration
-- Complete marketplace functionality with affiliate system

-- Marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('rv_parts', 'camping_gear', 'tools', 'electronics', 'accessories', 'vehicles', 'books', 'clothing', 'other')),
  subcategory TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'pending', 'inactive', 'deleted')),
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  shipping_available BOOLEAN DEFAULT false,
  shipping_cost DECIMAL(8,2),
  pickup_available BOOLEAN DEFAULT true,
  image_urls TEXT[],
  tags TEXT[],
  brand TEXT,
  model TEXT,
  year INTEGER,
  dimensions TEXT,
  weight_lbs DECIMAL(8,2),
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User wishlists
CREATE TABLE IF NOT EXISTS user_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  notes TEXT,
  price_alert_threshold DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Affiliate sales tracking
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  affiliate_code TEXT NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL, -- Percentage as decimal (e.g., 0.05 for 5%)
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'disputed', 'cancelled')),
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  payment_date TIMESTAMP WITH TIME ZONE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT DEFAULT 'internal', -- 'internal', 'amazon', 'ebay', etc.
  external_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product reviews (for marketplace items)
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, reviewer_id)
);

-- Marketplace messages (buyer-seller communication)
CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'inquiry' CHECK (message_type IN ('inquiry', 'offer', 'counteroffer', 'acceptance', 'general')),
  offer_amount DECIMAL(10,2),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_name TEXT NOT NULL,
  search_criteria JSONB NOT NULL, -- Store search filters and keywords
  notification_enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Anyone can view active listings" ON marketplace_listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can manage own listings" ON marketplace_listings
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_wishlists
CREATE POLICY "Users can manage own wishlists" ON user_wishlists
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for affiliate_sales
CREATE POLICY "Users can view own affiliate sales" ON affiliate_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own affiliate sales" ON affiliate_sales
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for product_reviews
CREATE POLICY "Anyone can view reviews" ON product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own reviews" ON product_reviews
  FOR ALL USING (auth.uid() = reviewer_id);

-- RLS Policies for marketplace_messages
CREATE POLICY "Users can view own messages" ON marketplace_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON marketplace_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for saved_searches
CREATE POLICY "Users can manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_sales_updated_at
  BEFORE UPDATE ON affiliate_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON marketplace_listings(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category_status ON marketplace_listings(category, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_featured ON marketplace_listings(is_featured, status);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_listing_id ON user_wishlists(listing_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_sale_date ON affiliate_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_date ON affiliate_sales(user_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_listing_id ON product_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_reviewer_id ON product_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_seller_id ON product_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_listing_id ON marketplace_messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_sender_id ON marketplace_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_recipient_id ON marketplace_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_created_at ON marketplace_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_notification ON saved_searches(notification_enabled);

-- Spatial indexes for location-based searches
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location ON marketplace_listings USING GIST(location);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search ON marketplace_listings USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '') || ' ' || COALESCE(model, '')));

-- Partial indexes for active listings
CREATE INDEX IF NOT EXISTS idx_marketplace_active_listings ON marketplace_listings(category, price, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_marketplace_featured_listings ON marketplace_listings(created_at DESC) WHERE is_featured = true AND status = 'active';