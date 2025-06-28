'use client'

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock, MessageSquare, Users, CheckCircle, Mic, Calendar, Globe, FileText, HelpCircle, Send, PenTool, Upload, Video, ChevronDown, X, ArrowRight, Zap, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Contact() {
  // State management for form fields and UI state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    preferredContact: 'email',
    urgency: 'normal',
    department: '',
    attachments: [],
    timeZone: '',
    preferredCallback: []
  });
  
  // Reference for scheduling video call component
  const videoCallRef = useRef(null);
  
  // Form validation state
  const [errors, setErrors] = useState({});
  const [formStatus, setFormStatus] = useState({ submitted: false, success: false, message: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [activeSection, setActiveSection] = useState('form');
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI assistant. How can I help you today?' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [liveAgents, setLiveAgents] = useState({
    available: true,
    currentlyActive: 3,
    estimatedWait: '2 minutes'
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [schedulingStep, setSchedulingStep] = useState(1);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending');
  const [userLocation, setUserLocation] = useState(null);
  const [closestOffice, setClosestOffice] = useState(null);
  const [showOfficeLocator, setShowOfficeLocator] = useState(false);
  
  // Media recorder state
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Supported languages for internationalization
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' }
  ];
  
  // Feedback collection
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  
  // Office data
  const offices = [
    {
      id: 1,
      name: 'Headquarters',
      address: '123 Innovation Drive, San Francisco, CA 94103',
      phone: '+1 (415) 555-1234',
      email: 'sf@adrevolution.com',
      hours: 'Mon-Fri: 9AM-6PM PT',
      coordinates: { lat: 37.7749, lng: -122.4194 },
      image: '/images/sf-office.jpg',
      timezone: 'America/Los_Angeles',
      teams: ['Executive', 'Product', 'Engineering', 'Marketing']
    },
    {
      id: 2,
      name: 'East Coast Office',
      address: '456 Tech Square, New York, NY 10001',
      phone: '+1 (212) 555-6789',
      email: 'nyc@adrevolution.com',
      hours: 'Mon-Fri: 9AM-6PM ET',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      image: '/images/nyc-office.jpg',
      timezone: 'America/New_York',
      teams: ['Sales', 'Customer Success', 'Finance']
    },
    {
      id: 3,
      name: 'European HQ',
      address: '789 Digital Avenue, London, UK SW1A 1AA',
      phone: '+44 20 7946 0958',
      email: 'london@adrevolution.com',
      hours: 'Mon-Fri: 9AM-6PM GMT',
      coordinates: { lat: 51.5074, lng: -0.1278 },
      image: '/images/london-office.jpg',
      timezone: 'Europe/London',
      teams: ['EMEA Sales', 'Marketing', 'Customer Success']
    },
    {
      id: 4,
      name: 'APAC Office',
      address: '10 Innovation Boulevard, Singapore 018956',
      phone: '+65 6123 4567',
      email: 'singapore@adrevolution.com',
      hours: 'Mon-Fri: 9AM-6PM SGT',
      coordinates: { lat: 1.3521, lng: 103.8198 },
      image: '/images/singapore-office.jpg',
      timezone: 'Asia/Singapore',
      teams: ['APAC Sales', 'Customer Success']
    }
  ];
  
  // Department data for routing
  const departments = [
    { id: 'sales', name: 'Sales', icon: <Users className="h-5 w-5" /> },
    { id: 'support', name: 'Customer Support', icon: <HelpCircle className="h-5 w-5" /> },
    { id: 'technical', name: 'Technical Help', icon: <Zap className="h-5 w-5" /> },
    { id: 'billing', name: 'Billing', icon: <FileText className="h-5 w-5" /> },
    { id: 'partnership', name: 'Partnership', icon: <Users className="h-5 w-5" /> },
    { id: 'media', name: 'Media Inquiries', icon: <Video className="h-5 w-5" /> }
  ];
  
  // Time slots for scheduling
  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
  ];
  
  // FAQ data
  const faqs = [
    {
      question: 'What are the pricing models available?',
      answer: 'We offer several pricing models including CPM (Cost Per Thousand Impressions), CPE (Cost Per Engagement), CPA (Cost Per Action), and custom hybrid models tailored to your specific needs.'
    },
    {
      question: 'How does the AI optimization work?',
      answer: 'Our AI algorithms analyze real-time campaign performance data to automatically adjust targeting parameters, creative elements, and bidding strategies to maximize ROI.'
    },
    {
      question: 'What integrations do you support?',
      answer: 'We integrate with major marketing platforms including Google Analytics, Salesforce, HubSpot, Shopify, Facebook Ads, and more. Custom API integrations are also available.'
    },
    {
      question: 'How do I get started?',
      answer: 'You can start by requesting a demo through this contact form or signing up for a free trial account. Our onboarding team will guide you through the platform setup.'
    },
    {
      question: 'What support options are available?',
      answer: 'We offer 24/7 technical support via chat, email, and phone. Premium support plans include dedicated account managers and priority response times.'
    }
  ];
  
  // Get user's location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted');
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userCoords);
          
          // Find closest office based on coordinates
          findClosestOffice(userCoords);
        },
        () => {
          setLocationPermission('denied');
        }
      );
    }
    
    // Set user's timezone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData(prev => ({ ...prev, timeZone: userTimeZone }));
    
  }, []);
  
  // Find closest office based on user location
  const findClosestOffice = (userCoords) => {
    if (!userCoords) return;
    
    let closest = null;
    let closestDistance = Infinity;
    
    offices.forEach(office => {
      const distance = calculateDistance(
        userCoords.lat, 
        userCoords.lng, 
        office.coordinates.lat, 
        office.coordinates.lng
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = office;
      }
    });
    
    setClosestOffice(closest);
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle checkbox changes for preferred callback times
  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData(prev => ({ 
        ...prev, 
        preferredCallback: [...prev.preferredCallback, value]
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        preferredCallback: prev.preferredCallback.filter(time => time !== value)
      }));
    }
  };
  
  // Handle file attachments
  const handleFileAttachment = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.attachments.length > 5) {
      setErrors(prev => ({ 
        ...prev, 
        attachments: 'Maximum 5 files allowed'
      }));
      return;
    }
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024); // 10MB limit
    if (oversizedFiles.length > 0) {
      setErrors(prev => ({ 
        ...prev, 
        attachments: 'Files must be under 10MB'
      }));
      return;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      attachments: [...prev.attachments, ...files]
    }));
  };
  
  // Remove an attachment
  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };
  
  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.addEventListener('dataavailable', event => {
        audioChunks.current.push(event.data);
      });
      
      mediaRecorder.current.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url: audioUrl });
        
        // Add the audio recording to form attachments
        const audioFile = new File([audioBlob], "voice-message.mp3", { type: "audio/mp3" });
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, audioFile],
          message: prev.message + "\n[Voice message attached]"
        }));
      });
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setErrors(prev => ({ ...prev, recording: 'Could not access microphone' }));
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Delete recorded audio
  const deleteRecording = () => {
    setRecordedAudio(null);
    
    // Remove the audio file from attachments
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(file => file.name !== "voice-message.mp3"),
      message: prev.message.replace("\n[Voice message attached]", "")
    }));
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.phone && !/^\+?[0-9\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }
    
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    if (!formData.department) newErrors.department = 'Please select a department';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Show loading state
    setFormStatus({ submitted: true, success: false, message: 'Sending your message...' });
    
    try {
      // In a real application, you would send the form data to your API
      // This is just a simulation for demonstration purposes
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form on success
      setFormStatus({ 
        submitted: true, 
        success: true, 
        message: 'Thank you! Your message has been sent. We\'ll get back to you shortly.' 
      });
      
      // Reset form data
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: '',
        preferredContact: 'email',
        urgency: 'normal',
        department: '',
        attachments: [],
        timeZone: formData.timeZone,
        preferredCallback: []
      });
      
      setRecordedAudio(null);
      
      // Show feedback request after successful submission
      setTimeout(() => {
        setShowFeedback(true);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormStatus({ 
        submitted: true, 
        success: false, 
        message: 'There was an error sending your message. Please try again.' 
      });
    }
  };
  
  // Handle AI assistant input
  const handleAiInput = (e) => {
    setAiInput(e.target.value);
  };
  
  // Send message to AI assistant
  const sendAiMessage = () => {
    if (!aiInput.trim()) return;
    
    // Add user message to chat
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
    
    // Simulate AI response (in a real app, this would call your AI service)
    setTimeout(() => {
      let response;
      const lowercaseInput = aiInput.toLowerCase();
      
      if (lowercaseInput.includes('pricing') || lowercaseInput.includes('cost')) {
        response = "We offer flexible pricing models including CPM, CPE, and CPA with custom options available. Would you like to schedule a call with our sales team to discuss specific pricing for your needs?";
      } else if (lowercaseInput.includes('support') || lowercaseInput.includes('help')) {
        response = "Our support team is available 24/7. You can reach them via email at support@adrevolution.com or call +1 (800) 555-9876. Would you like me to connect you with a live agent?";
      } else if (lowercaseInput.includes('demo') || lowercaseInput.includes('trial')) {
        response = "We offer a 14-day free trial with full access to all features. Would you like me to help you set up a demo with one of our product specialists?";
      } else {
        response = "Thank you for your message. Would you like to fill out our contact form for a more detailed response, or connect with a live agent?";
      }
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 1000);
    
    // Clear input
    setAiInput('');
  };
  
  // Handle date selection for appointment scheduling
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSchedulingStep(2);
  };
  
  // Handle time slot selection for appointment scheduling
  const handleTimeSelect = (time) => {
    setSelectedTimeSlot(time);
    setSchedulingStep(3);
  };
  
  // Confirm scheduled appointment
  const confirmAppointment = () => {
    setFormData(prev => ({
      ...prev,
      message: `${prev.message}\n\nRequested callback: ${selectedDate.toDateString()} at ${selectedTimeSlot}`
    }));
    
    setSchedulingStep(4);
    
    // Scroll to message section
    setTimeout(() => {
      document.getElementById('message').scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };
  
  // Generate calendar dates for the next 14 days
  const getCalendarDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      // Exclude weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date);
      }
    }
    
    return dates;
  };
  
  // Render functions
  const renderAiAssistant = () => (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {showAIAssistant && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-80 sm:w-96 max-h-[500px] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <h3 className="font-semibold">AI Assistant</h3>
              <button 
                onClick={() => setShowAIAssistant(false)}
                className="p-1 rounded-full hover:bg-blue-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex">
              <input
                type="text"
                value={aiInput}
                onChange={handleAiInput}
                onKeyPress={(e) => e.key === 'Enter' && sendAiMessage()}
                placeholder="Type your question here..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-200"
              />
              <button
                onClick={sendAiMessage}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showAIAssistant && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAIAssistant(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
  
  const renderLiveAgentStatus = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl mb-8">
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full ${liveAgents.available ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1">
          Live Agents: {liveAgents.available ? 'Available Now' : 'Unavailable'}
        </h3>
        <Link href="/live-chat" className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm flex items-center">
          Start Live Chat <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-blue-500 mr-2" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {liveAgents.currentlyActive} agents online
          </span>
        </div>
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-blue-500 mr-2" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Est. wait time: {liveAgents.estimatedWait}
          </span>
        </div>
      </div>
    </div>
  );
  
  const renderTabs = () => (
    <div className="flex overflow-x-auto space-x-1 mb-8 pb-2">
      {['form', 'offices', 'scheduling', 'faq'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveSection(tab)}
          className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
            activeSection === tab
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {tab === 'form' && 'Contact Form'}
          {tab === 'offices' && 'Our Offices'}
          {tab === 'scheduling' && 'Schedule Call'}
          {tab === 'faq' && 'FAQ'}
        </button>
      ))}
    </div>
  );
  
  const renderLanguageSelector = () => (
    <div className="relative inline-block mb-8">
      <div
        className="flex items-center space-x-2 cursor-pointer bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2"
        onClick={() => document.getElementById('language-dropdown').classList.toggle('hidden')}
      >
        <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {languages.find(l => l.code === selectedLanguage)?.name || 'English'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
      
      <div id="language-dropdown" className="hidden absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-10 border border-gray-200 dark:border-gray-700 w-48">
        {languages.map(language => (
          <button
            key={language.code}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            onClick={() => {
              setSelectedLanguage(language.code);
              document.getElementById('language-dropdown').classList.add('hidden');
            }}
          >
            {language.name}
          </button>
        ))}
      </div>
    </div>
  );
  
  const renderOfficeLocator = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Find Your Nearest Office</h3>
        
        {locationPermission === 'pending' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Requesting your location...</p>
          </div>
        )}
        
        {locationPermission === 'denied' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
            <p>Location access is required to find your nearest office. Please enable location services in your browser and refresh the page.</p>
          </div>
        )}
        
        {locationPermission === 'granted' && closestOffice && (
          <div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
              <p className="text-blue-700 dark:text-blue-300 font-medium">Your nearest office is:</p>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{closestOffice.name}</h4>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{closestOffice.address}</p>
              
              <div className="mt-4 flex space-x-4">
                <a 
                  href={`tel:${closestOffice.phone}`}
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  <span>Call</span>
                </a>
                <a 
                  href={`mailto:${closestOffice.email}`}
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  <span>Email</span>
                </a>
                <a 
                  href={`https://maps.google.com/?q=${closestOffice.coordinates.lat},${closestOffice.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>Directions</span>
                </a>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedOffice(closestOffice)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              View Office Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderContactForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500 error-message">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="john.doe@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-500 error-message">{errors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500 error-message">{errors.phone}</p>}
            </div>
            
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company/Organization
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Acme Inc."
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Message Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Message Details</h3>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {departments.map(dept => (
                  <div 
                    key={dept.id}
                    onClick={() => setFormData(prev => ({ ...prev, department: dept.id }))}
                    className={`cursor-pointer rounded-lg p-4 border transition flex items-center ${
                      formData.department === dept.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="mr-3 text-blue-600 dark:text-blue-400">
                      {dept.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {dept.name}
                    </span>
                  </div>
                ))}
              </div>
              {errors.department && <p className="mt-2 text-sm text-red-500 error-message">{errors.department}</p>}
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Subject of your message"
              />
              {errors.subject && <p className="mt-1 text-sm text-red-500 error-message">{errors.subject}</p>}
            </div>
            
            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Urgency Level
              </label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low - No immediate response needed</option>
                <option value="normal">Normal - Response within 24-48 hours</option>
                <option value="high">High - Response within 24 hours</option>
                <option value="urgent">Urgent - Immediate attention required</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={6}
                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Please provide details about your inquiry..."
              ></textarea>
              {errors.message && <p className="mt-1 text-sm text-red-500 error-message">{errors.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Voice Message
              </label>
              <div className="flex items-center space-x-4">
                {!isRecording && !recordedAudio && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Record Voice Message
                  </button>
                )}
                
                {isRecording && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-red-500">Recording...</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Stop
                    </button>
                  </div>
                )}
                
                {recordedAudio && (
                  <div className="flex items-center space-x-4">
                    <audio controls src={recordedAudio.url} className="h-10"></audio>
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              {errors.recording && <p className="mt-1 text-sm text-red-500 error-message">{errors.recording}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attachments (Max 5 files, 10MB each)
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition px-4 py-2 rounded-lg flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Upload Files</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileAttachment}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formData.attachments.length} / 5 files
                </span>
              </div>
              
              {formData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.attachments && <p className="mt-1 text-sm text-red-500 error-message">{errors.attachments}</p>}
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Preferences</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Contact Method
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="preferredContact"
                    value="email"
                    checked={formData.preferredContact === 'email'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Email</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="preferredContact"
                    value="phone"
                    checked={formData.preferredContact === 'phone'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Phone</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="preferredContact"
                    value="video"
                    checked={formData.preferredContact === 'video'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Video Call</span>
                </label>
              </div>
            </div>
            
            {formData.preferredContact === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Callback Times
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Morning', 'Afternoon', 'Evening', 'Monday-Friday', 'Weekend'].map(time => (
                    <label key={time} className="flex items-center cursor-pointer p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="checkbox"
                        value={time}
                        checked={formData.preferredCallback.includes(time)}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{time}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {formData.preferredContact === 'video' && (
              <div ref={videoCallRef}>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                  To schedule a video call, please use our scheduling tool in the "Schedule Call" tab.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('scheduling')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Open Scheduling Tool
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Privacy Consent and Submit */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="mb-6">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                name="privacyConsent"
                required
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                I agree to the <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link> and consent to the processing of my personal data as described therein.
              </span>
            </label>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <button
              type="submit"
              disabled={formStatus.submitted && !formStatus.message.includes('error')}
              className={`px-6 py-3 rounded-lg font-medium text-white transition flex items-center justify-center ${
                formStatus.submitted && !formStatus.message.includes('error')
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {formStatus.submitted && !formStatus.message.includes('error') ? (
                formStatus.success ? (
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Sent Successfully
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                )
              ) : (
                <div className="flex items-center">
                  <Send className="h-5 w-5 mr-2" />
                  Send Message
                </div>
              )}
            </button>
            
            {/* Show feedback message if form is submitted */}
            {formStatus.submitted && (
              <p className={`text-sm ${formStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formStatus.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
  
  const renderOffices = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {offices.map(office => (
        <div 
          key={office.id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col h-full"
        >
          <div className="relative h-48">
            <Image 
              src={office.image} 
              alt={office.name} 
              fill
              className="object-cover"
            />
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{office.name}</h3>
            
            <div className="space-y-3 text-gray-700 dark:text-gray-300 text-sm mb-4 flex-1">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{office.address}</span>
              </div>
              
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{office.phone}</span>
              </div>
              
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{office.email}</span>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{office.hours}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {office.teams.map((team, index) => (
                  <span key={index} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-lg text-xs">
                    {team}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2 mt-4">
              <a 
                href={`https://maps.google.com/?q=${office.coordinates.lat},${office.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-center text-sm flex items-center justify-center"
              >
                <MapPin className="h-4 w-4 mr-1" /> Directions
              </a>
              <button
                onClick={() => setSelectedOffice(office)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition text-center text-sm flex items-center justify-center"
              >
                <PenTool className="h-4 w-4 mr-1" /> Contact
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  
  const renderOfficeDetails = () => {
    if (!selectedOffice) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="relative h-64">
            <Image 
              src={selectedOffice.image} 
              alt={selectedOffice.name} 
              fill
              className="object-cover"
            />
            <button
              onClick={() => setSelectedOffice(null)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)]">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{selectedOffice.name}</h3>
            
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{selectedOffice.address}</span>
              </div>
              
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{selectedOffice.phone}</span>
              </div>
              
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{selectedOffice.email}</span>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <span>{selectedOffice.hours}</span>
              </div>
              
              <div className="pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Teams at this location:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOffice.teams.map((team, index) => (
                    <span key={index} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-lg text-sm">
                      {team}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <a 
              href={`https://maps.google.com/?q=${selectedOffice.coordinates.lat},${selectedOffice.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-center flex items-center justify-center"
            >
              <MapPin className="h-5 w-5 mr-2" /> Get Directions
            </a>
            <a 
              href={`tel:${selectedOffice.phone}`}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition text-center flex items-center justify-center"
            >
              <Phone className="h-5 w-5 mr-2" /> Call Office
            </a>
            <a 
			  href={`mailto:${selectedOffice.email}`}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition text-center flex items-center justify-center"
            >
            <Mail className="h-5 w-5 mr-2" /> Email Office
            </a>
          </div>
        </div>
     
    </motion.div>
  );
}

  const renderScheduling = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Schedule Video Consultation</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Select Availability</h4>
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDates().map((date, index) => (
                <button
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  className={`p-2 rounded-lg text-center transition ${
                    date.toDateString() === selectedDate?.toDateString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-sm font-medium">{date.getDate()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Timezone & Details */}
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Globe className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Time Zone: {formData.timeZone}</span>
              </div>
              {selectedDate && (
                <p className="text-sm">
                  Selected Date: {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Time Slot Grid */}
            {schedulingStep >= 2 && (
              <div className="space-y-4">
                <h4 className="font-medium">Available Time Slots</h4>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((time, index) => (
                    <button
                      key={index}
                      onClick={() => handleTimeSelect(time)}
                      className={`p-2 rounded-lg transition ${
                        time === selectedTimeSlot
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduling Controls */}
            <div className="flex gap-3">
              {schedulingStep > 1 && (
                <button
                  onClick={() => setSchedulingStep(s => s - 1)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (schedulingStep < 3) setSchedulingStep(s => s + 1);
                  else confirmAppointment();
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  schedulingStep === 4 
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!selectedDate || (schedulingStep === 2 && !selectedTimeSlot)}
              >
                {schedulingStep === 1 && 'Select Date'}
                {schedulingStep === 2 && 'Select Time'}
                {schedulingStep === 3 && 'Confirm Appointment'}
                {schedulingStep === 4 && 'Scheduled Successfully'}
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Preview */}
        {schedulingStep === 3 && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <span className="font-medium">Appointment Details:</span>
            </div>
            <p className="mt-2 text-sm">
              {selectedDate?.toLocaleDateString()} at {selectedTimeSlot} ({formData.timeZone})
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFAQ = () => (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <h3 className="font-medium">{faq.question}</h3>
            <ChevronDown className="h-5 w-5 transform transition-transform" />
          </div>
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="px-4 pb-4 text-gray-600 dark:text-gray-300"
          >
            {faq.answer}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <>
      <Head>
        <title>Contact Us - AdRevolution</title>
        <meta name="description" content="Connect with AdRevolution's team through multiple channels including AI assistant, live chat, video consultations, and global offices." />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header Section */}
          <div className="text-center mb-12 space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              Transform Your Advertising
            </motion.h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Multi-channel contact solutions powered by AI
            </p>
          </div>

          {renderLiveAgentStatus()}
          {renderTabs()}
          <div className="flex flex-wrap gap-4 mb-8">
            {renderLanguageSelector()}
            {activeSection === 'offices' && (
              <button
                onClick={() => setShowOfficeLocator(!showOfficeLocator)}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition flex items-center"
              >
                <MapPin className="h-5 w-5 mr-2" />
                {showOfficeLocator ? 'Hide Office Locator' : 'Find Nearest Office'}
              </button>
            )}
          </div>

          {showOfficeLocator && renderOfficeLocator()}

          {/* Dynamic Content Sections */}
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: activeSection === 'form' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeSection === 'form' ? -20 : 20 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'form' && renderContactForm()}
              {activeSection === 'offices' && renderOffices()}
              {activeSection === 'scheduling' && renderScheduling()}
              {activeSection === 'faq' && renderFAQ()}
            </motion.div>
          </AnimatePresence>

          {/* Feedback Modal */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold mb-4">How was your experience?</h3>
                  <div className="flex justify-center space-x-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className={`h-8 w-8 transition-transform hover:scale-125 ${
                          star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        <Star className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Optional feedback..."
                    className="w-full p-2 border rounded-lg mb-4 dark:bg-gray-700 dark:border-gray-600"
                    rows="3"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowFeedback(false)}
                      className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Handle feedback submission
                        setShowFeedback(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {renderAiAssistant()}
      {selectedOffice && renderOfficeDetails()}
    </>
  );
}