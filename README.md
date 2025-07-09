# Welcome to your Wheels and Wins project

## Project info

**URL**: <YOUR_PROJECT_URL>

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

Follow these steps:
The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4fd8d7d4-1c59-4996-a0dd-48be31131e7c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Environment Variables

The trip planner uses several external APIs. To enable phone coverage overlays, set `OPEN_CELL_ID_API_KEY` in your `.env` file.

For Supabase connectivity you must also provide:

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

These values are read in `src/integrations/supabase/client.ts` when initializing the Supabase client.

The trip planner requires a Mapbox token for map display. A default token is provided in `src/.env`, and the Vite configuration now loads this file automatically. If you need to use your own Mapbox account, set `VITE_MAPBOX_TOKEN` in a `.env` file at the project root or replace the token in `src/.env`.

## Running Tests

Before committing changes, run the project's test suites.

### Frontend

Install Node dependencies and execute the Vitest suite:

```bash
npm install
npm test
```

### Backend

Install Python dev requirements and run the backend tests:

```bash
pip install -r backend/requirements-dev.txt
pytest
```

## Troubleshooting

If you run into errors or need help debugging, see the [Common Issues guide](docs/guides/troubleshooting/common-issues.md).


## Phase 2 Complete

### New Agents
- `WinsNode` – financial management
- `WheelsNode` – travel and vehicle planning
- `SocialNode` – community features
- `YouNode` – personal dashboard tasks
- `ShopNode` – e-commerce operations
- `AdminNode` – management utilities
- `MemoryNode` – conversation memory

### New Endpoints
- **Authentication**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- **Health Checks**: `GET /health`, `GET /health/detailed`
- **WebSocket**: `wss://pam-backend.onrender.com/ws/{user_id}`
- **Chat History**: `GET /chat/sessions/{session_id}`
- **User Profile**: `GET /users/profile`, `PUT /users/profile`, `POST /users/upload-avatar`
- **Budgets**: `GET/POST/PUT/DELETE /budgets{/{id}}`
- **Expenses**: `GET/POST/PUT/DELETE /expenses{/{id}}`
- **Trips**: `GET /trips`, `POST /trips`
- **Vehicles**: `GET/POST/PUT/DELETE /vehicles{/{id}}`

## Phase 3 Complete

### Income Generation
- **Multiple Income Sources**: track various income streams
- **Goal Setting**: monitor progress toward earning targets
- **Income Analytics**: visualize earning trends
- **Money Maker Ideas**: organize new revenue opportunities
- **PAM Income Advice**: AI suggestions to boost income

## Intelligence & Proactivity

- Deep emotional intelligence with relationship-aware responses
- Background analysis of user data to anticipate needs
- Proactive alerts for weather, budget, and maintenance events
- Smart suggestions to plan routes, fuel stops, and attractions
- Timely notifications keep users prepared for upcoming tasks

## Render (Docker) Deployment

This repo deploys via the root-level Dockerfile with Python 3.11.9 for reliable TTS package installation.

**Setup Steps:**
1. In Render dashboard → Web Service → Settings, set **Runtime → Docker**
2. Health check path: `/health` (auto-detected)
3. Port 10000 is exposed automatically

**Background Worker:**
- Duplicate the web service in Render
- Point to same repo and Dockerfile
- Set Start Command: `celery -A app.workers.celery worker --loglevel=info --concurrency=2`
- Use same environment variables (DATABASE_URL, REDIS_URL, etc.)

**CI Protection:**
- GitHub Action prevents `runtime.txt` regression that would break Docker builds
- All dependencies are pinned in `requirements.txt` for reproducible builds
