'use client'
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Zap, Shield, BrainCircuit, Rocket, BarChart, Leaf, Cpu, Clock, Database, Lock, Cloud, Terminal, Smartphone, Users, Eye, Puzzle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  const technicalHighlights = [
    { icon: <Zap />, title: "5G-Optimized Delivery", description: "MPEG-DASH adaptive streaming with edge computing nodes" },
    { icon: <BrainCircuit />, title: "Federated Learning", description: "Privacy-preserving model training across 10k+ edge devices" },
    { icon: <Shield />, title: "Zero-Knowledge Proofs", description: "SSI onboarding with Hyperledger Indy/Aries" },
    { icon: <Leaf />, title: "Carbon Dashboard", description: "Real-time emissions tracking per campaign" },
    { icon: <Puzzle />, title: "Modular Microservices", description: "43 independent services orchestrated via Kubernetes" },
    { icon: <Cloud />, title: "Multi-Cloud Infrastructure", description: "AWS/GCP hybrid architecture with 99.999% SLA" }
  ];

  const architectureLayers = [
    { name: "Presentation Layer", components: ["Next.js 14", "React Native", "Android TV SDK", "ARCore"], icon: <Smartphone /> },
    { name: "Services Layer", components: ["NestJS Microservices", "GraphQL Gateway", "Redis Cluster", "Kafka Streams"], icon: <Terminal /> },
    { name: "AI Layer", components: ["TensorFlow Federated", "PySyft", "TF Lite", "OpenCV"], icon: <BrainCircuit /> },
    { name: "Blockchain Layer", components: ["Hyperledger Fabric", "Ethereum ERC-725", "IPFS Storage", "ZK-SNARKs"], icon: <Database /> },
    { name: "Infrastructure Layer", components: ["K8s Clusters", "AWS Wavelength", "GCP Distributed Cloud", "Istio Service Mesh"], icon: <Cloud /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Reinventing Digital Advertising
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Lumen combines cutting-edge AI, blockchain transparency, and ethical audience engagement to create the world's first performance-based DOOH advertising ecosystem.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            <StatCard icon={<Rocket />} label="Active Campaigns" value="15.8K" />
            <StatCard icon={<Eye />} label="Daily Impressions" value="238M" />
            <StatCard icon={<Cpu />} label="Edge Nodes" value="42.9K" />
            <StatCard icon={<Leaf />} label="CO2 Reduced" value="2.1KT" />
          </div>
        </motion.div>
      </section>

      {/* Technical Architecture */}
      <section className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Next-Gen Architecture
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {architectureLayers.map((layer, index) => (
              <motion.div 
                key={layer.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="text-blue-600 dark:text-blue-400 mb-4">{layer.icon}</div>
                <h3 className="text-xl font-semibold mb-4">{layer.name}</h3>
                <ul className="space-y-2">
                  {layer.components.map(component => (
                    <li key={component} className="flex items-center text-gray-600 dark:text-gray-400">
                      <span className="mr-2">▹</span>
                      {component}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Innovations */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Breakthrough Technologies
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {technicalHighlights.map((highlight, index) => (
              <motion.div
                key={highlight.title}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <div className="text-blue-600 dark:text-blue-400 text-4xl mb-6">
                  {highlight.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4">{highlight.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{highlight.description}</p>
                <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  <span>Deep Dive</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ethical AI Showcase */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Ethical Audience Intelligence
                </span>
              </h2>
              <p className="text-lg text-gray-300">
                Our privacy-first approach revolutionizes audience measurement without compromising individual privacy.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <FeatureBadge icon={<Lock />} text="On-Device Processing" />
                <FeatureBadge icon={<Users />} text="Anonymous Aggregation" />
                <FeatureBadge icon={<Eye />} text="No Facial Recognition" />
                <FeatureBadge icon={<Database />} text="GDPR-Compliant Storage" />
              </div>
              
              <div className="mt-8 p-6 bg-gray-800 rounded-xl">
                <h4 className="text-xl font-semibold mb-4">Technical Implementation</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>• TensorFlow Lite with Mini-Xception models</li>
                  <li>• Federated learning with PySyft</li>
                  <li>• Hyperledger Indy for SSI</li>
                  <li>• MPC-based analytics aggregation</li>
                </ul>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative h-96 rounded-2xl overflow-hidden border border-gray-700"
            >
              <Image
                src="/images/ai-pipeline.png"
                alt="AI Pipeline"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Roadmap */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Innovation Roadmap
            </span>
          </h2>
          
          <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <Image
              src="/images/tech-roadmap.png"
              alt="Technology Roadmap"
              fill
              className="object-contain p-8"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white dark:to-gray-900" />
          </div>
        </div>
      </section>

      {/* Technical Leadership */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Engineering Excellence
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              37 patents pending across AI optimization, blockchain verification, and sustainable ad tech innovations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <TechLeadership 
              title="AI Research" 
              metrics={["15.2M Params", "93.4% Accuracy", "200ms Inference"]} 
            />
            <TechLeadership 
              title="Blockchain" 
              metrics={["2.3s Finality", "142K TPS", "ZK-Proofs"]} 
            />
            <TechLeadership 
              title="Infrastructure" 
              metrics={["99.999% Uptime", "18ms P99", "5-9s Scaling"]} 
            />
            <TechLeadership 
              title="Sustainability" 
              metrics={["42% Efficiency", "0.2W/Impression", "LEED Certified"]} 
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// Component: Animated Stat Card
const StatCard = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center space-x-4"
  >
    <div className="text-blue-600 dark:text-blue-400 text-3xl">{icon}</div>
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-600 dark:text-gray-400 text-sm">{label}</div>
    </div>
  </motion.div>
);

// Component: Feature Badge
const FeatureBadge = ({ icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center bg-gray-800 px-4 py-2 rounded-full w-fit">
    <span className="text-blue-400 mr-2">{icon}</span>
    <span className="text-sm">{text}</span>
  </div>
);

// Component: Tech Leadership Card
const TechLeadership = ({ title, metrics }: { title: string, metrics: string[] }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700"
  >
    <h3 className="text-xl font-semibold mb-4">{title}</h3>
    <ul className="space-y-2">
      {metrics.map((metric, index) => (
        <li key={index} className="flex items-center text-gray-600 dark:text-gray-400">
          <span className="mr-2">▹</span>
          {metric}
        </li>
      ))}
    </ul>
  </motion.div>
);