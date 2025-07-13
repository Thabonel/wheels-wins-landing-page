import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  FileText,
  Target,
  Activity
} from 'lucide-react';

interface TestMetrics {
  totalTests: number;
  passingTests: number;
  failingTests: number;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  lastRun: string;
  duration: number;
  trend: 'up' | 'down' | 'stable';
}

interface TestFile {
  name: string;
  tests: number;
  passed: number;
  failed: number;
  coverage: number;
  status: 'passing' | 'failing' | 'mixed';
}

export function TestingDashboard() {
  const [metrics, setMetrics] = useState<TestMetrics>({
    totalTests: 19,
    passingTests: 3,
    failingTests: 16,
    coverage: {
      lines: 5.2,
      branches: 3.8,
      functions: 4.1,
      statements: 5.5
    },
    lastRun: new Date().toISOString(),
    duration: 4580,
    trend: 'down'
  });

  const [testFiles, setTestFiles] = useState<TestFile[]>([
    {
      name: 'AuthContext.test.tsx',
      tests: 7,
      passed: 2,
      failed: 5,
      coverage: 45.2,
      status: 'failing'
    },
    {
      name: 'api.test.ts',
      tests: 9,
      passed: 1,
      failed: 8,
      coverage: 32.1,
      status: 'failing'
    },
    {
      name: 'PamVoice.test.tsx',
      tests: 3,
      passed: 0,
      failed: 3,
      coverage: 12.5,
      status: 'failing'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    // Simulate running tests
    setTimeout(() => {
      setIsRunning(false);
      setMetrics(prev => ({
        ...prev,
        lastRun: new Date().toISOString()
      }));
    }, 3000);
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoverageStatus = (percentage: number) => {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'fair';
    return 'poor';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Testing Dashboard</h2>
          <p className="text-gray-600">Code quality and test coverage metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runTests}
            disabled={isRunning}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Coverage Target Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-yellow-600 mr-2" />
          <div>
            <h3 className="font-medium text-yellow-800">Coverage Target: 80%</h3>
            <p className="text-sm text-yellow-700">
              Current coverage is below the required 80% threshold. All new features require tests.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.passingTests} passing, {metrics.failingTests} failing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.passingTests / metrics.totalTests) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Test pass rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Coverage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCoverageColor(metrics.coverage.lines)}`}>
              {metrics.coverage.lines.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Lines covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.duration}ms</div>
            <p className="text-xs text-muted-foreground">
              {new Date(metrics.lastRun).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Coverage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Lines</span>
                <span className={getCoverageColor(metrics.coverage.lines)}>
                  {metrics.coverage.lines.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.coverage.lines} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Branches</span>
                <span className={getCoverageColor(metrics.coverage.branches)}>
                  {metrics.coverage.branches.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.coverage.branches} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Functions</span>
                <span className={getCoverageColor(metrics.coverage.functions)}>
                  {metrics.coverage.functions.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.coverage.functions} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Statements</span>
                <span className={getCoverageColor(metrics.coverage.statements)}>
                  {metrics.coverage.statements.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.coverage.statements} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Test Files Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {file.passed}/{file.tests} tests passing • {file.coverage.toFixed(1)}% coverage
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'passing' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {file.status === 'failing' && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    {file.status === 'mixed' && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    <Badge 
                      variant={file.status === 'passing' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {file.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Code Quality Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">POOR</div>
              <div className="text-sm text-muted-foreground">Overall Quality</div>
              <div className="text-xs mt-1">Below 80% coverage threshold</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">NEEDS WORK</div>
              <div className="text-sm text-muted-foreground">Test Reliability</div>
              <div className="text-xs mt-1">84% of tests failing</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">FAST</div>
              <div className="text-sm text-muted-foreground">Test Performance</div>
              <div className="text-xs mt-1">4.5s average runtime</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}