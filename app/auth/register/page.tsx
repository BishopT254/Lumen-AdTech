"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { usePublicSettings } from "@/hooks/usePublicSettings"

// Define the form data type
interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: "ADVERTISER" | "PARTNER"
}

// Enhanced schema with password confirmation and stronger validation
const userSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name must be less than 50 characters" }),
    email: z
      .string()
      .email({ message: "Invalid email address" })
      .transform((val) => val.toLowerCase()),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
    confirmPassword: z.string(),
    role: z.enum(["ADVERTISER", "PARTNER"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

// Helper function to validate fields without using .shape
const validateFieldHelper = (name: string, value: any, formData: FormData) => {
  try {
    // Create a partial schema for the specific field
    if (name === "name") {
      z.string()
        .min(2, { message: "Name must be at least 2 characters" })
        .max(50, { message: "Name must be less than 50 characters" })
        .parse(value)
    } else if (name === "email") {
      z.string().email({ message: "Invalid email address" }).parse(value)
    } else if (name === "password") {
      z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[0-9]/, { message: "Password must contain at least one number" })
        .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
        .parse(value)
    } else if (name === "confirmPassword") {
      z.string().parse(value)
      // Special case for confirmPassword which needs refine
      if (formData.password !== value) {
        throw new Error("Passwords do not match")
      }
    } else if (name === "role") {
      z.enum(["ADVERTISER", "PARTNER"]).parse(value)
    }

    return { valid: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || "Invalid input" }
    } else if (error instanceof Error) {
      return { valid: false, error: error.message }
    }
    return { valid: false, error: "Invalid input" }
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { generalSettings, systemSettings, loading: settingsLoading } = usePublicSettings()

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "ADVERTISER",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [serverError, setServerError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [successMessage, setSuccessMessage] = useState("")

  // Platform name from settings or fallback
  const platformName = generalSettings?.platformName || generalSettings?.platform_name || "Lumen"

  // Check if system is in maintenance mode
  const maintenanceMode = systemSettings?.maintenanceMode || false
  const maintenanceInfo = maintenanceMode
    ? {
        day: systemSettings?.maintenanceDay || "",
        time: systemSettings?.maintenanceTime || "",
        duration: systemSettings?.maintenanceDuration || 0,
      }
    : null

  // Add CSRF token state
  const [csrfToken, setCsrfToken] = useState("")

  // Add useEffect to fetch CSRF token
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch("/api/auth/csrf")
        const data = await response.json()
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken)
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error)
      }
    }

    fetchCsrfToken()
  }, [])

  // Show maintenance warning if system is in maintenance mode
  useEffect(() => {
    if (maintenanceMode && maintenanceInfo) {
      setServerError(
        `System maintenance scheduled for ${maintenanceInfo.day} at ${maintenanceInfo.time} for approximately ${maintenanceInfo.duration} minutes. Registration may be temporarily unavailable.`,
      )
    }
  }, [maintenanceMode, maintenanceInfo])

  // Password strength calculation
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    if (formData.password.length >= 8) strength += 1
    if (/[A-Z]/.test(formData.password)) strength += 1
    if (/[a-z]/.test(formData.password)) strength += 1
    if (/[0-9]/.test(formData.password)) strength += 1
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 1

    setPasswordStrength(strength)
  }, [formData.password])

  // Password strength label
  const passwordStrengthInfo = useMemo(() => {
    if (!formData.password) {
      return { text: "", color: "bg-gray-500" }
    } else if (passwordStrength === 0) {
      return { text: "Very Weak", color: "bg-red-500" }
    } else if (passwordStrength === 1) {
      return { text: "Weak", color: "bg-red-400" }
    } else if (passwordStrength === 2) {
      return { text: "Fair", color: "bg-yellow-500" }
    } else if (passwordStrength === 3) {
      return { text: "Good", color: "bg-yellow-400" }
    } else if (passwordStrength === 4) {
      return { text: "Strong", color: "bg-green-500" }
    } else {
      return { text: "Very Strong", color: "bg-green-400" }
    }
  }, [formData.password, passwordStrength])

  const validateField = useCallback(
    (name: keyof FormData) => {
      const result = validateFieldHelper(name, formData[name], formData)

      if (result.valid) {
        // Clear error for this field if validation passes
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
        return true
      } else {
        setErrors((prev) => ({ ...prev, [name]: result.error }))
        return false
      }
    },
    [formData],
  )

  const validateForm = useCallback(() => {
    try {
      // Mark all fields as touched
      const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
      setTouchedFields(allTouched)

      // Validate with zod
      userSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }, [formData])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))

      // Mark field as touched
      setTouchedFields((prev) => ({ ...prev, [name]: true }))

      // Clear error when user types
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    },
    [errors],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name } = e.target
      validateField(name as keyof FormData)
    },
    [validateField],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Don't allow submission during system maintenance
    if (maintenanceMode) {
      setServerError("Registration is currently unavailable due to system maintenance. Please try again later.")
      return
    }

    setServerError("")
    setSuccessMessage("")

    if (!validateForm()) {
      return
    }

    // Check if CSRF token is available
    if (!csrfToken) {
      setServerError("Security token is missing. Please refresh the page and try again.")
      return
    }

    setIsLoading(true)

    // Extract the data we want to send (remove confirmPassword)
    const { confirmPassword, ...dataToSend } = formData

    try {
      // Add rate limiting hint with exponential backoff
      let retryCount = 0
      const maxRetries = 3
      const baseDelay = 1000 // 1 second

      const attemptRegistration = async (): Promise<Response> => {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(dataToSend),
          credentials: "include", // Include cookies for additional security
        })

        if (response.status === 429 && retryCount < maxRetries) {
          // Rate limited, implement exponential backoff
          retryCount++
          const delay = baseDelay * Math.pow(2, retryCount)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return attemptRegistration()
        }

        return response
      }

      const response = await attemptRegistration()
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Registration failed")
      }

      // Set success message
      setSuccessMessage("Registration successful! Redirecting to sign in page...")

      // Redirect to sign in page after successful registration
      setTimeout(() => {
        router.push("/auth/signin?registered=true")
      }, 2000) // Redirect after 2 seconds
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message)
      } else {
        setServerError("An unexpected error occurred")
      }
      setIsLoading(false)
    }
  }

  // Password strength indicator component
  const PasswordStrengthIndicator = () => {
    const { text, color } = passwordStrengthInfo

    return (
      <div className="mt-1">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">Password Strength: {text}</div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${(passwordStrength / 5) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  // Showing loading state while settings are being fetched
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading application settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-lg transform transition-all">
        <div className="flex flex-col md:flex-row">
          {/* Left sidebar with logo and intro */}
          <div className="md:w-1/3 p-8 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-l-xl hidden md:flex md:flex-col md:justify-between">
            <div>
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm mb-8">
                <span className="text-xl font-bold text-white">{platformName.charAt(0)}</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">Welcome to {platformName}</h2>
              <p className="text-blue-100 mb-6">
                Create an account to start managing your digital advertising needs or promote your screen network.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Seamless integration</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Real-time analytics</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Secure payment processing</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-blue-100">Already have an account?</p>
              <Link
                href="/auth/signin"
                className="block mt-2 text-white font-medium bg-blue-600 bg-opacity-30 hover:bg-opacity-40 py-2 px-4 rounded-lg text-center transition-colors"
              >
                Sign in to your account
              </Link>
            </div>
          </div>

          {/* Right side with form */}
          <div className="md:w-2/3 p-6 sm:p-8">
            <div className="md:hidden flex justify-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">{platformName.charAt(0)}</span>
              </div>
            </div>

            <h2 className="text-center md:text-left text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Create your account
            </h2>

            <p className="text-center md:text-left text-sm text-gray-600 dark:text-gray-400 mb-6 md:hidden">
              Or{" "}
              <Link
                href="/auth/signin"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                sign in to your existing account
              </Link>
            </p>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md text-sm flex items-start mb-6"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`${maintenanceMode ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"} p-4 rounded-md text-sm flex items-start mb-6`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{serverError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.name ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"} placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 transition-colors sm:text-sm`}
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={errors.name ? "true" : "false"}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                  </div>
                  {touchedFields.name && errors.name && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      id="name-error"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.email ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"} placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 transition-colors sm:text-sm`}
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                  </div>
                  {touchedFields.email && errors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      id="email-error"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.password ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"} placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 transition-colors sm:text-sm pr-10`}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={errors.password ? "true" : "false"}
                      aria-describedby={errors.password ? "password-error" : undefined}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {touchedFields.password && errors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      id="password-error"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                  {formData.password && <PasswordStrengthIndicator />}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Confirm Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${errors.confirmPassword ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"} placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 transition-colors sm:text-sm pr-10`}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={errors.confirmPassword ? "true" : "false"}
                      aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <EyeIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {touchedFields.confirmPassword && errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      id="confirmPassword-error"
                    >
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  I am registering as
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <select
                    id="role"
                    name="role"
                    required
                    className={`block w-full pl-3 pr-10 py-2 text-base border ${errors.role ? "border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"} focus:outline-none focus:ring-2 transition-colors sm:text-sm rounded-md text-gray-900 dark:text-white dark:bg-gray-700 appearance-none`}
                    value={formData.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={errors.role ? "true" : "false"}
                    aria-describedby={errors.role ? "role-error" : undefined}
                  >
                    <option value="ADVERTISER">Advertiser</option>
                    <option value="PARTNER">Partner (Screen Owner)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                {touchedFields.role && errors.role && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                    id="role-error"
                  >
                    {errors.role}
                  </motion.p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={() => setAgreedToTerms(!agreedToTerms)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
                  aria-describedby="terms-description"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </label>
                <span id="terms-description" className="sr-only">
                  You must agree to the Terms of Service and Privacy Policy to create an account
                </span>
              </div>

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  type="submit"
                  disabled={isLoading || !agreedToTerms}
                  className="flex-1 flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:from-blue-700 dark:to-blue-600 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all transform active:scale-[0.98] shadow-md"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Create account"
                  )}
                </button>

                <button
                  type="button"
                  className="flex-1 flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors transform active:scale-[0.98]"
                  onClick={() => {
                    // Sign up with Google - placeholder for integration
                    console.log("Google sign-up clicked")
                  }}
                >
                  <svg
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path
                        fill="#4285F4"
                        d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                      />
                      <path
                        fill="#34A853"
                        d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                      />
                    </g>
                  </svg>
                  Continue with Google
                </button>
              </div>

              {/* Mobile view - Sign in link */}
              <div className="text-center md:hidden">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                  <Link
                    href="/auth/signin"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
