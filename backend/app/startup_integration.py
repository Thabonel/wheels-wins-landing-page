
# Add this to your app/main.py startup sequence

from app.monitoring.integration_manager import get_integration_manager

async def startup_optimized_components():
    """Initialize optimized backend components."""
    try:
        integration_manager = await get_integration_manager()
        await integration_manager.initialize()
        logger.info("✅ Optimized backend components started")
    except Exception as e:
        logger.error(f"❌ Failed to start optimized components: {e}")
        
async def shutdown_optimized_components():
    """Shutdown optimized backend components."""
    try:
        integration_manager = await get_integration_manager()
        await integration_manager.shutdown()
        logger.info("✅ Optimized backend components stopped")
    except Exception as e:
        logger.error(f"❌ Failed to stop optimized components: {e}")

# Add to your @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup
#     await startup_optimized_components()
#     yield
#     # Shutdown
#     await shutdown_optimized_components()
