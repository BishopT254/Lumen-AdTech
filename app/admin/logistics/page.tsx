'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Truck, MapPin, Navigation, PackageCheck, RefreshCw, Filter, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { 
  Table,
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

const LogisticsMap = dynamic(() => import('@/components/ui/logistics-map'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full animate-pulse bg-muted" />
});

export default function LogisticsPage() {
  const { data: session } = useSession();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    route: 'active'
  });

  const { data: devices } = useQuery({
    queryKey: ['logistics', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logistics?${new URLSearchParams(filters)}`);
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Fleet Logistics Management</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Routes
          </Button>
          <Button asChild>
            <Link href="/admin/logistics/new">
              <Truck className="mr-2 h-4 w-4" />
              Add Vehicle
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">
            <MapPin className="mr-2 h-4 w-4" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="list">
            <PackageCheck className="mr-2 h-4 w-4" />
            Device List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card className="overflow-hidden">
            <div className="h-[600px] w-full">
              <LogisticsMap devices={devices} onSelect={setSelectedDevice} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={filters.status}
                  onValueChange={v => setFilters(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    Status
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.type}
                  onValueChange={v => setFilters(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <Truck className="mr-2 h-4 w-4" />
                    Device Type
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ANDROID_TV">Android TV</SelectItem>
                    <SelectItem value="VEHICLE_MOUNTED">Vehicle Mounted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Search devices..."
                className="max-w-[300px]"
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices?.map(device => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.location?.address}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Navigation className="mr-2 h-4 w-4" />
                        {device.routeDetails?.routeName || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={device.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(device.lastActive).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedDevice(device)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/logistics/${device.id}/edit`}>
                              Edit Device
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <DeviceDetailDialog 
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />
    </div>
  );
}

function DeviceDetailDialog({ device, onClose }) {
  return (
    <Dialog open={!!device} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {/* Detailed device view implementation */}
      </DialogContent>
    </Dialog>
  );
}