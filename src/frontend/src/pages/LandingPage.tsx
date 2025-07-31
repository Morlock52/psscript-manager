import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const LandingPage: React.FC = () => {
  return (
    <Layout hideSidebar={true}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              <span className="block">PowerShell Script</span>
              <span className="block text-blue-600 dark:text-blue-400">Management Simplified</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-xl text-gray-500 dark:text-gray-300">
              Organize, analyze, and share your PowerShell scripts with built-in AI assistance and collaboration tools.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                to="/register"
                className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get Started for Free
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-blue-600 px-6 py-3 text-lg font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 dark:hover:bg-opacity-20"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-gray-50 dark:bg-gray-800 rounded-xl my-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Everything you need to manage PowerShell scripts
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-300 lg:mx-auto">
                From script organization to advanced AI-powered analysis
              </p>
            </div>

            <div className="mt-10">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div className="pt-6">
                  <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8 shadow-lg h-full">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">Organized Repository</h3>
                      <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                        Categorize and tag scripts for easy discovery. Search by content, purpose, or tags to find exactly what you need.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8 shadow-lg h-full">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">AI Script Analysis</h3>
                      <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                        Automatically analyze scripts for security issues, performance optimizations, and best practices.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8 shadow-lg h-full">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">AI Chat Assistant</h3>
                      <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                        Chat with an AI assistant that understands PowerShell to help with script development, troubleshooting, and learning.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8 shadow-lg h-full">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">Secure Sharing</h3>
                      <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                        Share scripts securely with team members or keep them private. Control access with fine-grained permissions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8 shadow-lg h-full">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">Version Control</h3>
                      <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                        Track changes over time with built-in versioning. Easily roll back to previous versions when needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8 shadow-lg h-full">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">One-Click Deployment</h3>
                      <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                        Deploy scripts to your environments with a single click. Integrate with your existing CI/CD workflows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="py-12 bg-white dark:bg-gray-900 my-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="sm:text-center">
              <h2 className="text-base font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase">Pricing</h2>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                Plans for teams of all sizes
              </p>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 dark:text-gray-300">
                Choose the perfect plan for your needs. All plans include basic features.
              </p>
            </div>

            <div className="mt-12 space-y-4 sm:mt-16 sm:grid sm:grid-cols-3 sm:gap-6 sm:space-y-0">
              {/* Free Tier */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Free</h3>
                  <p className="mt-4 text-gray-500 dark:text-gray-300">Perfect for individual users and small projects.</p>
                  <p className="mt-8">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-300">/month</span>
                  </p>
                  <Link
                    to="/register"
                    className="mt-8 block w-full rounded-md border border-blue-600 bg-white dark:bg-transparent py-2 text-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 dark:hover:bg-opacity-20"
                  >
                    Get Started
                  </Link>
                </div>
                <div className="px-6 pt-6 pb-8">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">What's included:</h4>
                  <ul className="mt-6 space-y-4">
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Store up to 20 PowerShell scripts</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Basic script analysis</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Community support</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Tier */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border-2 border-blue-500 shadow-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Professional</h3>
                  <p className="mt-4 text-gray-500 dark:text-gray-300">For power users who need advanced features.</p>
                  <p className="mt-8">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">$19</span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-300">/month</span>
                  </p>
                  <Link
                    to="/register"
                    className="mt-8 block w-full rounded-md border border-transparent bg-blue-600 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Start Free Trial
                  </Link>
                </div>
                <div className="px-6 pt-6 pb-8">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">What's included:</h4>
                  <ul className="mt-6 space-y-4">
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Unlimited PowerShell scripts</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Advanced AI script analysis</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Priority email support</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Full AI chat capabilities</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Script versioning</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Enterprise Tier */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Enterprise</h3>
                  <p className="mt-4 text-gray-500 dark:text-gray-300">For teams and organizations with advanced needs.</p>
                  <p className="mt-8">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">$99</span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-300">/month</span>
                  </p>
                  <a
                    href="#contact-sales"
                    className="mt-8 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Contact Sales
                  </a>
                </div>
                <div className="px-6 pt-6 pb-8">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">What's included:</h4>
                  <ul className="mt-6 space-y-4">
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Everything in Professional</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Team collaboration features</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Role-based access control</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Dedicated support manager</span>
                    </li>
                    <li className="flex space-x-3">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-300">Custom integrations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="py-16 bg-gray-50 dark:bg-gray-800 rounded-xl mb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-base font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase">Testimonials</h2>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">What our users are saying</p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                    JD
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">John Doe</h4>
                    <p className="text-gray-500 dark:text-gray-300">IT Director</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-200">
                  "This tool has transformed how our IT team manages PowerShell scripts. The AI analysis has caught numerous potential issues before they became problems."
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                    JS
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Jane Smith</h4>
                    <p className="text-gray-500 dark:text-gray-300">DevOps Engineer</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-200">
                  "The version control and collaboration features have made it so much easier to work with my distributed team. We're much more productive now."
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xl">
                    RJ
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Robert Johnson</h4>
                    <p className="text-gray-500 dark:text-gray-300">System Administrator</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-200">
                  "The AI chat assistant is like having a PowerShell expert on call 24/7. It's helped me learn and improve my scripts dramatically."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-xl mb-16">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="block">Ready to get started?</span>
              <span className="block text-blue-200">Try PSScript today.</span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                >
                  Get started
                </Link>
              </div>
              <div className="ml-3 inline-flex rounded-md shadow">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LandingPage;