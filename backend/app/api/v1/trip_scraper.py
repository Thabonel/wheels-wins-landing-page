"""
Trip Scraper API Endpoints

FastAPI endpoints for managing trip scraping operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from uuid import UUID

from ...services.trip_scraper import TripDiscoveryScraperService
from ...core.auth import get_current_admin_user
from ...core.database import get_supabase_client

router = APIRouter(prefix="/api/v1/scraper", tags=["Trip Scraper"])


class ScraperJobRequest(BaseModel):
    """Request model for creating a scraper job."""
    source_ids: List[str]
    ai_enhancement: bool = True


class ScraperJobResponse(BaseModel):
    """Response model for scraper job."""
    job_id: str
    status: str
    message: str


class ScraperProgressResponse(BaseModel):
    """Response model for scraper progress."""
    job_id: str
    status: str
    progress: float
    results_count: int
    error_message: Optional[str] = None


@router.post("/jobs", response_model=ScraperJobResponse)
async def create_scraper_job(
    request: ScraperJobRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_admin_user)
):
    """
    Create and start a new scraping job.
    
    Requires admin authentication.
    """
    try:
        async with TripDiscoveryScraperService() as scraper:
            # Create jobs for each source
            job_ids = []
            for source_id in request.source_ids:
                job_id = await scraper.create_scraper_job(source_id)
                job_ids.append(job_id)
                
                # Add scraping to background tasks
                background_tasks.add_task(
                    scraper.scrape_source,
                    source_id,
                    job_id
                )
            
            return ScraperJobResponse(
                job_id=job_ids[0] if len(job_ids) == 1 else ",".join(job_ids),
                status="started",
                message=f"Started scraping {len(job_ids)} source(s)"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=ScraperProgressResponse)
async def get_job_progress(
    job_id: str,
    current_user=Depends(get_current_admin_user)
):
    """
    Get the progress of a scraping job.
    
    Requires admin authentication.
    """
    try:
        async with TripDiscoveryScraperService() as scraper:
            job_status = await scraper.get_job_status(job_id)
            
            if not job_status:
                raise HTTPException(status_code=404, detail="Job not found")
            
            return ScraperProgressResponse(
                job_id=job_id,
                status=job_status['status'],
                progress=job_status.get('progress', 0.0),
                results_count=job_status.get('results_count', 0),
                error_message=job_status.get('error_message')
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results")
async def get_scraper_results(
    job_id: Optional[str] = None,
    source_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_admin_user)
):
    """
    Get scraper results with optional filtering.
    
    Requires admin authentication.
    """
    try:
        async with TripDiscoveryScraperService() as scraper:
            results = await scraper.get_scraper_results(
                job_id=job_id,
                source_id=source_id,
                limit=limit,
                offset=offset
            )
            
            return {
                "results": results,
                "count": len(results),
                "limit": limit,
                "offset": offset
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sources/{source_id}/test")
async def test_scraper_source(
    source_id: str,
    current_user=Depends(get_current_admin_user)
):
    """
    Test a scraper source by fetching a small sample.
    
    Requires admin authentication.
    """
    try:
        async with TripDiscoveryScraperService() as scraper:
            # Create a test job
            job_id = await scraper.create_scraper_job(source_id)
            
            # Run scraping (limited to test)
            results = await scraper.scrape_source(source_id, job_id)
            
            # Return sample results
            sample_results = results[:3] if results else []
            
            return {
                "success": len(results) > 0,
                "sample_count": len(sample_results),
                "samples": [
                    {
                        "title": r.title,
                        "description": r.description[:200] if r.description else None,
                        "quality_score": r.quality_score,
                        "ai_enhanced": r.ai_enhanced
                    }
                    for r in sample_results
                ]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}")
async def cancel_scraper_job(
    job_id: str,
    current_user=Depends(get_current_admin_user)
):
    """
    Cancel a running scraper job.
    
    Requires admin authentication.
    """
    try:
        supabase = get_supabase_client()
        
        # Update job status to cancelled
        result = supabase.table('trip_scraper_jobs')\
            .update({'status': 'cancelled'})\
            .eq('id', job_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"message": f"Job {job_id} cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))