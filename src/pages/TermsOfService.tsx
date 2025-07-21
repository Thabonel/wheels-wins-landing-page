import React from 'react';

const TermsOfService = () => {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p>By accessing and using Wheels and Wins, you accept and agree to be bound by the terms and provision of this agreement.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p>Wheels and Wins provides RV budget tracking, work-life balance tools, and retirement planning resources for RV enthusiasts. Our service helps you manage your travel finances and plan your adventures.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p>To access certain features, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
          <p>You agree to use our service only for lawful purposes and in accordance with these Terms. You agree not to use the service in any way that could damage, disable, or impair the service.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Privacy</h2>
          <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
          <p>Wheels and Wins shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contact Information</h2>
          <p>If you have any questions about these Terms of Service, please contact us through our support channels.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;