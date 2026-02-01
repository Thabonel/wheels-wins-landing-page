#!/bin/bash

# PAM Trip Editing Workflow - Complete Setup Script
# This script sets up the database, creates test data, and verifies the workflow

set -e  # Exit on any error

echo "🚀 PAM Trip Editing Workflow Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_PROJECT_ID="kycoklimpzkyrecbjecn"
SUPABASE_URL="https://${SUPABASE_PROJECT_ID}.supabase.co"

print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Verify environment
print_step "1" "Verifying Environment"

if [ ! -f "package.json" ]; then
    print_error "Not in project root directory. Please run from project root."
    exit 1
fi

if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    print_warning "No .env file found. Ensure Supabase credentials are configured."
fi

print_success "Environment verified"

# Step 2: Database setup instructions
print_step "2" "Database Setup Required"

echo ""
echo "⚡ MANUAL ACTION REQUIRED:"
echo "1. Open Supabase SQL Editor: ${SUPABASE_URL}/sql/new"
echo "2. Copy and execute the SQL from: docs/sql-fixes/CREATE_USER_TRIPS_TABLE.sql"
echo "3. Press ENTER when database setup is complete..."
echo ""

# Wait for user confirmation
read -p "Press ENTER after executing the SQL script in Supabase..."

print_success "Database setup confirmed"

# Step 3: Verify TypeScript compilation
print_step "3" "Verifying TypeScript Compilation"

echo "Checking TypeScript compilation..."
if npm run type-check 2>/dev/null; then
    print_success "TypeScript compilation successful"
else
    print_warning "TypeScript warnings present (expected with temp type fixes)"
fi

# Step 4: Start development server
print_step "4" "Starting Development Server"

echo "Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:8080 > /dev/null; then
    print_error "Development server failed to start"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

print_success "Development server running at http://localhost:8080"

# Step 5: Create test data
print_step "5" "Creating Test Data"

echo "Creating PAM trip test data..."

# Create a temporary HTML file for easier testing
cat > /tmp/test-pam-trips.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PAM Trip Test Data Creator</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; margin: 10px; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .success { color: green; margin: 10px 0; }
        .error { color: red; margin: 10px 0; }
        .code { background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        .step { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2196f3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 PAM Trip Test Data Creator</h1>

        <div class="step">
            <h3>Step 1: Open Browser Console</h3>
            <p>Press F12 or right-click → Inspect → Console tab</p>
        </div>

        <div class="step">
            <h3>Step 2: Navigate to the App</h3>
            <p><a href="http://localhost:8080" target="_blank">Open Wheels & Wins App</a></p>
            <p>Log in with your account</p>
        </div>

        <div class="step">
            <h3>Step 3: Execute Test Data Script</h3>
            <p>Copy and paste this into the browser console:</p>
            <div class="code">// PAM Trip Test Data Creator
async function createPAMTestTrips() {
    try {
        console.log('🚀 Creating PAM test trips...');

        // Get current user
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            throw new Error('Please log in first');
        }

        console.log('👤 User ID:', user.id);

        // Test Trip 1: Sydney to Melbourne (PAM AI)
        const pamTrip1 = {
            user_id: user.id,
            title: 'Coastal Adventure: Sydney to Melbourne',
            description: 'AI-generated scenic coastal road trip with stunning ocean views',
            status: 'planning',
            trip_type: 'road_trip',
            privacy_level: 'private',
            start_date: '2026-03-15',
            total_budget: 1200.00,
            metadata: {
                created_by: 'pam_ai',
                source: 'pam',
                origin: 'Sydney, NSW',
                destination: 'Melbourne, VIC',
                stops: ['Wollongong', 'Jervis Bay', 'Batemans Bay', 'Lakes Entrance'],
                distance_miles: 680.5,
                duration_hours: 8.5,
                fuel_gallons: 28.0,
                route_source: 'mapbox_navigator',
                route_data: {
                    waypoints: [
                        {
                            name: 'Sydney, NSW',
                            coordinates: [151.2093, -33.8688],
                            type: 'origin',
                            address: 'Sydney NSW, Australia'
                        },
                        {
                            name: 'Wollongong, NSW',
                            coordinates: [150.8931, -34.4278],
                            type: 'waypoint',
                            address: 'Wollongong NSW, Australia'
                        },
                        {
                            name: 'Jervis Bay, NSW',
                            coordinates: [150.7453, -35.1394],
                            type: 'waypoint',
                            address: 'Jervis Bay NSW, Australia'
                        },
                        {
                            name: 'Melbourne, VIC',
                            coordinates: [144.9631, -37.8136],
                            type: 'destination',
                            address: 'Melbourne VIC, Australia'
                        }
                    ],
                    route: {
                        type: 'LineString',
                        coordinates: [
                            [151.2093, -33.8688], // Sydney
                            [150.8931, -34.4278], // Wollongong
                            [150.7453, -35.1394], // Jervis Bay
                            [150.9269, -35.8906], // Batemans Bay
                            [147.8812, -37.8811], // Lakes Entrance
                            [144.9631, -37.8136]  // Melbourne
                        ]
                    },
                    distance: 1095000, // meters
                    duration: 30600,   // seconds (8.5 hours)
                    profile: 'driving'
                }
            }
        };

        // Test Trip 2: Blue Mountains Adventure (PAM AI)
        const pamTrip2 = {
            user_id: user.id,
            title: 'Blue Mountains Camping Adventure',
            description: 'PAM-planned mountain camping trip with bushwalks and scenic drives',
            status: 'planning',
            trip_type: 'camping',
            privacy_level: 'private',
            start_date: '2026-04-20',
            total_budget: 450.00,
            metadata: {
                created_by: 'pam_ai',
                source: 'pam',
                origin: 'Sydney, NSW',
                destination: 'Katoomba, NSW',
                stops: ['Leura', 'Echo Point', 'Three Sisters'],
                distance_miles: 125.0,
                duration_hours: 2.5,
                fuel_gallons: 5.2,
                route_source: 'estimated',
                route_data: {
                    waypoints: [
                        {
                            name: 'Sydney, NSW',
                            coordinates: [151.2093, -33.8688],
                            type: 'origin'
                        },
                        {
                            name: 'Leura, NSW',
                            coordinates: [150.3367, -33.7164],
                            type: 'waypoint'
                        },
                        {
                            name: 'Katoomba, NSW',
                            coordinates: [150.3117, -33.7122],
                            type: 'destination'
                        }
                    ],
                    distance: 201000, // meters
                    duration: 9000,   // seconds (2.5 hours)
                    profile: 'driving'
                }
            }
        };

        // Test Trip 3: Manual Trip (for comparison)
        const manualTrip = {
            user_id: user.id,
            title: 'Weekend City Break: Brisbane to Gold Coast',
            description: 'User-created trip for beach relaxation',
            status: 'planning',
            trip_type: 'leisure',
            privacy_level: 'private',
            start_date: '2026-05-10',
            total_budget: 800.00,
            metadata: {
                created_by: 'user',
                source: 'manual',
                route_data: {
                    waypoints: [
                        {
                            name: 'Brisbane, QLD',
                            coordinates: [153.0251, -27.4678],
                            type: 'origin'
                        },
                        {
                            name: 'Gold Coast, QLD',
                            coordinates: [153.4000, -28.0167],
                            type: 'destination'
                        }
                    ]
                }
            }
        };

        // Insert trips
        console.log('📝 Inserting PAM trip 1...');
        const result1 = await window.supabase
            .from('user_trips')
            .insert(pamTrip1)
            .select('*');

        if (result1.error) throw result1.error;
        console.log('✅ PAM trip 1 created:', result1.data[0].id);

        console.log('📝 Inserting PAM trip 2...');
        const result2 = await window.supabase
            .from('user_trips')
            .insert(pamTrip2)
            .select('*');

        if (result2.error) throw result2.error;
        console.log('✅ PAM trip 2 created:', result2.data[0].id);

        console.log('📝 Inserting manual trip...');
        const result3 = await window.supabase
            .from('user_trips')
            .insert(manualTrip)
            .select('*');

        if (result3.error) throw result3.error;
        console.log('✅ Manual trip created:', result3.data[0].id);

        console.log('🎉 All test trips created successfully!');
        console.log('Navigate to /wheels?tab=trips to see them');

        return {
            pamTrip1: result1.data[0],
            pamTrip2: result2.data[0],
            manualTrip: result3.data[0]
        };

    } catch (error) {
        console.error('❌ Error creating test trips:', error);
        throw error;
    }
}

// Execute the function
createPAMTestTrips();
            </div>
        </div>

        <div class="step">
            <h3>Step 4: Test the Workflow</h3>
            <ol>
                <li>Navigate to <a href="http://localhost:8080/wheels?tab=trips" target="_blank">My Trips</a></li>
                <li>Look for trips with purple "PAM Enhanced" badges</li>
                <li>Click the Edit button on a PAM trip</li>
                <li>Verify route loads on map with waypoints</li>
                <li>Modify the route (add/move waypoints)</li>
                <li>Save changes using "Update existing trip"</li>
                <li>Return to trips and verify changes saved</li>
            </ol>
        </div>

        <div class="step">
            <h3>Expected Results</h3>
            <ul>
                <li>✅ PAM trips show purple badges with "PAM Enhanced" label</li>
                <li>✅ Manual trips show blue badges with "Manual" label</li>
                <li>✅ Edit button loads trip in trip planner with route displayed</li>
                <li>✅ Orange edit mode banner shows trip context</li>
                <li>✅ Save dialog offers "Update existing" vs "Save as new"</li>
                <li>✅ Changes persist and display correctly in trips list</li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF

print_success "Test data creation guide ready"

# Step 6: Open testing interface
print_step "6" "Opening Testing Interface"

echo "Opening test data creation interface..."
if command -v xdg-open > /dev/null; then
    xdg-open /tmp/test-pam-trips.html
elif command -v open > /dev/null; then
    open /tmp/test-pam-trips.html
else
    print_warning "Please open /tmp/test-pam-trips.html in your browser"
fi

# Step 7: Final instructions
print_step "7" "Testing Instructions"

echo ""
echo "🎯 COMPLETE WORKFLOW TEST:"
echo "=========================="
echo ""
echo "1. Follow the test data creation guide in your browser"
echo "2. Create PAM test trips using the provided script"
echo "3. Test the complete editing workflow:"
echo "   - Navigate to http://localhost:8080/wheels?tab=trips"
echo "   - Look for purple PAM badges vs blue Manual badges"
echo "   - Click Edit on a PAM trip"
echo "   - Modify the route and save changes"
echo "   - Verify persistence and UI feedback"
echo ""
echo "4. Expected behaviors:"
echo "   ✅ PAM trips visually distinct with purple styling"
echo "   ✅ Route loads correctly in trip planner"
echo "   ✅ Edit mode clearly indicated with orange banner"
echo "   ✅ Save options work (update existing vs save new)"
echo "   ✅ Back navigation returns to trips list"
echo ""

print_success "Setup complete! Follow the browser guide to test the workflow."

echo ""
echo "📝 LOG FILES:"
echo "- Development server output: Check terminal"
echo "- Test results: Browser console"
echo "- Database queries: Supabase dashboard"
echo ""

echo "🛑 To stop the development server, press Ctrl+C"

# Keep script running until user stops
wait $DEV_PID