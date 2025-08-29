
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Wheels & Wins
        </h1>
        <p className="text-xl text-gray-600">
          Your AI-powered travel community platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Your Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Get personalized travel recommendations and route planning with PAM, your AI assistant.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Track Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Monitor your travel goals, expenses, and achievements in real-time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect & Share</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Join a community of travelers and share your experiences.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
