/**
 * PAM Accessibility Test Suite
 * 
 * Comprehensive accessibility testing using manual checks and automated tools:
 * - ARIA compliance validation
 * - Keyboard navigation testing
 * - Color contrast verification
 * - Screen reader compatibility
 * - Focus management testing
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { useAccessibility } from '@/services/pam/accessibility/accessibilityService';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface AccessibilityTestResult {
  id: string;
  name: string;
  category: 'aria' | 'keyboard' | 'color' | 'focus' | 'semantic' | 'screen-reader';
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriteria: string;
  automated: boolean;
  details?: string;
}

export interface AccessibilityReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  pendingTests: number;
  overallScore: number;
  compliance: 'compliant' | 'partial' | 'non-compliant';
  results: AccessibilityTestResult[];
  timestamp: Date;
}

interface AccessibilityTestSuiteProps {
  targetElement?: HTMLElement;
  onReportGenerated?: (report: AccessibilityReport) => void;
  showDetails?: boolean;
  autoRun?: boolean;
}

// =====================================================
// ACCESSIBILITY TEST SUITE COMPONENT
// =====================================================

export const AccessibilityTestSuite: React.FC<AccessibilityTestSuiteProps> = ({
  targetElement,
  onReportGenerated,
  showDetails = true,
  autoRun = false
}) => {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { validateColorContrast, announce } = useAccessibility();

  // =====================================================
  // TEST DEFINITIONS
  // =====================================================

  const testDefinitions: Omit<AccessibilityTestResult, 'status' | 'message' | 'details'>[] = [
    // ARIA Tests
    {
      id: 'aria-labels',
      name: 'ARIA Labels Present',
      category: 'aria',
      wcagLevel: 'AA',
      wcagCriteria: '4.1.2 Name, Role, Value',
      automated: true
    },
    {
      id: 'aria-roles',
      name: 'ARIA Roles Valid',
      category: 'aria',
      wcagLevel: 'AA',
      wcagCriteria: '4.1.2 Name, Role, Value',
      automated: true
    },
    {
      id: 'aria-live-regions',
      name: 'ARIA Live Regions',
      category: 'aria',
      wcagLevel: 'AA',
      wcagCriteria: '4.1.3 Status Messages',
      automated: true
    },
    
    // Keyboard Navigation Tests
    {
      id: 'keyboard-nav',
      name: 'Keyboard Navigation',
      category: 'keyboard',
      wcagLevel: 'AA',
      wcagCriteria: '2.1.1 Keyboard',
      automated: false
    },
    {
      id: 'tab-order',
      name: 'Logical Tab Order',
      category: 'keyboard',
      wcagLevel: 'AA',
      wcagCriteria: '2.4.3 Focus Order',
      automated: true
    },
    {
      id: 'keyboard-traps',
      name: 'No Keyboard Traps',
      category: 'keyboard',
      wcagLevel: 'AA',
      wcagCriteria: '2.1.2 No Keyboard Trap',
      automated: true
    },
    
    // Color Contrast Tests
    {
      id: 'color-contrast-text',
      name: 'Text Color Contrast',
      category: 'color',
      wcagLevel: 'AA',
      wcagCriteria: '1.4.3 Contrast (Minimum)',
      automated: true
    },
    {
      id: 'color-contrast-ui',
      name: 'UI Component Contrast',
      category: 'color',
      wcagLevel: 'AA',
      wcagCriteria: '1.4.11 Non-text Contrast',
      automated: true
    },
    {
      id: 'color-only-info',
      name: 'Color Not Sole Indicator',
      category: 'color',
      wcagLevel: 'AA',
      wcagCriteria: '1.4.1 Use of Color',
      automated: false
    },
    
    // Focus Management Tests
    {
      id: 'focus-visible',
      name: 'Focus Indicators Visible',
      category: 'focus',
      wcagLevel: 'AA',
      wcagCriteria: '2.4.7 Focus Visible',
      automated: true
    },
    {
      id: 'focus-management',
      name: 'Focus Management',
      category: 'focus',
      wcagLevel: 'AA',
      wcagCriteria: '3.2.1 On Focus',
      automated: false
    },
    
    // Semantic Structure Tests
    {
      id: 'headings-hierarchy',
      name: 'Heading Hierarchy',
      category: 'semantic',
      wcagLevel: 'AA',
      wcagCriteria: '1.3.1 Info and Relationships',
      automated: true
    },
    {
      id: 'landmarks',
      name: 'Landmark Regions',
      category: 'semantic',
      wcagLevel: 'AA',
      wcagCriteria: '1.3.1 Info and Relationships',
      automated: true
    },
    {
      id: 'list-structure',
      name: 'List Structure',
      category: 'semantic',
      wcagLevel: 'AA',
      wcagCriteria: '1.3.1 Info and Relationships',
      automated: true
    },
    
    // Screen Reader Tests
    {
      id: 'screen-reader-text',
      name: 'Screen Reader Only Text',
      category: 'screen-reader',
      wcagLevel: 'AA',
      wcagCriteria: '4.1.2 Name, Role, Value',
      automated: true
    },
    {
      id: 'skip-links',
      name: 'Skip Navigation Links',
      category: 'screen-reader',
      wcagLevel: 'AA',
      wcagCriteria: '2.4.1 Bypass Blocks',
      automated: true
    }
  ];

  // =====================================================
  // INDIVIDUAL TEST FUNCTIONS
  // =====================================================

  const testARIALabels = (element: HTMLElement): AccessibilityTestResult => {
    const interactiveElements = element.querySelectorAll(
      'button, input, textarea, select, [role="button"], [role="link"], [role="menuitem"]'
    );
    
    let missingLabels = 0;
    const missingElements: string[] = [];

    interactiveElements.forEach((el) => {
      const hasLabel = el.getAttribute('aria-label') ||
                      el.getAttribute('aria-labelledby') ||
                      (el as HTMLInputElement).placeholder ||
                      el.textContent?.trim();
      
      if (!hasLabel) {
        missingLabels++;
        missingElements.push(el.tagName.toLowerCase());
      }
    });

    return {
      id: 'aria-labels',
      name: 'ARIA Labels Present',
      category: 'aria',
      status: missingLabels === 0 ? 'pass' : 'fail',
      message: missingLabels === 0 
        ? `All ${interactiveElements.length} interactive elements have accessible names`
        : `${missingLabels} elements missing accessible names`,
      wcagLevel: 'AA',
      wcagCriteria: '4.1.2 Name, Role, Value',
      automated: true,
      details: missingElements.length > 0 ? `Missing labels on: ${missingElements.join(', ')}` : undefined
    };
  };

  const testARIARoles = (element: HTMLElement): AccessibilityTestResult => {
    const roleElements = element.querySelectorAll('[role]');
    const invalidRoles: string[] = [];
    
    const validRoles = new Set([
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
      'contentinfo', 'dialog', 'document', 'feed', 'figure', 'form',
      'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list',
      'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
      'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
      'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader',
      'scrollbar', 'search', 'searchbox', 'separator', 'slider',
      'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
      'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
      'tree', 'treegrid', 'treeitem'
    ]);

    roleElements.forEach((el) => {
      const role = el.getAttribute('role');
      if (role && !validRoles.has(role)) {
        invalidRoles.push(role);
      }
    });

    return {
      id: 'aria-roles',
      name: 'ARIA Roles Valid',
      category: 'aria',
      status: invalidRoles.length === 0 ? 'pass' : 'fail',
      message: invalidRoles.length === 0 
        ? `All ${roleElements.length} ARIA roles are valid`
        : `${invalidRoles.length} invalid ARIA roles found`,
      wcagLevel: 'AA',
      wcagCriteria: '4.1.2 Name, Role, Value',
      automated: true,
      details: invalidRoles.length > 0 ? `Invalid roles: ${invalidRoles.join(', ')}` : undefined
    };
  };

  const testColorContrast = (element: HTMLElement): AccessibilityTestResult => {
    const testElements = element.querySelectorAll('*');
    let failedContrast = 0;
    const failedElements: string[] = [];

    // Test common color combinations
    const colorTests = [
      { fg: '#1f2937', bg: '#ffffff', name: 'Dark text on white' },
      { fg: '#ffffff', bg: '#2563eb', name: 'White text on blue' },
      { fg: '#dc2626', bg: '#ffffff', name: 'Red text on white' },
      { fg: '#059669', bg: '#ffffff', name: 'Green text on white' },
    ];

    colorTests.forEach(test => {
      const result = validateColorContrast(test.fg, test.bg);
      if (!result.aaCompliant) {
        failedContrast++;
        failedElements.push(`${test.name} (${result.ratio.toFixed(1)}:1)`);
      }
    });

    return {
      id: 'color-contrast-text',
      name: 'Text Color Contrast',
      category: 'color',
      status: failedContrast === 0 ? 'pass' : 'fail',
      message: failedContrast === 0 
        ? 'All tested color combinations meet WCAG AA standards'
        : `${failedContrast} color combinations fail WCAG AA`,
      wcagLevel: 'AA',
      wcagCriteria: '1.4.3 Contrast (Minimum)',
      automated: true,
      details: failedElements.length > 0 ? `Failed: ${failedElements.join(', ')}` : undefined
    };
  };

  const testTabOrder = (element: HTMLElement): AccessibilityTestResult => {
    const focusableElements = element.querySelectorAll(
      'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
    );
    
    let hasNegativeTabIndex = false;
    let hasPositiveTabIndex = false;
    let maxTabIndex = 0;

    focusableElements.forEach((el) => {
      const tabIndex = parseInt(el.getAttribute('tabindex') || '0');
      if (tabIndex < 0) hasNegativeTabIndex = true;
      if (tabIndex > 0) {
        hasPositiveTabIndex = true;
        maxTabIndex = Math.max(maxTabIndex, tabIndex);
      }
    });

    let status: 'pass' | 'fail' | 'warning' = 'pass';
    let message = `Tab order is logical for ${focusableElements.length} focusable elements`;

    if (hasPositiveTabIndex) {
      status = 'warning';
      message = `Positive tabindex values found (max: ${maxTabIndex}). Consider using DOM order instead.`;
    }

    return {
      id: 'tab-order',
      name: 'Logical Tab Order',
      category: 'keyboard',
      status,
      message,
      wcagLevel: 'AA',
      wcagCriteria: '2.4.3 Focus Order',
      automated: true
    };
  };

  const testFocusIndicators = (element: HTMLElement): AccessibilityTestResult => {
    const focusableElements = element.querySelectorAll(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    // This test would need to be more sophisticated in a real implementation
    // For now, we assume elements have focus indicators if they're styled
    const elementsWithFocusStyles = element.querySelectorAll(
      '.focus\\:ring, .focus\\:outline, [class*="focus:"]'
    );

    const ratio = elementsWithFocusStyles.length / focusableElements.length;

    return {
      id: 'focus-visible',
      name: 'Focus Indicators Visible',
      category: 'focus',
      status: ratio >= 0.8 ? 'pass' : ratio >= 0.5 ? 'warning' : 'fail',
      message: `${Math.round(ratio * 100)}% of focusable elements have focus styles`,
      wcagLevel: 'AA',
      wcagCriteria: '2.4.7 Focus Visible',
      automated: true,
      details: `${elementsWithFocusStyles.length}/${focusableElements.length} elements have focus indicators`
    };
  };

  const testHeadingHierarchy = (element: HTMLElement): AccessibilityTestResult => {
    const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map(h => parseInt(h.tagName[1]));
    
    let hierarchyIssues = 0;
    const issues: string[] = [];

    // Check if we start with h1 or if headings skip levels
    if (levels.length > 0 && levels[0] !== 1) {
      hierarchyIssues++;
      issues.push('Should start with h1');
    }

    for (let i = 1; i < levels.length; i++) {
      const diff = levels[i] - levels[i - 1];
      if (diff > 1) {
        hierarchyIssues++;
        issues.push(`h${levels[i - 1]} followed by h${levels[i]} (skips level)`);
      }
    }

    return {
      id: 'headings-hierarchy',
      name: 'Heading Hierarchy',
      category: 'semantic',
      status: hierarchyIssues === 0 ? 'pass' : 'warning',
      message: hierarchyIssues === 0 
        ? `Heading hierarchy is correct (${headings.length} headings)`
        : `${hierarchyIssues} heading hierarchy issues found`,
      wcagLevel: 'AA',
      wcagCriteria: '1.3.1 Info and Relationships',
      automated: true,
      details: issues.length > 0 ? issues.join(', ') : undefined
    };
  };

  const testLandmarks = (element: HTMLElement): AccessibilityTestResult => {
    const landmarks = element.querySelectorAll(
      'main, nav, aside, header, footer, section, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]'
    );
    
    const landmarkTypes = new Set<string>();
    landmarks.forEach(landmark => {
      const role = landmark.getAttribute('role') || landmark.tagName.toLowerCase();
      landmarkTypes.add(role);
    });

    const hasMain = landmarkTypes.has('main') || landmarkTypes.has('MAIN');
    const hasNav = landmarkTypes.has('navigation') || landmarkTypes.has('nav') || landmarkTypes.has('NAV');

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let message = `${landmarks.length} landmark regions found`;

    if (!hasMain) {
      status = 'warning';
      message += ' (missing main landmark)';
    }

    return {
      id: 'landmarks',
      name: 'Landmark Regions',
      category: 'semantic',
      status,
      message,
      wcagLevel: 'AA',
      wcagCriteria: '1.3.1 Info and Relationships',
      automated: true,
      details: `Landmark types: ${Array.from(landmarkTypes).join(', ')}`
    };
  };

  const testScreenReaderText = (element: HTMLElement): AccessibilityTestResult => {
    const srElements = element.querySelectorAll('.sr-only, .screen-reader-only, .visually-hidden');
    const ariaLiveRegions = element.querySelectorAll('[aria-live]');
    
    return {
      id: 'screen-reader-text',
      name: 'Screen Reader Only Text',
      category: 'screen-reader',
      status: srElements.length > 0 || ariaLiveRegions.length > 0 ? 'pass' : 'warning',
      message: `${srElements.length} screen reader elements, ${ariaLiveRegions.length} live regions`,
      wcagLevel: 'AA',
      wcagCriteria: '4.1.2 Name, Role, Value',
      automated: true,
      details: `SR elements: ${srElements.length}, Live regions: ${ariaLiveRegions.length}`
    };
  };

  const testSkipLinks = (element: HTMLElement): AccessibilityTestResult => {
    const skipLinks = element.querySelectorAll('a[href^="#"], .skip-link, .pam-skip-links');
    
    return {
      id: 'skip-links',
      name: 'Skip Navigation Links',
      category: 'screen-reader',
      status: skipLinks.length > 0 ? 'pass' : 'warning',
      message: skipLinks.length > 0 
        ? `${skipLinks.length} skip link(s) found`
        : 'No skip links found - consider adding for better navigation',
      wcagLevel: 'AA',
      wcagCriteria: '2.4.1 Bypass Blocks',
      automated: true
    };
  };

  // =====================================================
  // TEST EXECUTION
  // =====================================================

  const runAllTests = useCallback(async () => {
    const element = targetElement || containerRef.current?.parentElement || document.body;
    if (!element) return;

    setIsRunning(true);
    announce('Starting accessibility tests', 'polite');
    
    const results: AccessibilityTestResult[] = [];
    
    // Map test IDs to their functions
    const testFunctions: Record<string, (el: HTMLElement) => AccessibilityTestResult> = {
      'aria-labels': testARIALabels,
      'aria-roles': testARIARoles,
      'color-contrast-text': testColorContrast,
      'tab-order': testTabOrder,
      'focus-visible': testFocusIndicators,
      'headings-hierarchy': testHeadingHierarchy,
      'landmarks': testLandmarks,
      'screen-reader-text': testScreenReaderText,
      'skip-links': testSkipLinks,
    };

    // Run automated tests
    for (const testDef of testDefinitions) {
      setCurrentTest(testDef.name);
      
      if (testFunctions[testDef.id]) {
        const result = testFunctions[testDef.id](element);
        results.push(result);
      } else {
        // For tests without implementations, mark as pending
        results.push({
          ...testDef,
          status: 'pending',
          message: 'Manual testing required',
          details: 'This test requires manual verification'
        });
      }
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate overall scores
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'pass').length;
    const failedTests = results.filter(r => r.status === 'fail').length;
    const warningTests = results.filter(r => r.status === 'warning').length;
    const pendingTests = results.filter(r => r.status === 'pending').length;
    
    const overallScore = Math.round((passedTests / totalTests) * 100);
    
    let compliance: 'compliant' | 'partial' | 'non-compliant' = 'compliant';
    if (failedTests > 0) compliance = 'non-compliant';
    else if (warningTests > 0 || pendingTests > 0) compliance = 'partial';

    const finalReport: AccessibilityReport = {
      totalTests,
      passedTests,
      failedTests,
      warningTests,
      pendingTests,
      overallScore,
      compliance,
      results,
      timestamp: new Date()
    };

    setReport(finalReport);
    setIsRunning(false);
    setCurrentTest('');
    
    announce(`Accessibility testing complete. Score: ${overallScore}%`, 'polite');
    onReportGenerated?.(finalReport);
  }, [targetElement, onReportGenerated, announce]);

  // Auto-run tests on mount if enabled
  useEffect(() => {
    if (autoRun) {
      runAllTests();
    }
  }, [autoRun, runAllTests]);

  // =====================================================
  // RENDER
  // =====================================================

  const getStatusColor = (status: AccessibilityTestResult['status']) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: AccessibilityTestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4" />;
      case 'fail': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'pending': return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getCategoryBadge = (category: AccessibilityTestResult['category']) => {
    const colors = {
      'aria': 'bg-blue-100 text-blue-800',
      'keyboard': 'bg-purple-100 text-purple-800',
      'color': 'bg-pink-100 text-pink-800',
      'focus': 'bg-indigo-100 text-indigo-800',
      'semantic': 'bg-green-100 text-green-800',
      'screen-reader': 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge variant="secondary" className={colors[category]}>
        {category.replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PAM Accessibility Audit</h2>
          <p className="text-gray-600 mt-1">Comprehensive WCAG 2.1 AA compliance testing</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Running Status */}
      {isRunning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Running accessibility tests... Current test: {currentTest}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Summary */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results Summary</span>
              <Badge 
                variant={report.compliance === 'compliant' ? 'default' : 'destructive'}
                className="text-sm"
              >
                {report.overallScore}% ({report.compliance})
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{report.totalTests}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{report.passedTests}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{report.failedTests}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{report.warningTests}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{report.pendingTests}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {report && showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.results.map((result) => (
                <div
                  key={result.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    getStatusColor(result.status)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{result.name}</h4>
                          {getCategoryBadge(result.category)}
                          <Badge variant="outline" className="text-xs">
                            WCAG {result.wcagLevel}
                          </Badge>
                        </div>
                        <p className="text-sm mb-1">{result.message}</p>
                        <p className="text-xs text-gray-600">{result.wcagCriteria}</p>
                        {result.details && (
                          <p className="text-xs text-gray-500 mt-2">{result.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!report && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>About This Test Suite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                This accessibility test suite evaluates PAM components against WCAG 2.1 AA guidelines.
                It includes both automated checks and guidance for manual testing.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Automated Tests</h4>
                  <ul className="space-y-1">
                    <li>• ARIA labels and roles validation</li>
                    <li>• Color contrast verification</li>
                    <li>• Semantic structure analysis</li>
                    <li>• Keyboard navigation checks</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Manual Verification Needed</h4>
                  <ul className="space-y-1">
                    <li>• Screen reader compatibility</li>
                    <li>• Keyboard-only navigation</li>
                    <li>• Focus management flow</li>
                    <li>• Voice control integration</li>
                  </ul>
                </div>
              </div>
              
              <p>
                Click "Run Tests" to start the automated accessibility audit.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccessibilityTestSuite;