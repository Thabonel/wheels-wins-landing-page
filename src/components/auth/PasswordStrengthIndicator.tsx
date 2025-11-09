import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters long',
    test: (pwd) => pwd.length >= 8,
  },
  {
    label: 'Contains uppercase letter (A-Z)',
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: 'Contains lowercase letter (a-z)',
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    label: 'Contains number (0-9)',
    test: (pwd) => /\d/.test(pwd),
  },
  {
    label: 'Contains special character (@$!%*?&)',
    test: (pwd) => /[@$!%*?&]/.test(pwd),
  },
];

const commonPatterns = [
  'password', 'Password', 'PASSWORD',
  '12345678', '87654321',
  'qwerty', 'QWERTY',
  'abc123', 'ABC123',
];

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = '',
}) => {
  const analysis = useMemo(() => {
    if (!password) {
      return {
        strength: 0,
        strengthLabel: 'No password',
        strengthColor: 'bg-gray-300',
        textColor: 'text-gray-500',
        requirements: passwordRequirements.map((req) => ({
          label: req.label,
          met: false,
        })),
        hasCommonPattern: false,
      };
    }

    const metRequirements = passwordRequirements.filter((req) => req.test(password));
    const strengthPercentage = (metRequirements.length / passwordRequirements.length) * 100;

    // Check for common patterns
    const hasCommonPattern = commonPatterns.some((pattern) =>
      password.toLowerCase().includes(pattern.toLowerCase())
    );

    let strengthLabel: string;
    let strengthColor: string;
    let textColor: string;

    if (hasCommonPattern) {
      strengthLabel = 'Weak (common pattern)';
      strengthColor = 'bg-red-500';
      textColor = 'text-red-600';
    } else if (strengthPercentage < 40) {
      strengthLabel = 'Weak';
      strengthColor = 'bg-red-500';
      textColor = 'text-red-600';
    } else if (strengthPercentage < 70) {
      strengthLabel = 'Fair';
      strengthColor = 'bg-yellow-500';
      textColor = 'text-yellow-600';
    } else if (strengthPercentage < 100) {
      strengthLabel = 'Good';
      strengthColor = 'bg-blue-500';
      textColor = 'text-blue-600';
    } else {
      strengthLabel = 'Strong';
      strengthColor = 'bg-green-500';
      textColor = 'text-green-600';
    }

    return {
      strength: hasCommonPattern ? 0 : strengthPercentage,
      strengthLabel,
      strengthColor,
      textColor,
      requirements: passwordRequirements.map((req) => ({
        label: req.label,
        met: req.test(password),
      })),
      hasCommonPattern,
    };
  }, [password]);

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-700">Password strength</span>
          <span className={`text-xs font-semibold ${analysis.textColor}`}>
            {analysis.strengthLabel}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${analysis.strengthColor}`}
            style={{ width: `${analysis.strength}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-700 mb-2">Requirements:</p>
        {analysis.requirements.map((req, index) => (
          <div key={index} className="flex items-start gap-2">
            {req.met ? (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <span
              className={`text-xs ${
                req.met ? 'text-green-700 font-medium' : 'text-gray-600'
              }`}
            >
              {req.label}
            </span>
          </div>
        ))}

        {/* Warning for common patterns */}
        {analysis.hasCommonPattern && (
          <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded">
            <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-700">
              Password contains common patterns and is too weak
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
