import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const WEBHOOK_URL = 'https://treflip2025.app.n8n.cloud/webhook/79d30fcb-ac7a-4a1d-9a53-9532bde02e52';

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    ask_full_name: '',
    ask_nickname: '',
    ask_email: '',
    ask_region: '',
    ask_travel_style: '',
    ask_vehicle_type: '',
    ask_vehicle_make_model_year: '',
    ask_fuel_type: '',
    ask_towing: '',
    ask_second_vehicle: '',
    ask_drive_limit: '',
    ask_camp_types: '',
    ask_accessibility: '',
    ask_pets: '',
  });
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmissionStatus('Submitting...');
    try {
      const payload = {
        ...formData,
        user_id: user?.id,
      };
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setSubmissionStatus('Submission successful!');
        setFormData({
          ask_full_name: '',
          ask_nickname: '',
          ask_email: '',
          ask_region: '',
          ask_travel_style: '',
          ask_vehicle_type: '',
          ask_vehicle_make_model_year: '',
          ask_fuel_type: '',
          ask_towing: '',
          ask_second_vehicle: '',
          ask_drive_limit: '',
          ask_camp_types: '',
          ask_accessibility: '',
          ask_pets: '',
        });
      } else {
        setSubmissionStatus(`Submission failed: ${response.statusText}`);
      }
    } catch (error: any) {
      setSubmissionStatus(`Submission failed: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Help Pam Help You!</h1>
        <p className="text-gray-700">The more Pam knows, the better she can help you.</p>
        <p className="text-gray-700 mb-2">
          Fill out as much or as little as you like — but here’s what you’ll get if you do:
        </p>
        <ul className="list-none text-gray-700">
          <li>✅ Save time planning fuel stops and routes</li>
          <li>✅ Get tips for free and paid camps that fit your style</li>
          <li>✅ Track fuel efficiency for <em>your</em> actual vehicle</li>
          <li>✅ Get alerts for discounts, pet-friendly stays, or accessibility support</li>
          <li>✅ Automatically log expenses, towing, or gear needs</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        {/* Full Name */}
        <div>
          <label htmlFor="ask_full_name" className="block text-sm font-medium text-gray-700">
            What's your full name?
          </label>
          <input
            type="text"
            id="ask_full_name"
            name="ask_full_name"
            value={formData.ask_full_name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Nickname */}
        <div>
          <label htmlFor="ask_nickname" className="block text-sm font-medium text-gray-700">
            What nickname would you like to use socially?
          </label>
          <input
            type="text"
            id="ask_nickname"
            name="ask_nickname"
            value={formData.ask_nickname}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="ask_email" className="block text-sm font-medium text-gray-700">
            What's your best email address?
          </label>
          <input
            type="email"
            id="ask_email"
            name="ask_email"
            value={formData.ask_email}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Region */}
        <div>
          <label htmlFor="ask_region" className="block text-sm font-medium text-gray-700">
            Which region are you travelling in?
          </label>
          <select
            id="ask_region"
            name="ask_region"
            value={formData.ask_region}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select region</option>
            <option value="Australia">Australia</option>
            <option value="New Zealand">New Zealand</option>
            <option value="US">US</option>
            <option value="Canada">Canada</option>
            <option value="UK">UK</option>
            <option value="Rest of the World">Rest of the World</option>
          </select>
        </div>

        {/* Travel Style */}
        <div>
          <label htmlFor="ask_travel_style" className="block text-sm font-medium text-gray-700">
            Are you travelling solo or as a couple?
          </label>
          <select
            id="ask_travel_style"
            name="ask_travel_style"
            value={formData.ask_travel_style}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select travel style</option>
            <option value="Solo">Solo</option>
            <option value="Couple">Couple</option>
          </select>
        </div>

        {/* Vehicle Type */}
        <div>
          <label htmlFor="ask_vehicle_type" className="block text-sm font-medium text-gray-700">
            What type of vehicle do you use? (e.g. RV, 4WD, Caravan)
          </label>
          <input
            type="text"
            id="ask_vehicle_type"
            name="ask_vehicle_type"
            value={formData.ask_vehicle_type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Vehicle Make/Model/Year */}
        <div>
          <label htmlFor="ask_vehicle_make_model_year" className="block text-sm font-medium text-gray-700">
            What's the make, model and year of your vehicle?
          </label>
          <input
            type="text"
            id="ask_vehicle_make_model_year"
            name="ask_vehicle_make_model_year"
            value={formData.ask_vehicle_make_model_year}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Fuel Type */}
        <div>
          <label htmlFor="ask_fuel_type" className="block text-sm font-medium text-gray-700">
            What fuel type does your vehicle use? (Diesel, Petrol, Electric)
          </label>
          <select
            id="ask_fuel_type"
            name="ask_fuel_type"
            value={formData.ask_fuel_type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select fuel type</option>
            <option value="Diesel">Diesel</option>
            <option value="Petrol">Petrol</option>
            <option value="Electric">Electric</option>
          </select>
        </div>

        {/* Towing */}
        <div>
          <label htmlFor="ask_towing" className="block text-sm font-medium text-gray-700">
            Are you towing anything? If yes, what?
          </label>
          <input
            type="text"
            id="ask_towing"
            name="ask_towing"
            value={formData.ask_towing}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Second Vehicle */}
        <div>
          <label htmlFor="ask_second_vehicle" className="block text-sm font-medium text-gray-700">
            Do you travel with a second vehicle? If yes, what kind?
          </label>
          <input
            type="text"
            id="ask_second_vehicle"
            name="ask_second_vehicle"
            value={formData.ask_second_vehicle}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Drive Limit */}
        <div>
          <label htmlFor="ask_drive_limit" className="block text-sm font-medium text-gray-700">
            What's your max comfortable daily driving distance? (km/miles)
          </label>
          <input
            type="text"
            id="ask_drive_limit"
            name="ask_drive_limit"
            value={formData.ask_drive_limit}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Camp Types */}
        <div>
          <label htmlFor="ask_camp_types" className="block text-sm font-medium text-gray-700">
            What are your preferred camp types? (Free, Paid, Bush, RV Park...)
          </label>
          <input
            type="text"
            id="ask_camp_types"
            name="ask_camp_types"
            value={formData.ask_camp_types}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Accessibility Needs */}
        <div>
          <label htmlFor="ask_accessibility" className="block text-sm font-medium text-gray-700">
            Do you have any accessibility or mobility needs?
          </label>
          <textarea
            id="ask_accessibility"
            name="ask_accessibility"
            value={formData.ask_accessibility}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
        </div>

        {/* Pets */}
        <div>
          <label htmlFor="ask_pets" className="block text-sm font-medium text-gray-700">
            Do you travel with pets? (e.g. 2 dogs)
          </label>
          <input
            type="text"
            id="ask_pets"
            name="ask_pets"
            value={formData.ask_pets}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit Onboarding Information
          </button>
        </div>
      </form>

      {submissionStatus && (
        <div
          className={`mt-4 p-3 text-sm text-center ${
            submissionStatus.includes('successful')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'} rounded-md`}
        >
          {submissionStatus}
        </div>
      )}
    </div>
  );
};

export default Onboarding;
