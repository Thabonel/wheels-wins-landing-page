"""
Observable AI Agent Tools
Tools with full observability integration across all platforms
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Union
import json
import time
import os
from pydantic import BaseModel, Field, ValidationError
from observability_config import observability
from langfuse_utils import langfuse_monitor
from agentops_utils import agentops_monitor


class _AnalysisOptions(BaseModel):
    include_correlations: bool = True
    detect_outliers: bool = True
    generate_insights: bool = True
    quality_assessment: bool = True


class _AnalyzeParams(BaseModel):
    data: Union[pd.DataFrame, str, Dict[str, Any]]
    analysis_options: Optional[_AnalysisOptions] = None

    @validator("data")
    def validate_data(cls, v):
        if isinstance(v, str) and not os.path.exists(v):
            raise ValueError(f"File not found: {v}")
        if not isinstance(v, (pd.DataFrame, str, dict)):
            raise TypeError("data must be DataFrame, path, or dict")
        return v

class AnalyzeDatasetTool:
    """Comprehensive dataset analysis tool with full observability"""
    
    def __init__(self):
        self.name = "analyze_dataset"
        self.version = "2.0"
        self.description = "Analyzes datasets and provides comprehensive insights"
    
    @langfuse_monitor.observe_tool(tool_name="analyze_dataset", version="2.0")
    @agentops_monitor.track_tool_usage(tool_name="analyze_dataset", tool_version="2.0")
    def analyze(self, data: Union[pd.DataFrame, str, dict],
                analysis_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Comprehensive dataset analysis with full observability
        
        Args:
            data: DataFrame, file path, or dict to analyze
            analysis_options: Configuration for analysis depth and focus
        
        Returns:
            Comprehensive analysis results
        """
        start_time = time.time()
        observability.logger.info(
            f"🔍 Starting dataset analysis with {self.name} v{self.version}"
        )

        try:
            params = _AnalyzeParams(data=data, analysis_options=analysis_options)
        except ValidationError as ve:
            observability.logger.error(f"Input validation failed: {ve.errors()}")
            return {
                "error": "Invalid parameters",
                "details": ve.errors(),
            }

        options = params.analysis_options.dict() if params.analysis_options else {
            "include_correlations": True,
            "detect_outliers": True,
            "generate_insights": True,
            "quality_assessment": True,
        }
        
        try:
            # Data loading and preprocessing
            df = self._load_data(params.data)
            
            # Basic statistics
            basic_stats = self._compute_basic_statistics(df)
            
            # Data quality assessment
            quality_report = self._assess_data_quality(df) if options.get("quality_assessment") else {}
            
            # Correlation analysis
            correlations = self._analyze_correlations(df) if options.get("include_correlations") else {}
            
            # Outlier detection
            outliers = self._detect_outliers(df) if options.get("detect_outliers") else {}
            
            # Generate AI insights
            ai_insights = self._generate_ai_insights(df, basic_stats) if options.get("generate_insights") else {}
            
            execution_time = time.time() - start_time
            
            results = {
                "tool_info": {
                    "name": self.name,
                    "version": self.version,
                    "execution_time": execution_time,
                    "timestamp": time.time()
                },
                "dataset_info": {
                    "shape": df.shape,
                    "columns": df.columns.tolist(),
                    "data_types": df.dtypes.astype(str).to_dict(),
                    "memory_usage": df.memory_usage(deep=True).sum()
                },
                "basic_statistics": basic_stats,
                "data_quality": quality_report,
                "correlations": correlations,
                "outliers": outliers,
                "ai_insights": ai_insights,
                "analysis_options": options
            }
            
            observability.logger.info(f"✅ Dataset analysis completed in {execution_time:.2f}s")
            return results
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_result = {
                "tool_info": {
                    "name": self.name,
                    "version": self.version,
                    "execution_time": execution_time,
                    "timestamp": time.time()
                },
                "error": {
                    "type": type(e).__name__,
                    "message": str(e),
                    "occurred_at": execution_time
                },
                "analysis_options": options
            }
            
            observability.logger.error(f"❌ Dataset analysis failed: {e}")
            raise
    
    @langfuse_monitor.observe_tool(tool_name="load_data", version="1.0")
    def _load_data(self, data: Union[pd.DataFrame, str, dict]) -> pd.DataFrame:
        """Load data from various sources"""
        if isinstance(data, pd.DataFrame):
            return data.copy()
        elif isinstance(data, str):
            # Assume it's a file path
            if data.endswith('.csv'):
                return pd.read_csv(data)
            elif data.endswith('.json'):
                return pd.read_json(data)
            elif data.endswith(('.xlsx', '.xls')):
                return pd.read_excel(data)
            else:
                raise ValueError(f"Unsupported file format: {data}")
        elif isinstance(data, dict):
            return pd.DataFrame(data)
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")
    
    @langfuse_monitor.observe_tool(tool_name="basic_statistics", version="1.0")
    def _compute_basic_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Compute basic statistical measures"""
        numeric_df = df.select_dtypes(include=[np.number])
        categorical_df = df.select_dtypes(include=['object', 'category'])
        
        stats = {
            "numeric_summary": {},
            "categorical_summary": {},
            "general_info": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "numeric_columns": len(numeric_df.columns),
                "categorical_columns": len(categorical_df.columns),
                "missing_values_total": df.isnull().sum().sum(),
                "duplicate_rows": df.duplicated().sum()
            }
        }
        
        # Numeric statistics
        if not numeric_df.empty:
            stats["numeric_summary"] = {
                "mean": numeric_df.mean().to_dict(),
                "median": numeric_df.median().to_dict(),
                "std": numeric_df.std().to_dict(),
                "min": numeric_df.min().to_dict(),
                "max": numeric_df.max().to_dict(),
                "quartiles": {
                    "q25": numeric_df.quantile(0.25).to_dict(),
                    "q75": numeric_df.quantile(0.75).to_dict()
                }
            }
        
        # Categorical statistics
        if not categorical_df.empty:
            stats["categorical_summary"] = {}
            for col in categorical_df.columns:
                value_counts = df[col].value_counts()
                stats["categorical_summary"][col] = {
                    "unique_values": df[col].nunique(),
                    "most_frequent": value_counts.index[0] if len(value_counts) > 0 else None,
                    "most_frequent_count": value_counts.iloc[0] if len(value_counts) > 0 else 0,
                    "missing_count": df[col].isnull().sum()
                }
        
        return stats
    
    @langfuse_monitor.observe_tool(tool_name="data_quality", version="1.0")
    def _assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess overall data quality"""
        total_cells = df.shape[0] * df.shape[1]
        missing_cells = df.isnull().sum().sum()
        
        quality_metrics = {
            "completeness_score": ((total_cells - missing_cells) / total_cells) * 100,
            "duplicate_score": ((df.shape[0] - df.duplicated().sum()) / df.shape[0]) * 100,
            "consistency_issues": [],
            "column_quality": {}
        }
        
        # Per-column quality assessment
        for col in df.columns:
            col_missing = df[col].isnull().sum()
            col_total = len(df[col])
            
            quality_metrics["column_quality"][col] = {
                "missing_percentage": (col_missing / col_total) * 100,
                "data_type": str(df[col].dtype),
                "unique_values": df[col].nunique(),
                "quality_score": ((col_total - col_missing) / col_total) * 100
            }
        
        # Overall quality score
        quality_metrics["overall_quality_score"] = (
            quality_metrics["completeness_score"] + 
            quality_metrics["duplicate_score"]
        ) / 2
        
        return quality_metrics
    
    @langfuse_monitor.observe_tool(tool_name="correlation_analysis", version="1.0")
    def _analyze_correlations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze correlations between numeric variables"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {"message": "Insufficient numeric columns for correlation analysis"}
        
        correlation_matrix = numeric_df.corr()
        
        # Find strong correlations
        strong_correlations = []
        for i in range(len(correlation_matrix.columns)):
            for j in range(i+1, len(correlation_matrix.columns)):
                corr_value = correlation_matrix.iloc[i, j]
                if abs(corr_value) > 0.7:  # Strong correlation threshold
                    strong_correlations.append({
                        "variable1": correlation_matrix.columns[i],
                        "variable2": correlation_matrix.columns[j],
                        "correlation": corr_value,
                        "strength": "strong" if abs(corr_value) > 0.8 else "moderate"
                    })
        
        return {
            "correlation_matrix": correlation_matrix.to_dict(),
            "strong_correlations": strong_correlations,
            "correlation_summary": {
                "max_correlation": correlation_matrix.abs().max().max(),
                "avg_correlation": correlation_matrix.abs().mean().mean(),
                "num_strong_correlations": len(strong_correlations)
            }
        }
    
    @langfuse_monitor.observe_tool(tool_name="outlier_detection", version="1.0")
    def _detect_outliers(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect outliers using IQR method"""
        numeric_df = df.select_dtypes(include=[np.number])
        outliers_info = {}
        
        for col in numeric_df.columns:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            
            outliers_info[col] = {
                "outlier_count": len(outliers),
                "outlier_percentage": (len(outliers) / len(df)) * 100,
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "outlier_values": outliers[col].tolist()[:10]  # Limit to first 10
            }
        
        return outliers_info
    
    @langfuse_monitor.observe_llm_call(model="gpt-4", provider="openai")
    @agentops_monitor.track_llm_call(model="gpt-4")
    def _generate_ai_insights(self, df: pd.DataFrame, basic_stats: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-powered insights about the dataset"""
        client = observability.openai_client
        
        # Create a summary for the LLM
        summary = f"""
        Dataset Analysis Summary:
        - Shape: {df.shape}
        - Columns: {list(df.columns)}
        - Missing values: {df.isnull().sum().sum()}
        - Data types: {df.dtypes.value_counts().to_dict()}
        
        Key Statistics:
        {json.dumps(basic_stats, indent=2, default=str)[:1000]}  # Truncate for token limits
        """
        
        messages = [
            {
                "role": "system", 
                "content": "You are a data scientist providing insights about datasets. Focus on patterns, anomalies, and actionable recommendations."
            },
            {
                "role": "user", 
                "content": f"Analyze this dataset and provide key insights:\n{summary}"
            }
        ]
        
        try:
            with observability.get_tracer().start_as_current_span("ai_insights_generation") as span:
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    temperature=0.3
                )
                
                span.set_attribute("insights_generated", True)
                if hasattr(response, 'usage'):
                    span.set_attribute("tokens_used", response.usage.total_tokens)
                
                return {
                    "insights": response.choices[0].message.content,
                    "generated_at": time.time(),
                    "model_used": "gpt-4",
                    "tokens_used": getattr(response, 'usage', {}).get('total_tokens', 0)
                }
                
        except Exception as e:
            observability.logger.error(f"❌ Failed to generate AI insights: {e}")
            return {
                "error": str(e),
                "insights": "AI insights generation failed",
                "generated_at": time.time()
            }

# Create global tool instance
analyze_dataset_tool = AnalyzeDatasetTool()