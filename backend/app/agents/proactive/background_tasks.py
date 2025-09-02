"""
PAM Background Task Manager - Phase 4
Intelligent background processing for continuous monitoring and proactive assistance
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid

from celery import Celery
from celery.schedules import crontab
import redis
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class TaskPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


@dataclass
class BackgroundTask:
    id: str
    name: str
    type: str
    priority: TaskPriority
    data: Dict[str, Any]
    user_id: Optional[str]
    created_at: datetime
    scheduled_for: Optional[datetime]
    max_retries: int
    retry_count: int
    timeout_seconds: int
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: float = 0.0


@dataclass
class TaskSchedule:
    name: str
    task_type: str
    schedule: str  # Cron expression
    enabled: bool
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    run_count: int


class BackgroundTaskManager:
    """Intelligent background task processing with priorities and scheduling"""
    
    def __init__(self, celery_app: Optional[Celery] = None, redis_client: Optional[redis.Redis] = None):
        self.celery_app = celery_app or self._create_celery_app()
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/2")
        
        # Task queues by priority
        self.priority_queues = {
            TaskPriority.CRITICAL: "pam_critical",
            TaskPriority.HIGH: "pam_high",
            TaskPriority.MEDIUM: "pam_medium",
            TaskPriority.LOW: "pam_low"
        }
        
        # Registered task handlers
        self.task_handlers: Dict[str, Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]] = {}
        
        # Active tasks tracking
        self.active_tasks: Dict[str, BackgroundTask] = {}
        
        # Scheduled tasks
        self.scheduled_tasks: Dict[str, TaskSchedule] = {}
        
        # Initialize default schedules
        self._initialize_default_schedules()
        
        logger.info("Background Task Manager initialized with priority queuing")
    
    def _create_celery_app(self) -> Celery:
        """Create Celery application for background tasks"""
        
        app = Celery('pam_background_tasks')
        
        # Configuration
        app.conf.update(
            broker_url='redis://localhost:6379/1',
            result_backend='redis://localhost:6379/1',
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='Australia/Sydney',
            enable_utc=True,
            task_routes={
                'pam.background.critical.*': {'queue': 'pam_critical'},
                'pam.background.high.*': {'queue': 'pam_high'},
                'pam.background.medium.*': {'queue': 'pam_medium'},
                'pam.background.low.*': {'queue': 'pam_low'},
            },
            task_default_queue='pam_medium',
            task_default_exchange='pam',
            task_default_exchange_type='direct',
            task_default_routing_key='pam_medium',
            worker_prefetch_multiplier=1,  # One task at a time for critical tasks
            task_acks_late=True,
            worker_disable_rate_limits=False,
            task_compression='gzip'
        )
        
        # Beat schedule for periodic tasks
        app.conf.beat_schedule = {
            'user_pattern_analysis': {
                'task': 'pam.background.medium.analyze_user_patterns',
                'schedule': crontab(minute=0, hour='*/2'),  # Every 2 hours
            },
            'predictive_recommendations': {
                'task': 'pam.background.medium.generate_predictive_recommendations',
                'schedule': crontab(minute=30, hour='8,12,16,20'),  # 4 times daily
            },
            'memory_consolidation': {
                'task': 'pam.background.low.consolidate_memories',
                'schedule': crontab(minute=0, hour=2),  # Daily at 2 AM
            },
            'context_monitoring': {
                'task': 'pam.background.high.monitor_user_context',
                'schedule': crontab(minute='*/15'),  # Every 15 minutes
            },
            'safety_check': {
                'task': 'pam.background.high.safety_monitoring',
                'schedule': crontab(minute='*/5'),  # Every 5 minutes
            },
            'environmental_updates': {
                'task': 'pam.background.medium.update_environmental_data',
                'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
            }
        }
        
        return app
    
    def _initialize_default_schedules(self):
        """Initialize default scheduled tasks"""
        
        self.scheduled_tasks = {
            'user_pattern_analysis': TaskSchedule(
                name='User Pattern Analysis',
                task_type='analyze_user_patterns',
                schedule='0 */2 * * *',  # Every 2 hours
                enabled=True,
                last_run=None,
                next_run=None,
                run_count=0
            ),
            'predictive_recommendations': TaskSchedule(
                name='Predictive Recommendations',
                task_type='generate_predictive_recommendations', 
                schedule='30 8,12,16,20 * * *',  # 4 times daily
                enabled=True,
                last_run=None,
                next_run=None,
                run_count=0
            ),
            'memory_consolidation': TaskSchedule(
                name='Memory Consolidation',
                task_type='consolidate_memories',
                schedule='0 2 * * *',  # Daily at 2 AM
                enabled=True,
                last_run=None,
                next_run=None,
                run_count=0
            ),
            'context_monitoring': TaskSchedule(
                name='Context Monitoring',
                task_type='monitor_user_context',
                schedule='*/15 * * * *',  # Every 15 minutes
                enabled=True,
                last_run=None,
                next_run=None,
                run_count=0
            ),
            'safety_monitoring': TaskSchedule(
                name='Safety Monitoring',
                task_type='safety_monitoring',
                schedule='*/5 * * * *',  # Every 5 minutes
                enabled=True,
                last_run=None,
                next_run=None,
                run_count=0
            )
        }
    
    def register_task_handler(
        self,
        task_type: str,
        handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]
    ):
        """Register a handler for a specific task type"""
        self.task_handlers[task_type] = handler
        logger.info(f"Registered task handler for: {task_type}")
    
    async def submit_task(
        self,
        name: str,
        task_type: str,
        data: Dict[str, Any],
        priority: TaskPriority = TaskPriority.MEDIUM,
        user_id: Optional[str] = None,
        scheduled_for: Optional[datetime] = None,
        timeout_seconds: int = 300,
        max_retries: int = 3
    ) -> str:
        """Submit a background task for processing"""
        
        try:
            task_id = str(uuid.uuid4())
            
            task = BackgroundTask(
                id=task_id,
                name=name,
                type=task_type,
                priority=priority,
                data=data,
                user_id=user_id,
                created_at=datetime.utcnow(),
                scheduled_for=scheduled_for,
                max_retries=max_retries,
                retry_count=0,
                timeout_seconds=timeout_seconds,
                status=TaskStatus.PENDING
            )
            
            # Store task metadata
            await self._store_task_metadata(task)
            
            # Determine queue based on priority
            queue = self.priority_queues[priority]
            
            # Submit to Celery
            celery_task_name = f"pam.background.{priority.name.lower()}.{task_type}"
            
            if scheduled_for:
                # Schedule for future execution
                self.celery_app.send_task(
                    celery_task_name,
                    args=[task_id, data],
                    queue=queue,
                    eta=scheduled_for,
                    task_id=task_id,
                    retry=True,
                    retry_policy={
                        'max_retries': max_retries,
                        'interval_start': 10,
                        'interval_step': 10,
                        'interval_max': 60,
                    }
                )
            else:
                # Execute immediately
                self.celery_app.send_task(
                    celery_task_name,
                    args=[task_id, data],
                    queue=queue,
                    task_id=task_id,
                    retry=True,
                    retry_policy={
                        'max_retries': max_retries,
                        'interval_start': 10,
                        'interval_step': 10,
                        'interval_max': 60,
                    }
                )
            
            self.active_tasks[task_id] = task
            
            logger.info(f"Submitted task {task_id} ({task_type}) to {queue} queue")
            return task_id
            
        except Exception as e:
            logger.error(f"Failed to submit task {task_type}: {e}")
            raise
    
    async def get_task_status(self, task_id: str) -> Optional[BackgroundTask]:
        """Get status of a background task"""
        
        try:
            # Check local cache first
            if task_id in self.active_tasks:
                return self.active_tasks[task_id]
            
            # Retrieve from storage
            return await self._retrieve_task_metadata(task_id)
            
        except Exception as e:
            logger.error(f"Failed to get task status {task_id}: {e}")
            return None
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a background task"""
        
        try:
            # Revoke from Celery
            self.celery_app.control.revoke(task_id, terminate=True)
            
            # Update status
            if task_id in self.active_tasks:
                self.active_tasks[task_id].status = TaskStatus.CANCELLED
                await self._store_task_metadata(self.active_tasks[task_id])
            
            logger.info(f"Cancelled task: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel task {task_id}: {e}")
            return False
    
    async def get_user_tasks(self, user_id: str, status: Optional[TaskStatus] = None) -> List[BackgroundTask]:
        """Get all tasks for a specific user"""
        
        try:
            tasks = []
            
            # Get from active tasks
            for task in self.active_tasks.values():
                if task.user_id == user_id:
                    if status is None or task.status == status:
                        tasks.append(task)
            
            # Could also retrieve historical tasks from database
            return tasks
            
        except Exception as e:
            logger.error(f"Failed to get user tasks for {user_id}: {e}")
            return []
    
    async def update_task_progress(self, task_id: str, progress: float, status_message: str = ""):
        """Update task progress"""
        
        try:
            if task_id in self.active_tasks:
                self.active_tasks[task_id].progress = progress
                await self._store_task_metadata(self.active_tasks[task_id])
                
                # Store in Redis for real-time updates
                await self._store_task_progress(task_id, progress, status_message)
                
                logger.debug(f"Updated task {task_id} progress: {progress}%")
            
        except Exception as e:
            logger.error(f"Failed to update task progress {task_id}: {e}")
    
    async def complete_task(self, task_id: str, result: Dict[str, Any]):
        """Mark task as completed with result"""
        
        try:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                task.status = TaskStatus.COMPLETED
                task.result = result
                task.progress = 100.0
                
                await self._store_task_metadata(task)
                
                # Trigger any completion handlers
                await self._handle_task_completion(task)
                
                logger.info(f"Completed task: {task_id}")
            
        except Exception as e:
            logger.error(f"Failed to complete task {task_id}: {e}")
    
    async def fail_task(self, task_id: str, error: str):
        """Mark task as failed"""
        
        try:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                task.status = TaskStatus.FAILED
                task.error = error
                
                await self._store_task_metadata(task)
                
                # Trigger any error handlers
                await self._handle_task_failure(task)
                
                logger.error(f"Failed task {task_id}: {error}")
            
        except Exception as e:
            logger.error(f"Failed to update task failure {task_id}: {e}")
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get background task system health metrics"""
        
        try:
            # Count tasks by status
            status_counts = {}
            for status in TaskStatus:
                status_counts[status.value] = 0
            
            for task in self.active_tasks.values():
                status_counts[task.status.value] += 1
            
            # Queue lengths (would query Celery in production)
            queue_lengths = {
                "critical": 0,
                "high": 0, 
                "medium": 0,
                "low": 0
            }
            
            # Worker status (would query Celery workers)
            worker_count = 0
            
            # Recent performance metrics
            performance_metrics = await self._get_performance_metrics()
            
            return {
                "active_tasks": len(self.active_tasks),
                "task_counts_by_status": status_counts,
                "queue_lengths": queue_lengths,
                "worker_count": worker_count,
                "scheduled_tasks": len([s for s in self.scheduled_tasks.values() if s.enabled]),
                "performance_metrics": performance_metrics,
                "system_status": "healthy" if len(self.active_tasks) < 100 else "busy"
            }
            
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {"error": str(e)}
    
    async def _store_task_metadata(self, task: BackgroundTask):
        """Store task metadata in Redis"""
        
        try:
            key = f"pam:task:{task.id}"
            data = {
                "id": task.id,
                "name": task.name,
                "type": task.type,
                "priority": task.priority.value,
                "status": task.status.value,
                "user_id": task.user_id,
                "created_at": task.created_at.isoformat(),
                "scheduled_for": task.scheduled_for.isoformat() if task.scheduled_for else None,
                "progress": task.progress,
                "retry_count": task.retry_count,
                "max_retries": task.max_retries,
                "result": task.result,
                "error": task.error
            }
            
            await self.redis_client.hset(key, mapping=data)
            await self.redis_client.expire(key, 86400 * 7)  # 7 days TTL
            
        except Exception as e:
            logger.error(f"Failed to store task metadata: {e}")
    
    async def _retrieve_task_metadata(self, task_id: str) -> Optional[BackgroundTask]:
        """Retrieve task metadata from Redis"""
        
        try:
            key = f"pam:task:{task_id}"
            data = await self.redis_client.hgetall(key)
            
            if not data:
                return None
            
            return BackgroundTask(
                id=data['id'],
                name=data['name'],
                type=data['type'],
                priority=TaskPriority(int(data['priority'])),
                data={},  # Would need to store separately
                user_id=data.get('user_id'),
                created_at=datetime.fromisoformat(data['created_at']),
                scheduled_for=datetime.fromisoformat(data['scheduled_for']) if data.get('scheduled_for') else None,
                max_retries=int(data['max_retries']),
                retry_count=int(data['retry_count']),
                timeout_seconds=300,  # Default
                status=TaskStatus(data['status']),
                result=json.loads(data['result']) if data.get('result') else None,
                error=data.get('error'),
                progress=float(data.get('progress', 0))
            )
            
        except Exception as e:
            logger.error(f"Failed to retrieve task metadata: {e}")
            return None
    
    async def _store_task_progress(self, task_id: str, progress: float, message: str):
        """Store real-time task progress"""
        
        try:
            key = f"pam:task:progress:{task_id}"
            data = {
                "progress": progress,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.redis_client.hset(key, mapping=data)
            await self.redis_client.expire(key, 3600)  # 1 hour TTL
            
            # Publish to channel for real-time updates
            await self.redis_client.publish(f"task_progress:{task_id}", json.dumps(data))
            
        except Exception as e:
            logger.error(f"Failed to store task progress: {e}")
    
    async def _handle_task_completion(self, task: BackgroundTask):
        """Handle task completion events"""
        
        try:
            # Log completion
            logger.info(f"Task {task.id} ({task.type}) completed successfully")
            
            # Could trigger notifications, webhooks, etc.
            if task.user_id:
                # Notify user of completion if relevant
                pass
            
            # Cleanup if needed
            if task.type in ['temporary_analysis', 'one_time_cleanup']:
                # Remove from active tasks after some delay
                await asyncio.sleep(300)  # 5 minutes
                self.active_tasks.pop(task.id, None)
            
        except Exception as e:
            logger.error(f"Failed to handle task completion: {e}")
    
    async def _handle_task_failure(self, task: BackgroundTask):
        """Handle task failure events"""
        
        try:
            logger.error(f"Task {task.id} ({task.type}) failed: {task.error}")
            
            # Could trigger alerts, notifications, etc.
            if task.priority in [TaskPriority.CRITICAL, TaskPriority.HIGH]:
                # Alert administrators
                pass
            
            if task.user_id:
                # Notify user if appropriate
                pass
            
        except Exception as e:
            logger.error(f"Failed to handle task failure: {e}")
    
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        
        try:
            # Would collect real metrics in production
            return {
                "average_task_duration": 45.2,
                "success_rate": 0.94,
                "queue_wait_time": 2.1,
                "memory_usage_mb": 156,
                "cpu_usage_percent": 23.5
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {}
    
    async def cleanup_old_tasks(self, older_than_days: int = 7):
        """Clean up old completed tasks"""
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
            
            to_remove = []
            for task_id, task in self.active_tasks.items():
                if task.created_at < cutoff_date and task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                    to_remove.append(task_id)
            
            for task_id in to_remove:
                self.active_tasks.pop(task_id, None)
                # Clean up Redis keys
                await self.redis_client.delete(f"pam:task:{task_id}")
                await self.redis_client.delete(f"pam:task:progress:{task_id}")
            
            logger.info(f"Cleaned up {len(to_remove)} old tasks")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old tasks: {e}")
    
    def get_task_handlers(self) -> Dict[str, str]:
        """Get registered task handlers"""
        return {task_type: handler.__name__ for task_type, handler in self.task_handlers.items()}
    
    def get_scheduled_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Get scheduled task information"""
        return {
            name: {
                "name": schedule.name,
                "task_type": schedule.task_type,
                "schedule": schedule.schedule,
                "enabled": schedule.enabled,
                "last_run": schedule.last_run.isoformat() if schedule.last_run else None,
                "next_run": schedule.next_run.isoformat() if schedule.next_run else None,
                "run_count": schedule.run_count
            }
            for name, schedule in self.scheduled_tasks.items()
        }