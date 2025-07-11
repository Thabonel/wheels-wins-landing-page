#!/usr/bin/env python3
"""
AI Agent Observability - Complete Example
Demonstrates full integration of OpenAI Tracing, Langfuse, and AgentOps
"""

import pandas as pd
import numpy as np
import asyncio
import time
from typing import Dict, Any

# Import all observability components
from observability_config import observability
from agents import create_agent_team, CEOAgent, DeveloperAgent, DataAnalystAgent
from tools import analyze_dataset_tool
from monitoring import global_monitor, monitor_function
from agentops_utils import agentops_monitor
from langfuse_utils import langfuse_monitor

# Sample dataset for demonstration
def create_sample_dataset() -> pd.DataFrame:
    """Create a sample dataset for analysis"""
    np.random.seed(42)
    
    data = {
        'user_id': range(1000, 1500),
        'age': np.random.normal(35, 10, 500).astype(int),
        'income': np.random.lognormal(10, 0.5, 500),
        'spending': np.random.gamma(2, 1000, 500),
        'category': np.random.choice(['Tech', 'Finance', 'Healthcare', 'Education', 'Retail'], 500),
        'satisfaction_score': np.random.beta(2, 1, 500) * 10,
        'region': np.random.choice(['North', 'South', 'East', 'West'], 500)
    }
    
    # Introduce some missing values
    df = pd.DataFrame(data)
    df.loc[np.random.choice(df.index, 20), 'income'] = np.nan
    df.loc[np.random.choice(df.index, 15), 'satisfaction_score'] = np.nan
    
    return df

@monitor_function(global_monitor)
@langfuse_monitor.observe_agent(name="main_workflow", metadata={"workflow_type": "complete_demo"})
def run_complete_demo():
    """Run the complete observability demonstration"""
    print("🚀 Starting AI Agent Observability Demo")
    print("=" * 50)
    
    try:
        # Initialize all observability platforms
        observability.initialize_all()
        
        # Start AgentOps workflow
        agentops_monitor.start_workflow("ai_agent_observability_demo", {
            "demo_version": "1.0",
            "framework": "complete_observability_stack"
        })
        
        # Create sample dataset
        print("\n📊 Creating sample dataset...")
        df = create_sample_dataset()
        print(f"✅ Dataset created: {df.shape[0]} rows, {df.shape[1]} columns")
        
        # Create agent team
        print("\n🤖 Creating AI agent team...")
        agents = create_agent_team()
        print(f"✅ Created {len(agents)} agents")
        
        # CEO delegates data analysis task
        print("\n👔 CEO delegating data analysis task...")
        ceo = agents['ceo']
        analyst = agents['analyst']
        developer = agents['developer']
        
        delegation_result = ceo.delegate_task(
            analyst, 
            "Analyze the customer dataset and provide comprehensive insights about spending patterns and customer satisfaction"
        )
        print(f"✅ Task delegated: {delegation_result['status']}")
        
        # Data Analyst performs analysis
        print("\n📊 Data Analyst performing comprehensive analysis...")
        analysis_result = analyst.analyze_dataset(df, "customer_behavior")
        print(f"✅ Analysis completed with quality score: {analysis_result.get('data_quality_score', 'N/A'):.1f}%")
        
        # Use the specialized analysis tool
        print("\n🔍 Running specialized dataset analysis tool...")
        tool_result = analyze_dataset_tool.analyze(df, {
            "include_correlations": True,
            "detect_outliers": True,
            "generate_insights": True,
            "quality_assessment": True
        })
        print(f"✅ Tool analysis completed in {tool_result['tool_info']['execution_time']:.2f}s")
        
        # Data Analyst suggests visualizations
        print("\n📈 Data Analyst suggesting visualizations...")
        viz_suggestions = analyst.suggest_visualizations(df)
        print(f"✅ Generated {viz_suggestions['total_suggestions']} visualization suggestions")
        
        # CEO delegates code development task
        print("\n👔 CEO delegating development task...")
        dev_delegation = ceo.delegate_task(
            developer,
            "Create a Python function to automatically generate the suggested visualizations based on the dataset analysis"
        )
        print(f"✅ Development task delegated: {dev_delegation['status']}")
        
        # Developer writes code
        print("\n💻 Developer writing visualization code...")
        code_result = developer.write_code(
            f"Create visualization functions for: {', '.join(viz_suggestions['suggestions'][:3])}",
            "python"
        )
        print(f"✅ Code written: {code_result['lines_of_code']} lines")
        
        # Developer reviews the code
        print("\n💻 Developer reviewing code quality...")
        review_result = developer.review_code(code_result['code'])
        print(f"✅ Code review completed")
        
        # CEO reviews all results
        print("\n👔 CEO reviewing final results...")
        final_results = {
            "data_analysis": analysis_result,
            "tool_analysis": tool_result,
            "visualizations": viz_suggestions,
            "code_development": code_result,
            "code_review": review_result
        }
        
        ceo_review = ceo.review_results(final_results)
        print(f"✅ CEO review completed: {ceo_review['status']}")
        
        # Generate monitoring report
        print("\n📋 Generating monitoring report...")
        monitoring_report = global_monitor.generate_report()
        
        # Display results summary
        print("\n" + "=" * 50)
        print("🎉 DEMO COMPLETED SUCCESSFULLY!")
        print("=" * 50)
        
        print("\n📊 Key Results:")
        print(f"• Dataset analyzed: {df.shape[0]} records")
        print(f"• Data quality score: {analysis_result.get('data_quality_score', 'N/A'):.1f}%")
        print(f"• Visualization suggestions: {viz_suggestions['total_suggestions']}")
        print(f"• Code generated: {code_result['lines_of_code']} lines")
        print(f"• Tool execution time: {tool_result['tool_info']['execution_time']:.2f}s")
        
        print("\n💰 Cost & Performance Summary:")
        dashboard_data = global_monitor.get_dashboard_data()
        print(f"• Total API calls: {dashboard_data['cost_metrics']['api_calls']}")
        print(f"• Estimated cost: ${dashboard_data['cost_metrics']['estimated_cost_usd']:.4f}")
        print(f"• Success rate: {dashboard_data['performance_metrics']['success_rate']:.1f}%")
        print(f"• Average response time: {dashboard_data['performance_metrics']['avg_response_time']:.2f}s")
        
        print("\n📈 View Results In:")
        print("• OpenAI Dashboard: https://platform.openai.com/usage")
        print("• Langfuse Dashboard: https://cloud.langfuse.com")
        print("• AgentOps Dashboard: https://app.agentops.ai")
        
        print(f"\n📋 Detailed Monitoring Report:")
        print(monitoring_report)
        
        # End AgentOps workflow
        agentops_monitor.end_workflow("Success")
        
        return {
            "status": "success",
            "results": final_results,
            "monitoring": dashboard_data
        }
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        global_monitor.track_error(e, {"context": "main_demo"})
        agentops_monitor.end_workflow("Failed")
        raise
    
    finally:
        # Clean shutdown
        observability.shutdown()

@monitor_function(global_monitor)
def run_simple_analysis_demo():
    """Run a simpler demonstration focusing on the analysis tool"""
    print("🔍 Starting Simple Analysis Demo")
    print("=" * 40)
    
    try:
        # Initialize only what we need
        observability.initialize_openai()
        observability.initialize_langfuse()
        
        # Create dataset
        df = create_sample_dataset()
        print(f"📊 Created dataset: {df.shape}")
        
        # Run analysis
        print("🔍 Running dataset analysis...")
        result = analyze_dataset_tool.analyze(df)
        
        print(f"✅ Analysis completed!")
        print(f"• Execution time: {result['tool_info']['execution_time']:.2f}s")
        print(f"• Data quality: {result['data_quality']['overall_quality_score']:.1f}%")
        print(f"• Correlations found: {len(result['correlations'].get('strong_correlations', []))}")
        
        return result
        
    except Exception as e:
        print(f"❌ Simple demo failed: {e}")
        raise

def show_help():
    """Show usage instructions"""
    help_text = """
🔍 AI Agent Observability Demo

Usage:
    python main_example.py [command]

Commands:
    full        Run the complete multi-agent demo (default)
    simple      Run a simple analysis tool demo
    help        Show this help message

Before running:
1. Copy .env.example to .env
2. Add your API keys:
   - OPENAI_API_KEY
   - LANGFUSE_SECRET_KEY
   - LANGFUSE_PUBLIC_KEY
   - AGENTOPS_API_KEY
3. Install dependencies: pip install -r requirements.txt

The demo will show traces in:
• OpenAI Dashboard: https://platform.openai.com/usage
• Langfuse: https://cloud.langfuse.com
• AgentOps: https://app.agentops.ai
    """
    print(help_text)

if __name__ == "__main__":
    import sys
    
    command = sys.argv[1] if len(sys.argv) > 1 else "full"
    
    if command == "help":
        show_help()
    elif command == "simple":
        run_simple_analysis_demo()
    elif command == "full":
        run_complete_demo()
    else:
        print(f"Unknown command: {command}")
        show_help()
        sys.exit(1)