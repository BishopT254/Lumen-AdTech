import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Device, DeviceStatus } from "@/types/device"
import { getDeviceTypeIcon } from "@/lib/device-utils.tsx"

interface DeviceDetailsDialogProps {
  device: Device
  onClose: () => void
  onStatusChange: (deviceId: string, newStatus: DeviceStatus) => void
  onDelete: (deviceId: string) => void
}

export default function DeviceDetailsDialog({
  device,
  onClose,
  onStatusChange,
  onDelete
}: DeviceDetailsDialogProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Device Details</DialogTitle>
          <DialogDescription>
            View and manage device information and settings
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                {getDeviceTypeIcon(device.deviceType)}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{device.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{device.deviceIdentifier}</p>
              </div>
            </div>
            {/* Add more device details here */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 