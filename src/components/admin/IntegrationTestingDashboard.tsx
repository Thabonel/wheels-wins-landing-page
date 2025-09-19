import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Download,
  RefreshCw,
  TestTube,
  User,
  DollarSign,
  Brain,
  Database
} from "lucide-react";
import { integrationTestSuite, IntegrationTestResult, IntegrationTestStep } from "@/utils/integrationTesting";

const IntegrationTestingDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [results, setResults] = useState<IntegrationTestResult[]>([]);
  const [progress, setProgress] = useState(0);

  const testCategories = [
    {
      id: 'registration',
      name: 'User Registration Flow',
      icon: User,
      description: 'Complete signup to dashboard journey',
      method: 'testUserRegistrationFlow'
    },
    {
      id: 'financial',
      name: 'Financial Features',
      icon: DollarSign,
      description: 'Expenses, budgets, income integration',
      method: 'testFinancialFeaturesIntegration'
    },
    {
      id: 'pam_ai',
      name: 'PAM AI Integration',
      icon: Brain,
      description: 'Trip planning with AI assistant',
      method: 'testPAMTripPlanningIntegration'
    },
    {
      id: 'data_persistence',
      name: 'Data Persistence',
      icon: Database,
      description: 'Cross-component synchronization',
      method: 'testDataPersistence'
    }
  ];

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    integrationTestSuite.clearResults();

    try {
      console.log('🧪 Starting Day 5 Integration Testing Suite...');

      const testResults = await integrationTestSuite.runAllIntegrationTests();
      setResults(testResults);
      setProgress(100);

      console.log('✅ Integration testing completed');
    } catch (error) {
      console.error('❌ Integration testing failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  }, []);

  const runSingleTest = useCallback(async (testMethod: string, testName: string) => {
    setIsRunning(true);
    setCurrentTest(testName);

    try {
      let result: IntegrationTestResult;

      switch (testMethod) {
        case 'testUserRegistrationFlow':
          result = await integrationTestSuite.testUserRegistrationFlow();
          break;
        case 'testFinancialFeaturesIntegration':
          result = await integrationTestSuite.testFinancialFeaturesIntegration();
          break;
        case 'testPAMTripPlanningIntegration':
          result = await integrationTestSuite.testPAMTripPlanningIntegration();
          break;
        case 'testDataPersistence':
          result = await integrationTestSuite.testDataPersistence();
          break;
        default:
          throw new Error(`Unknown test method: ${testMethod}`);
      }

      setResults(prev => [...prev, result]);
      console.log(`${result.passed ? '✅' : '❌'} ${result.testName}: ${result.details}`);
    } catch (error) {
      console.error(`❌ Test ${testName} failed:`, error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  }, []);

  const exportResults = useCallback(() => {
    const exportData = integrationTestSuite.exportResults();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const getStatusIcon = (result: IntegrationTestResult) => {
    if (result.passed) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStepIcon = (step: IntegrationTestStep) => {
    switch (step.status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const summary = integrationTestSuite.getTestSummary();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8" />
            Integration Testing Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Day 5: Feature Integration Testing - Validate complete user journeys
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setResults([]);
              integrationTestSuite.clearResults();
            }}
            variant="outline"
            disabled={isRunning}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Results
          </Button>
          <Button
            onClick={exportResults}
            variant="outline"
            disabled={results.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>
      </div>

      {isRunning && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {currentTest ? `Running: ${currentTest}` : 'Running integration tests...'}
            <Progress value={progress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Test Summary */}
      {summary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Test Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.passRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Pass Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Test Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {testCategories.map((category) => {
          const categoryResult = results.find(r =>
            r.testName.toLowerCase().includes(category.id.replace('_', ' '))
          );
          const Icon = category.icon;

          return (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  {categoryResult && getStatusIcon(categoryResult)}
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => runSingleTest(category.method, category.name)}
                    disabled={isRunning}
                    variant={categoryResult?.passed ? "secondary" : "default"}
                    className="w-full"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {isRunning && currentTest === category.name ? 'Running...' : 'Run Test'}
                  </Button>

                  {categoryResult && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={categoryResult.passed ? "success" : "destructive"}>
                          {categoryResult.passed ? "PASSED" : "FAILED"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {categoryResult.duration}ms
                        </span>
                      </div>
                      <p className="text-sm">{categoryResult.details}</p>

                      {categoryResult.steps.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium">Test Steps:</h4>
                          {categoryResult.steps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {getStepIcon(step)}
                              <span className={step.status === 'failed' ? 'text-red-600' : ''}>
                                {step.step}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {step.duration}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {categoryResult.errorMessages && categoryResult.errorMessages.length > 0 && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              {categoryResult.errorMessages.map((error, index) => (
                                <div key={index} className="text-sm">{error}</div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Test Results</CardTitle>
            <CardDescription>
              Complete breakdown of all integration test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <h3 className="font-semibold">{result.testName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{result.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{result.details}</p>

                    <div className="text-xs text-muted-foreground">
                      Duration: {result.duration}ms | Steps: {result.steps.length}
                    </div>

                    {result.steps.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {result.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-center gap-2 text-xs pl-4">
                            {getStepIcon(step)}
                            <span>{step.step}</span>
                            {step.details && (
                              <span className="text-muted-foreground">- {step.details}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {index < results.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntegrationTestingDashboard;