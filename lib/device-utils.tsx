import React from 'react';
import { 
  Tv, 
  Monitor, 
  Smartphone, 
  Car, 
  Store, 
  Bus, 
  Train, 
  Subway, 
  HelpCircle 
} from "lucide-react";

// Define the types here since we can't import them
export type DeviceType = "ANDROID_TV" | "DIGITAL_SIGNAGE" | "INTERACTIVE_KIOSK" | "VEHICLE_MOUNTED" | "RETAIL_DISPLAY" | "BUS" | "TRAM" | "TRAIN" | "METRO" | "OTHER";
export type DeviceStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "MAINTENANCE";
export type HealthStatus = "UNKNOWN" | "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE";

export function getDeviceTypeIcon(type: DeviceType) {
  switch (type) {
    case "ANDROID_TV":
      return <Tv className="h-6 w-6" />;
    case "DIGITAL_SIGNAGE":
      return <Monitor className="h-6 w-6" />;
    case "INTERACTIVE_KIOSK":
      return <Smartphone className="h-6 w-6" />;
    case "VEHICLE_MOUNTED":
      return <Car className="h-6 w-6" />;
    case "RETAIL_DISPLAY":
      return <Store className="h-6 w-6" />;
    case "BUS":
      return <Bus className="h-6 w-6" />;
    case "TRAM":
      return <Train className="h-6 w-6" />;
    case "TRAIN":
      return <Train className="h-6 w-6" />;
    case "METRO":
      return <Subway className="h-6 w-6" />;
    default:
      return <HelpCircle className="h-6 w-6" />;
  }
}

export function getStatusBadgeColor(status: DeviceStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "INACTIVE":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    case "MAINTENANCE":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "SUSPENDED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "PENDING":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
}

export function getHealthStatusBadgeColor(status: HealthStatus) {
  switch (status) {
    case "HEALTHY":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "WARNING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "CRITICAL":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "OFFLINE":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    case "UNKNOWN":
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
} 