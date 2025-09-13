# Shop

## Overview
The Shop page provides a comprehensive e-commerce platform with automated affiliate product synchronization from Digistore24 and curated products for RV travelers.

## Features

### Core Shopping Features
- **Featured Carousel:** A carousel that showcases featured products.
- **Product Filters:** Tabs to filter products by category (e.g., "All", "Affiliate", "Digital").
- **Product Grid:** A grid that displays the products based on the selected filter.
- **PAM Recommendations:** A section that displays personalized product recommendations from PAM.
- **Personalized Recommendations:** The shop can display personalized product recommendations based on the user's interests and browsing history.
- **Shopping Analytics:** The shop tracks user interactions with products to provide better recommendations.

### Digistore24 Integration
- **Automated Product Sync:** Daily synchronization of relevant products from Digistore24 marketplace
- **Commission Tracking:** Real-time tracking of affiliate earnings and conversions
- **IPN Webhook Handler:** Secure payment notification processing with SHA-512 validation
- **Multi-Category Import:** Products from 30+ categories including:
  - Travel & Tourism
  - Personal Development
  - Health & Wellness
  - Spirituality & Meditation
  - Business & Remote Work
  - Creative Hobbies
  - Technology & Digital Nomad Tools
  - And many more lifestyle categories

### Product Display Enhancements
- **Commission Badges:** Display commission percentage for affiliate products
- **Vendor Ratings:** Show vendor credibility with star ratings
- **Auto-Approval Status:** Indicate products with automatic affiliate approval
- **Target Audience Tags:** Products tagged for specific demographics (women travelers, digital nomads, etc.)
- **Regional Pricing:** Automatic currency conversion based on user location

### E-commerce Infrastructure
- **Thank You Page:** Custom validation and conversion tracking
- **Affiliate Link Generation:** Automatic creation of tracked affiliate URLs
- **Database Integration:** Full product synchronization with local database
- **Admin Controls:** Manual sync triggers and monitoring dashboard

## Technical Implementation

### Backend Services
- `digistore24.py`: IPN webhook handler for payment notifications
- `digistore24_marketplace.py`: Marketplace API integration service
- `digistore24_sync.py`: Automated daily product synchronization worker

### Frontend Integration
- `digistore24Service.ts`: Frontend service for checkout and tracking
- `ThankYouDigistore24.tsx`: Purchase confirmation and validation page
- Enhanced `ProductCard.tsx`: Display commission and vendor information

### Database Schema
- Extended `shop_products` table with Digistore24 fields
- New `digistore24_sync_logs` table for monitoring
- `digistore24_webhook_logs` for debugging and auditing
- Enhanced `affiliate_sales` table for commission tracking

## Components
- `Shop.tsx`: Main component for the Shop page with Digistore24 integration
- `FeaturedCarousel.tsx`: Component for the featured products carousel
- `ProductFilters.tsx`: Component for the product filters
- `ProductGrid.tsx`: Component for the product grid
- `PamRecommendations.tsx`: Component for the PAM recommendations section
- `ProductCard.tsx`: Enhanced with commission badges and vendor ratings
- `ThankYouDigistore24.tsx`: Digistore24 purchase confirmation page

## Configuration
Environment variables required:
- `DIGISTORE24_VENDOR_ID`: Your Digistore24 vendor ID
- `DIGISTORE24_API_KEY`: API key for marketplace access
- `DIGISTORE24_IPN_PASSPHRASE`: Secure passphrase for webhook validation
- `DIGISTORE24_THANK_YOU_PAGE_KEY`: Key for thank you page validation
- `DIGISTORE24_AUTO_IMPORT_CATEGORIES`: Comma-separated list of categories to import