"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { User, Settings, Menu, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePublicSettings } from "@/hooks/usePublicSettings"

type NavItem = {
  label: string
  href: string
  authRequired?: boolean
  roles?: string[]
}

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // Get platform name from settings or use default
  const platformName = useMemo(() => {
    return generalSettings?.platformName || generalSettings?.platform_name || "Lumen"
  }, [generalSettings])

  // Check if we're on an admin page to adjust positioning
  const isAdminPage = pathname?.startsWith("/admin")

  // Memoize main navigation items to prevent recalculation on re-renders
  const mainNavItems = useMemo<NavItem[]>(
    () => [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    []
  )

  // Memoize dashboard link based on role
  const dashboard = useMemo(() => {
    if (!session?.user?.role) return null

    switch (session.user.role) {
      case "ADVERTISER":
        return { label: "Dashboard", href: "/advertiser" }
      case "PARTNER":
        return { label: "Dashboard", href: "/partner" }
      case "ADMIN":
        return { label: "Admin", href: "/admin" }
      default:
        return null
    }
  }, [session?.user?.role])

  // Handle scroll events with improved throttling for sticky header effects
  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeScrolled = window.scrollY > 10
          if (shouldBeScrolled !== scrolled) {
            setScrolled(shouldBeScrolled)
          }
          ticking = false
        })
        ticking = true
      }
    }

    // Use passive event listener for better performance
    window.addEventListener("scroll", handleScroll, { passive: true })

    // Initial check in case page is loaded scrolled down
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [scrolled])

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Memoize sign out handler
  const handleSignOut = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    await signOut({ callbackUrl: "/" })
  }, [])

  // Memoize close menu handler
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  // Function to render navigation items - optimized with memoization
  const navItems = useMemo(() => {
    const createNavItem = (item: NavItem, mobile = false) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          mobile
            ? "block rounded-md px-3 py-2 text-base font-medium transition-colors"
            : "px-3 py-2 text-sm font-medium transition-colors relative group",
          pathname === item.href
            ? mobile
              ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              : "text-gray-900 dark:text-white"
            : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
        )}
        onClick={mobile ? closeMenu : undefined}
        aria-current={pathname === item.href ? "page" : undefined}
      >
        {item.label}
        {!mobile && (
          <span
            className={cn(
              "absolute bottom-0 left-0 w-full h-0.5 transform scale-x-0 transition-transform duration-300 bg-blue-600 group-hover:scale-x-100",
              pathname === item.href && "scale-x-100",
            )}
            aria-hidden="true"
          ></span>
        )}
      </Link>
    )

    return {
      desktop: mainNavItems.map(item => createNavItem(item)),
      mobile: mainNavItems.map(item => createNavItem(item, true))
    }
  }, [mainNavItems, pathname, closeMenu])

  // Memoize auth UI components
  const authUI = useMemo(() => {
    if (status === "loading") {
      return (
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 dark:border-gray-300 border-t-transparent"
          aria-label="Loading authentication status"
        ></div>
      )
    }

    if (!session) {
      return (
        <div className="flex items-center">
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="ml-4 rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Register
          </Link>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        {dashboard && (
          <Link
            href={dashboard.href}
            className={cn(
              "hidden md:flex px-4 py-2 text-sm font-medium transition-colors relative group",
              pathname?.startsWith(dashboard.href)
                ? "text-gray-900 dark:text-white"
                : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            {dashboard.label}
            <span
              className={cn(
                "absolute bottom-0 left-0 w-full h-0.5 transform scale-x-0 transition-transform duration-300 bg-blue-600 group-hover:scale-x-100",
                pathname?.startsWith(dashboard.href) && "scale-x-100",
              )}
              aria-hidden="true"
            ></span>
          </Link>
        )}

        <Link
          href="/profile"
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Profile"
        >
          <User className="h-5 w-5" />
        </Link>

        <button
          onClick={handleSignOut}
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    )
  }, [session, status, dashboard, pathname, handleSignOut])

  // Memoize mobile auth links
  const mobileAuthLinks = useMemo(() => {
    if (!session) {
      return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <Link
            href="/auth/signin"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={closeMenu}
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={closeMenu}
          >
            Register
          </Link>
        </div>
      )
    }

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <Link
          href="/profile"
          className="flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={closeMenu}
        >
          <User className="h-5 w-5 mr-2" />
          Profile
        </Link>
        <Link
          href="/account-settings"
          className="flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={closeMenu}
        >
          <Settings className="h-5 w-5 mr-2" />
          Settings
        </Link>
        <button
          onClick={(e) => {
            closeMenu()
            handleSignOut(e)
          }}
          className="flex w-full items-center rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </button>
      </div>
    )
  }, [session, closeMenu, handleSignOut])

  // Memoize the mobile dashboard link
  const mobileDashboardLink = useMemo(() => {
    if (!dashboard) return null
    
    return (
      <Link
        href={dashboard.href}
        className={cn(
          "block rounded-md px-3 py-2 text-base font-medium transition-colors",
          pathname?.startsWith(dashboard.href)
            ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
        )}
        onClick={closeMenu}
      >
        {dashboard.label}
      </Link>
    )
  }, [dashboard, pathname, closeMenu])

  return (
    <header
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 rounded-full w-auto max-w-[95%] md:max-w-[90%]",
        scrolled ? "bg-white dark:bg-gray-800 shadow-lg" : "bg-white dark:bg-gray-800",
      )}
      aria-label="Main navigation"
      role="banner"
    >
      <div className="px-6 py-3 mx-auto">
        <div className="flex h-16 items-center">
          {/* Logo Section */}
          <div className="flex-shrink-0 pr-4">
            <Link href="/" className="flex items-center space-x-2" aria-label={`${platformName} home`}>
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-full bg-blue-600 opacity-70 blur-sm"></div>
                <div className="relative h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{platformName.charAt(0)}</span>
                </div>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white transition-all">{platformName}</span>
            </Link>
          </div>

          {/* Vertical Separator */}
          <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex md:items-center md:justify-center flex-1" aria-label="Main navigation">
            <div className="flex items-center space-x-1">{navItems.desktop}</div>
          </nav>

          {/* Vertical Separator */}
          <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center ml-auto">{authUI}</div>

          {/* Mobile menu button */}
          <div className="md:hidden ml-auto">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={cn(
            "md:hidden transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 rounded-b-2xl shadow-lg absolute left-0 right-0 mt-2",
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none",
          )}
          id="mobile-menu"
          aria-hidden={!isMenuOpen}
        >
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navItems.mobile}
            {mobileDashboardLink}
            {mobileAuthLinks}
          </div>
        </div>
      </div>
    </header>
  )
}