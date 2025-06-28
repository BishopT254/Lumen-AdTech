import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero - Redesigned for more impact */}
      <section className="container mx-auto px-4 py-24 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -right-20 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-16 md:mb-0">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">REVOLUTIONARY AD TECH</span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 text-gray-900 dark:text-white leading-tight">
              The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">Advertising</span> is Here
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-lg">
              Our AI-driven platform revolutionizes digital advertising with performance-based pricing. Pay only for real engagement, not impressions.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/demo" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:from-blue-700 hover:to-violet-700 transition shadow-lg shadow-blue-500/20 text-center font-medium">
                Experience the Demo
              </Link>
              <Link href="/auth/register" className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-lg border border-gray-200 dark:border-gray-700 text-center font-medium">
                Start Your Journey
              </Link>
            </div>
          </div>
          
          <div className="md:w-1/2 relative h-[400px] md:h-[500px]">
            {/* Modern 3D-like visualization */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-violet-600/10 dark:from-blue-900/20 dark:to-violet-900/20 rounded-2xl transform rotate-2"></div>
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl transform -rotate-2 shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="p-6 h-full relative">
                {/* Dashboard visualization with floating elements */}
                <div className="absolute top-6 left-6 right-6 h-20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-xl shadow-sm overflow-hidden flex items-center justify-between px-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">AI</div>
                    <div className="ml-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-500 rounded w-20 mt-2"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30"></div>
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30"></div>
                  </div>
                </div>
                
                <div className="absolute top-32 left-6 right-6 bottom-6">
                  <div className="grid grid-cols-5 grid-rows-3 gap-4 h-full">
                    <div className="col-span-3 row-span-2 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-xl p-4 relative">
                      <div className="h-5 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div>
                      <div className="h-full max-h-[160px] w-full bg-gradient-to-r from-blue-500/80 via-indigo-500/80 to-violet-500/80 rounded-lg relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1/2">
                          <div className="h-12 bg-white/90 dark:bg-gray-800/90 m-3 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 row-span-1 bg-violet-500/10 dark:bg-violet-500/20 rounded-xl p-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="flex justify-between items-end h-16">
                        <div className="h-full w-2 bg-violet-500/60 rounded-t"></div>
                        <div className="h-1/2 w-2 bg-violet-500/60 rounded-t"></div>
                        <div className="h-3/4 w-2 bg-violet-500/60 rounded-t"></div>
                        <div className="h-1/3 w-2 bg-violet-500/60 rounded-t"></div>
                        <div className="h-2/3 w-2 bg-violet-500/60 rounded-t"></div>
                        <div className="h-full w-2 bg-violet-500/60 rounded-t"></div>
                        <div className="h-2/5 w-2 bg-violet-500/60 rounded-t"></div>
                      </div>
                    </div>
                    <div className="col-span-2 row-span-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl p-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-12 w-full rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-blue-400/50 dark:bg-blue-600/50"></div>
                      </div>
                    </div>
                    <div className="col-span-5 row-span-1 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-300 dark:bg-gray-500 rounded"></div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-20 rounded-lg bg-blue-500 opacity-80"></div>
                        <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-600"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Updated with more modern design */}
      <section className="bg-white dark:bg-gray-800 py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-3">POWERFUL CAPABILITIES</span>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Smart Features That Drive Results</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our platform combines cutting-edge AI with intuitive design to revolutionize how you advertise.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Performance-Based Pricing",
                description: "Pay only for actual audience engagement and conversions, not traditional flat rates.",
                icon: "💰"
              },
              {
                title: "Real-Time Analytics",
                description: "AI-powered insights and audience estimation with immediate feedback.",
                icon: "📊"
              },
              {
                title: "Dynamic Targeting",
                description: "Location-aware, time-sensitive content delivery for maximum relevance.",
                icon: "🎯"
              },
              {
                title: "Self-Service Platform",
                description: "Streamlined campaign management for advertisers with intuitive workflows.",
                icon: "🛠️"
              },
              {
                title: "Revenue Sharing",
                description: "Commission-based model for screen owners and partners to maximize profits.",
                icon: "🤝"
              },
              {
                title: "Ethical AI Insights",
                description: "Privacy-preserving audience analytics with anonymized data collection.",
                icon: "🔒"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 p-8 rounded-2xl hover:shadow-xl transition group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-violet-400/10 dark:from-blue-400/20 dark:to-violet-400/20 rounded-bl-3xl transform translate-x-6 -translate-y-6 group-hover:translate-x-4 group-hover:-translate-y-4 transition-transform"></div>
                <div className="text-4xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Pricing Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-3">FLEXIBLE PRICING</span>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Performance-Based Pricing Engine</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our revolutionary pricing models ensure you only pay for actual results, maximizing your ROI.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                model: "CPM",
                title: "Cost Per Thousand Impressions",
                description: "Traditional model for brand awareness campaigns",
                highlight: "Market visibility",
                features: [
                  "Audience reach estimation",
                  "Demographic targeting",
                  "Brand exposure metrics"
                ]
              },
              {
                model: "CPE",
                title: "Cost Per Engagement",
                description: "Pay only when users interact with your ads",
                highlight: "Interactive engagement",
                features: [
                  "Click-through tracking",
                  "Interaction analytics",
                  "Engagement optimization"
                ]
              },
              {
                model: "CPA",
                title: "Cost Per Action",
                description: "Performance model based on user actions",
                highlight: "Conversion-focused",
                features: [
                  "Conversion tracking",
                  "Attribution modeling",
                  "ROI measurement"
                ]
              },
              {
                model: "Custom",
                title: "Hybrid Models",
                description: "Tailored pricing models for unique needs",
                highlight: "Fully customizable",
                features: [
                  "Multiple metric combinations",
                  "Custom KPI definitions",
                  "Adaptive pricing formulas"
                ]
              }
            ].map((plan, index) => (
              <div key={index} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-750 shadow-xl border border-gray-100 dark:border-gray-700 group hover:-translate-y-1 transition-all duration-300">
                <div className="p-6 bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                  <h3 className="text-xl font-bold mb-1">{plan.model}</h3>
                  <p className="text-blue-100 text-sm">{plan.title}</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
                  <div className="py-3 px-4 mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium text-sm">
                    {plan.highlight}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-600 dark:text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 pb-6">
                  <Link href="/pricing" className="block text-center py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition">
                    Learn More
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-750 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Smart Optimization</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="mr-4 mt-1 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Real-time pricing adjustments</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Dynamic pricing based on traffic and engagement data</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Budget optimization</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">AI-driven recommendations to maximize campaign efficiency</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-750 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Predictive Analysis</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="mr-4 mt-1 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Spend forecasting</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Accurate budget projections based on selected parameters</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mr-4 mt-1 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Performance trends</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Historical data analysis to predict future campaign success</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* New Testimonials Section */}
      <section className="py-24 bg-white dark:bg-gray-800 relative">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-gray-50 to-white dark:from-gray-750 dark:to-gray-800"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-3">CLIENT SUCCESS</span>
            <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">What Our Clients Are Saying</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Companies across industries have transformed their advertising strategies with our platform.
            </p>
          </div>
          
          <div className="grid gap-12">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl overflow-hidden shadow-xl">
              <div className="md:grid md:grid-cols-5">
                <div className="md:col-span-3 p-12 relative">
                  <svg className="absolute top-8 left-8 text-blue-400/30 dark:text-blue-400/20 h-16 w-16" fill="currentColor" viewBox="0 0 32 32">
                    <path d="M10,8H6a2,2,0,0,0-2,2v4a2,2,0,0,0,2,2h4v6H4V10A6,6,0,0,1,10,4Zm18,6V10a6,6,0,0,0-6-6V8a2,2,0,0,1,2,2v4a2,2,0,0,1-2,2H18v6h10V14Z"/>
                  </svg>
                  <div className="relative">
                    <p className="text-2xl text-gray-700 dark:text-gray-200 leading-relaxed mb-8">
                      "This platform completely transformed our advertising strategy. The performance-based pricing model saved us 40% on ad spend while increasing conversion rates by 65%. The real-time analytics give us unprecedented visibility into campaign performance."
                    </p>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">Sarah Johnson</h4>
                      <p className="text-blue-600 dark:text-blue-400">CMO at TechVision Corp</p>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center p-12">
                  <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-xl shadow-lg transform -rotate-3">
                    <div className="space-y-2 mb-4">
                      <div className="h-2 w-12 bg-blue-400 rounded-full"></div>
                      <div className="h-2 w-20 bg-violet-400 rounded-full"></div>
                      <div className="h-2 w-16 bg-blue-400 rounded-full"></div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Conversion Rate</div>
                      <div className="text-sm font-bold text-green-600">+65%</div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <div className="mt-6 flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Ad Spend Reduction</div>
                      <div className="text-sm font-bold text-green-600">-40%</div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Michael Chen",
                  role: "Digital Marketing Director, GlobalBrands",
                  quote: "The dynamic targeting capabilities allowed us to run location-specific campaigns that increased foot traffic by 37%.",
                  highlight: "+37% Foot Traffic"
                },
                {
                  name: "Elena Rodriguez",
                  role: "CEO, StartupInnovate",
                  quote: "As a startup, the flexible pricing models gave us enterprise-level advertising capabilities without the hefty price tag.",
                  highlight: "Enterprise Quality, Startup Budget"
                },
                {
                  name: "David Williams",
                  role: "Advertising Manager, RetailGiant",
                  quote: "The AI-driven insights helped us identify audience segments we hadn't considered, opening entirely new markets.",
                  highlight: "New Market Opportunities"
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-white dark:bg-gray-750 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition">
                  <div className="mb-6">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">"{testimonial.quote}"</p>
                  <div className="mt-auto">
                    <div className="py-2 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg inline-block mb-4">
                      {testimonial.highlight}
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{testimonial.name}</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
			   </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-violet-600 text-white relative overflow-hidden">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block py-1 px-3 rounded-full bg-white/20 text-white text-sm font-medium mb-6">START TODAY</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to Transform Your Advertising Strategy?</h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join the revolution in performance-based advertising and only pay for real results, not impressions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/demo" className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition shadow-lg shadow-blue-900/20 text-center font-medium">
                Schedule a Demo
              </Link>
              <Link href="/auth/register" className="px-8 py-4 bg-blue-500/30 backdrop-blur-sm text-white rounded-lg hover:bg-blue-500/40 transition border border-white/20 text-center font-medium">
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}