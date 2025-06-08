import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  Shield, 
  CreditCard, 
  Users, 
  Mail, 
  Zap, 
  Database,
  Globe,
  Bell,
  Key,
  Save,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('system');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    systemName: 'Wheels & Wins',
    systemDescription: 'Your adventure companion platform',
    contactEmail: 'admin@wheelsandwins.com',
    maxFileUploadSize: '10',
    sessionTimeout: '24',
    enableCaching: true,
    debugMode: false
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    requireTwoFactor: false,
    passwordMinLength: '8',
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    loginAttemptLimit: '5',
    lockoutDuration: '30',
    enableIPWhitelist: false,
    ipWhitelist: '',
    enableAuditLog: true,
    sessionSecurityLevel: 'medium'
  });

  // Business Settings State
  const [businessSettings, setBusinessSettings] = useState({
    currency: 'AUD',
    taxRate: '10',
    enableTax: true,
    paymentGateway: 'stripe',
    stripePublicKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalClientSecret: '',
    shippingEnabled: true,
    freeShippingThreshold: '100',
    defaultShippingRate: '15'
  });

  // Content Settings State
  const [contentSettings, setContentSettings] = useState({
    autoModeration: true,
    allowUserComments: true,
    requireCommentApproval: false,
    maxPostLength: '2000',
    allowImageUploads: true,
    maxImagesPerPost: '5',
    bannedWords: '',
    communityGuidelines: 'Be respectful and kind to all community members.',
    reportingEnabled: true
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    welcomeEmail: true,
    orderConfirmationEmail: true,
    passwordResetEmail: true,
    weeklyDigest: false,
    adminAlerts: true,
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: 'noreply@wheelsandwins.com'
  });

  // Integration Settings State
  const [integrationSettings, setIntegrationSettings] = useState({
    googleAnalyticsId: '',
    facebookPixelId: '',
    webhookUrl: '',
    apiRateLimit: '1000',
    enableWebhooks: false,
    thirdPartyIntegrations: true,
    pamApiKey: '',
    pamModelVersion: 'v2.1',
    enablePamAnalytics: true
  });

  const handleSave = () => {
    // Simulate API call
    toast({
      title: "Settings Saved",
      description: "All configuration changes have been applied successfully.",
    });
    setHasUnsavedChanges(false);
  };

  const handleInputChange = (category: string, field: string, value: any) => {
    setHasUnsavedChanges(true);
    
    switch(category) {
      case 'system':
        setSystemSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'security':
        setSecuritySettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'business':
        setBusinessSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'content':
        setContentSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'notifications':
        setNotificationSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'integrations':
        setIntegrationSettings(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Manage your platform configuration and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  General Configuration
                </CardTitle>
                <CardDescription>Basic system settings and information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">System Name</Label>
                  <Input
                    id="systemName"
                    value={systemSettings.systemName}
                    onChange={(e) => handleInputChange('system', 'systemName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemDescription">System Description</Label>
                  <Textarea
                    id="systemDescription"
                    value={systemSettings.systemDescription}
                    onChange={(e) => handleInputChange('system', 'systemDescription', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={systemSettings.contactEmail}
                    onChange={(e) => handleInputChange('system', 'contactEmail', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Access & Performance
                </CardTitle>
                <CardDescription>Control system access and performance settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">Disable public access for maintenance</p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) => handleInputChange('system', 'maintenanceMode', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow New Registrations</Label>
                    <p className="text-sm text-gray-500">Enable user account creation</p>
                  </div>
                  <Switch
                    checked={systemSettings.allowRegistration}
                    onCheckedChange={(checked) => handleInputChange('system', 'allowRegistration', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Caching</Label>
                    <p className="text-sm text-gray-500">Improve performance with caching</p>
                  </div>
                  <Switch
                    checked={systemSettings.enableCaching}
                    onCheckedChange={(checked) => handleInputChange('system', 'enableCaching', checked)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={systemSettings.maxFileUploadSize}
                      onChange={(e) => handleInputChange('system', 'maxFileUploadSize', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={systemSettings.sessionTimeout}
                      onChange={(e) => handleInputChange('system', 'sessionTimeout', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Authentication
                </CardTitle>
                <CardDescription>Configure user authentication and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Enforce 2FA for all users</p>
                  </div>
                  <Switch
                    checked={securitySettings.requireTwoFactor}
                    onCheckedChange={(checked) => handleInputChange('security', 'requireTwoFactor', checked)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Min Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => handleInputChange('security', 'passwordMinLength', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginAttempts">Login Attempt Limit</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={securitySettings.loginAttemptLimit}
                      onChange={(e) => handleInputChange('security', 'loginAttemptLimit', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Special Characters</Label>
                    <p className="text-sm text-gray-500">Passwords must include symbols</p>
                  </div>
                  <Switch
                    checked={securitySettings.passwordRequireSpecial}
                    onCheckedChange={(checked) => handleInputChange('security', 'passwordRequireSpecial', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Numbers</Label>
                    <p className="text-sm text-gray-500">Passwords must include numbers</p>
                  </div>
                  <Switch
                    checked={securitySettings.passwordRequireNumbers}
                    onCheckedChange={(checked) => handleInputChange('security', 'passwordRequireNumbers', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Advanced Security
                </CardTitle>
                <CardDescription>Enhanced security features and monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionSecurity">Session Security Level</Label>
                  <Select
                    value={securitySettings.sessionSecurityLevel}
                    onValueChange={(value) => handleInputChange('security', 'sessionSecurityLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Basic protection</SelectItem>
                      <SelectItem value="medium">Medium - Standard security</SelectItem>
                      <SelectItem value="high">High - Maximum security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable IP Whitelist</Label>
                    <p className="text-sm text-gray-500">Restrict access to specific IPs</p>
                  </div>
                  <Switch
                    checked={securitySettings.enableIPWhitelist}
                    onCheckedChange={(checked) => handleInputChange('security', 'enableIPWhitelist', checked)}
                  />
                </div>
                {securitySettings.enableIPWhitelist && (
                  <div className="space-y-2">
                    <Label htmlFor="ipWhitelist">Allowed IP Addresses</Label>
                    <Textarea
                      id="ipWhitelist"
                      placeholder="Enter IP addresses, one per line"
                      value={securitySettings.ipWhitelist}
                      onChange={(e) => handleInputChange('security', 'ipWhitelist', e.target.value)}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Audit Logging</Label>
                    <p className="text-sm text-gray-500">Track all admin actions</p>
                  </div>
                  <Switch
                    checked={securitySettings.enableAuditLog}
                    onCheckedChange={(checked) => handleInputChange('security', 'enableAuditLog', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Configuration
                </CardTitle>
                <CardDescription>Configure payment gateways and financial settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select
                    value={businessSettings.currency}
                    onValueChange={(value) => handleInputChange('business', 'currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentGateway">Payment Gateway</Label>
                  <Select
                    value={businessSettings.paymentGateway}
                    onValueChange={(value) => handleInputChange('business', 'paymentGateway', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripePublicKey">Stripe Public Key</Label>
                  <Input
                    id="stripePublicKey"
                    type="password"
                    value={businessSettings.stripePublicKey}
                    onChange={(e) => handleInputChange('business', 'stripePublicKey', e.target.value)}
                    placeholder="pk_live_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                  <Input
                    id="stripeSecretKey"
                    type="password"
                    value={businessSettings.stripeSecretKey}
                    onChange={(e) => handleInputChange('business', 'stripeSecretKey', e.target.value)}
                    placeholder="sk_live_..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax & Shipping</CardTitle>
                <CardDescription>Configure tax rates and shipping options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Tax Calculation</Label>
                    <p className="text-sm text-gray-500">Add tax to orders</p>
                  </div>
                  <Switch
                    checked={businessSettings.enableTax}
                    onCheckedChange={(checked) => handleInputChange('business', 'enableTax', checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    value={businessSettings.taxRate}
                    onChange={(e) => handleInputChange('business', 'taxRate', e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Shipping</Label>
                    <p className="text-sm text-gray-500">Offer shipping options</p>
                  </div>
                  <Switch
                    checked={businessSettings.shippingEnabled}
                    onCheckedChange={(checked) => handleInputChange('business', 'shippingEnabled', checked)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freeShipping">Free Shipping Threshold</Label>
                    <Input
                      id="freeShipping"
                      type="number"
                      value={businessSettings.freeShippingThreshold}
                      onChange={(e) => handleInputChange('business', 'freeShippingThreshold', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultShipping">Default Shipping Rate</Label>
                    <Input
                      id="defaultShipping"
                      type="number"
                      value={businessSettings.defaultShippingRate}
                      onChange={(e) => handleInputChange('business', 'defaultShippingRate', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Settings */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Community Settings
                </CardTitle>
                <CardDescription>Configure user-generated content and community features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Moderation</Label>
                    <p className="text-sm text-gray-500">Automatically filter inappropriate content</p>
                  </div>
                  <Switch
                    checked={contentSettings.autoModeration}
                    onCheckedChange={(checked) => handleInputChange('content', 'autoModeration', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow User Comments</Label>
                    <p className="text-sm text-gray-500">Enable commenting on posts</p>
                  </div>
                  <Switch
                    checked={contentSettings.allowUserComments}
                    onCheckedChange={(checked) => handleInputChange('content', 'allowUserComments', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Comment Approval</Label>
                    <p className="text-sm text-gray-500">Manual approval before comments show</p>
                  </div>
                  <Switch
                    checked={contentSettings.requireCommentApproval}
                    onCheckedChange={(checked) => handleInputChange('content', 'requireCommentApproval', checked)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxPostLength">Max Post Length</Label>
                    <Input
                      id="maxPostLength"
                      type="number"
                      value={contentSettings.maxPostLength}
                      onChange={(e) => handleInputChange('content', 'maxPostLength', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxImages">Max Images Per Post</Label>
                    <Input
                      id="maxImages"
                      type="number"
                      value={contentSettings.maxImagesPerPost}
                      onChange={(e) => handleInputChange('content', 'maxImagesPerPost', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Policies</CardTitle>
                <CardDescription>Define community guidelines and moderation rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bannedWords">Banned Words (comma separated)</Label>
                  <Textarea
                    id="bannedWords"
                    placeholder="Enter words to automatically filter"
                    value={contentSettings.bannedWords}
                    onChange={(e) => handleInputChange('content', 'bannedWords', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="communityGuidelines">Community Guidelines</Label>
                  <Textarea
                    id="communityGuidelines"
                    value={contentSettings.communityGuidelines}
                    onChange={(e) => handleInputChange('content', 'communityGuidelines', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Reporting</Label>
                    <p className="text-sm text-gray-500">Allow users to report content</p>
                  </div>
                  <Switch
                    checked={contentSettings.reportingEnabled}
                    onCheckedChange={(checked) => handleInputChange('content', 'reportingEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Configure notification delivery and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'emailNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-500">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'pushNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Welcome Email</Label>
                    <p className="text-sm text-gray-500">Send welcome email to new users</p>
                  </div>
                  <Switch
                    checked={notificationSettings.welcomeEmail}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'welcomeEmail', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Order Confirmations</Label>
                    <p className="text-sm text-gray-500">Send order confirmation emails</p>
                  </div>
                  <Switch
                    checked={notificationSettings.orderConfirmationEmail}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'orderConfirmationEmail', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Admin Alerts</Label>
                    <p className="text-sm text-gray-500">Receive system alerts</p>
                  </div>
                  <Switch
                    checked={notificationSettings.adminAlerts}
                    onCheckedChange={(checked) => handleInputChange('notifications', 'adminAlerts', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Configuration
                </CardTitle>
                <CardDescription>Configure SMTP settings for email delivery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={notificationSettings.smtpHost}
                    onChange={(e) => handleInputChange('notifications', 'smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      value={notificationSettings.smtpPort}
                      onChange={(e) => handleInputChange('notifications', 'smtpPort', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={notificationSettings.fromEmail}
                      onChange={(e) => handleInputChange('notifications', 'fromEmail', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input
                    id="smtpUsername"
                    value={notificationSettings.smtpUsername}
                    onChange={(e) => handleInputChange('notifications', 'smtpUsername', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={notificationSettings.smtpPassword}
                    onChange={(e) => handleInputChange('notifications', 'smtpPassword', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Third-Party Integrations
                </CardTitle>
                <CardDescription>Configure external services and APIs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="googleAnalytics">Google Analytics ID</Label>
                  <Input
                    id="googleAnalytics"
                    value={integrationSettings.googleAnalyticsId}
                    onChange={(e) => handleInputChange('integrations', 'googleAnalyticsId', e.target.value)}
                    placeholder="GA-XXXXXXXXX-X"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                  <Input
                    id="facebookPixel"
                    value={integrationSettings.facebookPixelId}
                    onChange={(e) => handleInputChange('integrations', 'facebookPixelId', e.target.value)}
                    placeholder="123456789012345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={integrationSettings.webhookUrl}
                    onChange={(e) => handleInputChange('integrations', 'webhookUrl', e.target.value)}
                    placeholder="https://your-domain.com/webhook"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Webhooks</Label>
                    <p className="text-sm text-gray-500">Send event data to external services</p>
                  </div>
                  <Switch
                    checked={integrationSettings.enableWebhooks}
                    onCheckedChange={(checked) => handleInputChange('integrations', 'enableWebhooks', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PAM Integration</CardTitle>
                <CardDescription>Configure PAM AI assistant settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pamApiKey">PAM API Key</Label>
                  <Input
                    id="pamApiKey"
                    type="password"
                    value={integrationSettings.pamApiKey}
                    onChange={(e) => handleInputChange('integrations', 'pamApiKey', e.target.value)}
                    placeholder="sk-pam-..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pamModel">PAM Model Version</Label>
                  <Select
                    value={integrationSettings.pamModelVersion}
                    onValueChange={(value) => handleInputChange('integrations', 'pamModelVersion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1.0">PAM v1.0 - Basic</SelectItem>
                      <SelectItem value="v2.0">PAM v2.0 - Enhanced</SelectItem>
                      <SelectItem value="v2.1">PAM v2.1 - Latest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable PAM Analytics</Label>
                    <p className="text-sm text-gray-500">Collect PAM usage analytics</p>
                  </div>
                  <Switch
                    checked={integrationSettings.enablePamAnalytics}
                    onCheckedChange={(checked) => handleInputChange('integrations', 'enablePamAnalytics', checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiRateLimit">API Rate Limit (requests/hour)</Label>
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={integrationSettings.apiRateLimit}
                    onChange={(e) => handleInputChange('integrations', 'apiRateLimit', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;