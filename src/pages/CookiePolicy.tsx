import React from 'react';

const CookiePolicy = () => {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
        
        <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
          <p>Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and improving our services.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Types of Cookies We Use</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Essential Cookies</h3>
            <p>These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas.</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Performance Cookies</h3>
            <p>These cookies help us understand how visitors interact with our website by collecting anonymous information about usage patterns.</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Functional Cookies</h3>
            <p>These cookies enable enhanced functionality and personalization, such as remembering your login status and preferences.</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Analytics Cookies</h3>
            <p>We use analytics cookies to track and analyze website performance, helping us improve our RV travel planning tools.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Third-Party Cookies</h2>
          <p>Some cookies are placed by third-party services that appear on our pages. We use reputable third parties and have no control over the cookies they use.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
          <p>You can control and manage cookies in several ways:</p>
          <ul className="list-disc pl-6 mt-4">
            <li>Use your browser settings to delete or block cookies</li>
            <li>Set your browser to notify you when cookies are being used</li>
            <li>Visit your browser's help section for specific instructions</li>
            <li>Use our cookie preference center (if available)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Impact of Disabling Cookies</h2>
          <p>If you choose to disable cookies, some features of our RV planning and budgeting tools may not function properly, and your user experience may be limited.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Updates to This Policy</h2>
          <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for legal and regulatory reasons.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Contact Information</h2>
          <p>If you have any questions about our use of cookies, please contact us through our support channels.</p>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicy;