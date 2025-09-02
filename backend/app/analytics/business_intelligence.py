"""
PAM Phase 8: Advanced Analytics and Business Intelligence
Comprehensive analytics system providing deep insights into user behavior, system performance, and business metrics.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import plotly.graph_objects as go
import plotly.express as px

from ..core.base_agent import PAMBaseAgent
from ..integrations.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class AnalyticsType(Enum):
    """Analytics types"""
    USER_BEHAVIOR = "user_behavior"
    SYSTEM_PERFORMANCE = "system_performance"
    BUSINESS_METRICS = "business_metrics"
    PREDICTIVE = "predictive"
    ANOMALY_DETECTION = "anomaly_detection"
    COHORT_ANALYSIS = "cohort_analysis"
    FUNNEL_ANALYSIS = "funnel_analysis"
    RETENTION_ANALYSIS = "retention_analysis"
    REVENUE_ANALYSIS = "revenue_analysis"
    OPERATIONAL = "operational"

class MetricCategory(Enum):
    """Metric categories"""
    ENGAGEMENT = "engagement"
    PERFORMANCE = "performance"
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    QUALITY = "quality"
    GROWTH = "growth"
    SATISFACTION = "satisfaction"

class VisualizationType(Enum):
    """Visualization types"""
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    HEATMAP = "heatmap"
    SCATTER_PLOT = "scatter_plot"
    FUNNEL = "funnel"
    COHORT_TABLE = "cohort_table"
    GEOGRAPHIC_MAP = "geographic_map"
    TREE_MAP = "tree_map"
    SANKEY_DIAGRAM = "sankey_diagram"

@dataclass
class AnalyticsQuery:
    """Analytics query definition"""
    query_id: str
    query_name: str
    analytics_type: AnalyticsType
    metrics: List[str]
    dimensions: List[str]
    filters: Dict[str, Any]
    time_range: Dict[str, datetime]
    aggregation: str
    visualization: VisualizationType

@dataclass
class Insight:
    """Business intelligence insight"""
    insight_id: str
    title: str
    description: str
    category: MetricCategory
    confidence_score: float
    impact_score: float
    actionable: bool
    recommendations: List[str]
    data_points: Dict[str, Any]
    generated_at: datetime
    expires_at: Optional[datetime] = None

@dataclass
class Dashboard:
    """Analytics dashboard definition"""
    dashboard_id: str
    dashboard_name: str
    widgets: List[Dict[str, Any]]
    layout: Dict[str, Any]
    refresh_schedule: str
    access_permissions: List[str]
    filters: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class PAMBusinessIntelligenceSystem:
    """Advanced analytics and business intelligence system"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.analytics_queries: Dict[str, AnalyticsQuery] = {}
        self.dashboards: Dict[str, Dashboard] = {}
        self.cached_results: Dict[str, Any] = {}
        self.ml_models: Dict[str, Any] = {}
        self.real_time_metrics: Dict[str, Any] = {}
        
    async def initialize(self):
        """Initialize business intelligence system"""
        try:
            await self._setup_analytics_tables()
            await self._load_analytics_queries()
            await self._initialize_ml_models()
            await self._setup_real_time_metrics()
            logger.info("Business intelligence system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize BI system: {e}")
    
    async def generate_user_behavior_analytics(self, time_range: Dict[str, datetime], filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate comprehensive user behavior analytics"""
        try:
            # User engagement metrics
            engagement_metrics = await self._calculate_engagement_metrics(time_range, filters)
            
            # User journey analysis
            journey_analysis = await self._analyze_user_journeys(time_range, filters)
            
            # Feature adoption analysis
            feature_adoption = await self._analyze_feature_adoption(time_range, filters)
            
            # User segmentation
            user_segments = await self._perform_user_segmentation(time_range, filters)
            
            # Cohort analysis
            cohort_data = await self._perform_cohort_analysis(time_range, filters)
            
            # Churn prediction
            churn_predictions = await self._predict_user_churn(filters)
            
            # Behavioral insights
            behavioral_insights = await self._generate_behavioral_insights(
                engagement_metrics, journey_analysis, feature_adoption
            )
            
            return {
                'analytics_type': AnalyticsType.USER_BEHAVIOR.value,
                'time_range': {
                    'start': time_range['start'].isoformat(),
                    'end': time_range['end'].isoformat()
                },
                'engagement_metrics': engagement_metrics,
                'journey_analysis': journey_analysis,
                'feature_adoption': feature_adoption,
                'user_segments': user_segments,
                'cohort_analysis': cohort_data,
                'churn_predictions': churn_predictions,
                'insights': behavioral_insights,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate user behavior analytics: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def generate_system_performance_analytics(self, time_range: Dict[str, datetime]) -> Dict[str, Any]:
        """Generate system performance analytics"""
        try:
            # Performance metrics
            performance_metrics = await self._calculate_system_performance_metrics(time_range)
            
            # Error analysis
            error_analysis = await self._analyze_system_errors(time_range)
            
            # Resource utilization
            resource_utilization = await self._analyze_resource_utilization(time_range)
            
            # Response time analysis
            response_time_analysis = await self._analyze_response_times(time_range)
            
            # Capacity planning
            capacity_insights = await self._generate_capacity_insights(
                performance_metrics, resource_utilization
            )
            
            # Anomaly detection
            anomalies = await self._detect_performance_anomalies(time_range)
            
            # Performance trends
            performance_trends = await self._analyze_performance_trends(time_range)
            
            return {
                'analytics_type': AnalyticsType.SYSTEM_PERFORMANCE.value,
                'time_range': {
                    'start': time_range['start'].isoformat(),
                    'end': time_range['end'].isoformat()
                },
                'performance_metrics': performance_metrics,
                'error_analysis': error_analysis,
                'resource_utilization': resource_utilization,
                'response_time_analysis': response_time_analysis,
                'capacity_insights': capacity_insights,
                'anomalies': anomalies,
                'performance_trends': performance_trends,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate system performance analytics: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def generate_business_metrics_analytics(self, time_range: Dict[str, datetime]) -> Dict[str, Any]:
        """Generate business metrics analytics"""
        try:
            # Revenue analytics
            revenue_analytics = await self._analyze_revenue_metrics(time_range)
            
            # User acquisition metrics
            acquisition_metrics = await self._analyze_user_acquisition(time_range)
            
            # Retention metrics
            retention_metrics = await self._analyze_user_retention(time_range)
            
            # Growth metrics
            growth_metrics = await self._calculate_growth_metrics(time_range)
            
            # Market analysis
            market_analysis = await self._perform_market_analysis(time_range)
            
            # Competitive analysis
            competitive_insights = await self._generate_competitive_insights(time_range)
            
            # Business forecasting
            business_forecasts = await self._generate_business_forecasts(
                revenue_analytics, growth_metrics, retention_metrics
            )
            
            # Key business insights
            business_insights = await self._generate_business_insights(
                revenue_analytics, acquisition_metrics, retention_metrics, growth_metrics
            )
            
            return {
                'analytics_type': AnalyticsType.BUSINESS_METRICS.value,
                'time_range': {
                    'start': time_range['start'].isoformat(),
                    'end': time_range['end'].isoformat()
                },
                'revenue_analytics': revenue_analytics,
                'acquisition_metrics': acquisition_metrics,
                'retention_metrics': retention_metrics,
                'growth_metrics': growth_metrics,
                'market_analysis': market_analysis,
                'competitive_insights': competitive_insights,
                'business_forecasts': business_forecasts,
                'insights': business_insights,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate business metrics analytics: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def create_custom_dashboard(self, dashboard_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create custom analytics dashboard"""
        try:
            dashboard_id = f"dashboard_{int(datetime.utcnow().timestamp())}"
            
            # Validate dashboard configuration
            validation_result = await self._validate_dashboard_config(dashboard_config)
            if not validation_result['valid']:
                return {'status': 'error', 'message': validation_result['errors']}
            
            # Create dashboard widgets
            widgets = []
            for widget_config in dashboard_config['widgets']:
                widget = await self._create_dashboard_widget(widget_config)
                widgets.append(widget)
            
            # Create dashboard
            dashboard = Dashboard(
                dashboard_id=dashboard_id,
                dashboard_name=dashboard_config['name'],
                widgets=widgets,
                layout=dashboard_config.get('layout', {}),
                refresh_schedule=dashboard_config.get('refresh_schedule', 'hourly'),
                access_permissions=dashboard_config.get('access_permissions', ['admin']),
                filters=dashboard_config.get('filters', {}),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Store dashboard
            self.dashboards[dashboard_id] = dashboard
            await self._store_dashboard(dashboard)
            
            # Generate initial data for dashboard
            dashboard_data = await self._generate_dashboard_data(dashboard)
            
            return {
                'status': 'created',
                'dashboard_id': dashboard_id,
                'dashboard': asdict(dashboard),
                'initial_data': dashboard_data,
                'share_url': await self._generate_dashboard_share_url(dashboard_id)
            }
            
        except Exception as e:
            logger.error(f"Failed to create custom dashboard: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def generate_predictive_analytics(self, prediction_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate predictive analytics"""
        try:
            prediction_models = {
                'user_churn': self._predict_user_churn_advanced,
                'revenue_forecast': self._forecast_revenue,
                'demand_prediction': self._predict_demand,
                'capacity_planning': self._predict_capacity_needs,
                'seasonal_trends': self._predict_seasonal_trends,
                'feature_adoption': self._predict_feature_adoption,
                'user_lifetime_value': self._predict_user_ltv,
                'market_opportunities': self._predict_market_opportunities
            }
            
            predictor = prediction_models.get(prediction_type)
            if not predictor:
                return {'status': 'error', 'message': 'Prediction type not supported'}
            
            # Generate predictions
            predictions = await predictor(context)
            
            # Calculate confidence intervals
            confidence_intervals = await self._calculate_confidence_intervals(predictions)
            
            # Generate recommendations based on predictions
            recommendations = await self._generate_predictive_recommendations(
                prediction_type, predictions
            )
            
            return {
                'analytics_type': AnalyticsType.PREDICTIVE.value,
                'prediction_type': prediction_type,
                'predictions': predictions,
                'confidence_intervals': confidence_intervals,
                'recommendations': recommendations,
                'model_accuracy': predictions.get('model_accuracy', 0),
                'generated_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(days=7)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate predictive analytics: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def detect_anomalies(self, metric_type: str, time_range: Dict[str, datetime]) -> Dict[str, Any]:
        """Detect anomalies in system metrics"""
        try:
            # Get metric data
            metric_data = await self._get_metric_data(metric_type, time_range)
            
            if not metric_data:
                return {'status': 'no_data', 'message': 'No data available for anomaly detection'}
            
            # Prepare data for anomaly detection
            features = await self._prepare_anomaly_detection_features(metric_data)
            
            # Apply anomaly detection algorithms
            isolation_forest = IsolationForest(contamination=0.1, random_state=42)
            anomaly_scores = isolation_forest.fit_predict(features)
            
            # Identify anomalies
            anomalies = []
            for i, (timestamp, values) in enumerate(metric_data):
                if anomaly_scores[i] == -1:
                    anomaly_severity = await self._calculate_anomaly_severity(values, features[i])
                    anomalies.append({
                        'timestamp': timestamp,
                        'metric_values': values,
                        'severity': anomaly_severity,
                        'anomaly_score': isolation_forest.score_samples([features[i]])[0]
                    })
            
            # Analyze anomaly patterns
            anomaly_patterns = await self._analyze_anomaly_patterns(anomalies)
            
            # Generate anomaly insights
            anomaly_insights = await self._generate_anomaly_insights(
                anomalies, anomaly_patterns, metric_type
            )
            
            return {
                'analytics_type': AnalyticsType.ANOMALY_DETECTION.value,
                'metric_type': metric_type,
                'time_range': {
                    'start': time_range['start'].isoformat(),
                    'end': time_range['end'].isoformat()
                },
                'anomalies_detected': len(anomalies),
                'anomalies': anomalies,
                'patterns': anomaly_patterns,
                'insights': anomaly_insights,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to detect anomalies for {metric_type}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def generate_real_time_insights(self) -> Dict[str, Any]:
        """Generate real-time insights from current system state"""
        try:
            # Current system metrics
            current_metrics = await self._get_current_system_metrics()
            
            # Real-time user activity
            user_activity = await self._get_real_time_user_activity()
            
            # Performance indicators
            performance_indicators = await self._get_real_time_performance_indicators()
            
            # Alert conditions
            alert_conditions = await self._check_alert_conditions(
                current_metrics, user_activity, performance_indicators
            )
            
            # Generate immediate insights
            immediate_insights = await self._generate_immediate_insights(
                current_metrics, user_activity, performance_indicators
            )
            
            # Trend analysis (short-term)
            short_term_trends = await self._analyze_short_term_trends()
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'current_metrics': current_metrics,
                'user_activity': user_activity,
                'performance_indicators': performance_indicators,
                'alert_conditions': alert_conditions,
                'immediate_insights': immediate_insights,
                'short_term_trends': short_term_trends,
                'system_health_score': await self._calculate_system_health_score(current_metrics)
            }
            
        except Exception as e:
            logger.error(f"Failed to generate real-time insights: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def export_analytics_report(self, report_config: Dict[str, Any]) -> Dict[str, Any]:
        """Export comprehensive analytics report"""
        try:
            report_id = f"report_{int(datetime.utcnow().timestamp())}"
            
            # Generate report sections
            sections = []
            for section_config in report_config['sections']:
                section_data = await self._generate_report_section(section_config)
                sections.append(section_data)
            
            # Create visualizations
            visualizations = await self._create_report_visualizations(sections, report_config)
            
            # Generate executive summary
            executive_summary = await self._generate_executive_summary(sections)
            
            # Create report document
            report = {
                'report_id': report_id,
                'title': report_config['title'],
                'generated_at': datetime.utcnow().isoformat(),
                'time_range': report_config['time_range'],
                'executive_summary': executive_summary,
                'sections': sections,
                'visualizations': visualizations,
                'metadata': {
                    'data_sources': report_config.get('data_sources', []),
                    'filters': report_config.get('filters', {}),
                    'author': report_config.get('author', 'PAM Analytics'),
                    'confidentiality': report_config.get('confidentiality', 'internal')
                }
            }
            
            # Store report
            await self._store_analytics_report(report)
            
            # Generate report URL
            report_url = await self._generate_report_url(report_id)
            
            return {
                'status': 'generated',
                'report_id': report_id,
                'report_url': report_url,
                'sections_generated': len(sections),
                'visualizations_created': len(visualizations),
                'estimated_size': await self._estimate_report_size(report)
            }
            
        except Exception as e:
            logger.error(f"Failed to export analytics report: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_analytics_recommendations(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get actionable analytics recommendations"""
        try:
            recommendations = []
            
            # Performance optimization recommendations
            perf_recommendations = await self._generate_performance_recommendations(context)
            recommendations.extend(perf_recommendations)
            
            # User experience recommendations
            ux_recommendations = await self._generate_ux_recommendations(context)
            recommendations.extend(ux_recommendations)
            
            # Business growth recommendations
            growth_recommendations = await self._generate_growth_recommendations(context)
            recommendations.extend(growth_recommendations)
            
            # Cost optimization recommendations
            cost_recommendations = await self._generate_cost_optimization_recommendations(context)
            recommendations.extend(cost_recommendations)
            
            # Data quality recommendations
            data_quality_recommendations = await self._generate_data_quality_recommendations(context)
            recommendations.extend(data_quality_recommendations)
            
            # Prioritize recommendations
            prioritized_recommendations = await self._prioritize_recommendations(recommendations)
            
            return prioritized_recommendations
            
        except Exception as e:
            logger.error(f"Failed to get analytics recommendations: {e}")
            return []
    
    async def get_bi_system_status(self) -> Dict[str, Any]:
        """Get business intelligence system status"""
        try:
            # System health metrics
            system_health = await self._check_bi_system_health()
            
            # Data pipeline status
            pipeline_status = await self._check_data_pipeline_status()
            
            # Model performance
            model_performance = await self._check_model_performance()
            
            return {
                'status': 'operational',
                'active_dashboards': len(self.dashboards),
                'cached_queries': len(self.cached_results),
                'ml_models_loaded': len(self.ml_models),
                'real_time_metrics_tracked': len(self.real_time_metrics),
                'system_health': system_health,
                'data_pipeline_status': pipeline_status,
                'model_performance': model_performance,
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get BI system status: {e}")
            return {'status': 'error', 'message': str(e)}

# Global instance
pam_business_intelligence_system = PAMBusinessIntelligenceSystem()