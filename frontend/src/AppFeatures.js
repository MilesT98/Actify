import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ActifyFeatures = () => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-xl p-10 border border-indigo-100 mt-10">
      <h2 className="text-3xl font-extrabold mb-8 text-center text-indigo-900 relative">
        <span className="relative inline-block">
          The ACTIFY Experience
          <span className="absolute -bottom-3 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"></span>
        </span>
      </h2>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Feature 1: Signup & Profile */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Signup & Profile Creation</h3>
          </div>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create an account with email or social login
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Set up profile with bio and picture
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Choose privacy settings (private or public)
            </li>
          </ul>
        </div>

        {/* Feature 2: Daily Challenge */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-indigo-900">The Daily Challenge</h3>
          </div>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Random daily notification with a new challenge
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              2-hour window to complete and submit
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Variety of challenge categories
            </li>
          </ul>
        </div>

        {/* Feature 3: Submission Process */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Submission Process</h3>
          </div>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit photo or video evidence
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              BeReal-like selfie mode for authenticity
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add caption and location tags
            </li>
          </ul>
        </div>

        {/* Feature 4: Social Engagement */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Social Engagement</h3>
          </div>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              React with emojis and comments
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Earn streaks and unlock badges
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Track performance on leaderboards
            </li>
          </ul>
        </div>

        {/* Feature 5: Groups & Challenges */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Groups & Challenges</h3>
          </div>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create or join private groups
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Compete with friends or random users
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Weekly/monthly leaderboards
            </li>
          </ul>
        </div>

        {/* Feature 6: Rewards & Gamification */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-indigo-900">Rewards & Gamification</h3>
          </div>
          <ul className="ml-4 space-y-2 text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Earn XP points for completing challenges
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Unlock new activity categories
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-indigo-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Potential monetary prizes for winners
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-10 text-center">
        <button
          onClick={() => navigate("/register")}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-lg"
        >
          Join ACTIFY Today →
        </button>
      </div>
    </div>
  );
};
