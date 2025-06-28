'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Eye, PieChart, Crosshair, Magnet, LineChart, Filter, Download } from 'lucide-react';

interface AudienceStats {
  totalAudience: number;
  averageEngagement: number;
  averageDwellTime: number;
  uniqueViewers: number;
  demographics: {
    ageGroups: { [key: string]: number };
    genderDistribution: { [key: string]: number };
    locations: { [key: string]: number };
  };
  behavior: {
    peakHours: { hour: number; count: number }[];
    commonInteractions: { type: string; count: number }[];
    emotionDistribution: { emotion: string; percentage: number }[];
  };
  trends: {
    daily: { date: string; viewers: number }[];
    weekly: { week: string; viewers: number }[];
  };
}

interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, any>;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function AudiencePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('demographics');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const { data: audienceData, isLoading: isLoadingAudience } = useQuery<AudienceStats>({
    queryKey: ['audience', selectedTimeframe, selectedLocation],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audience/stats?timeframe=${selectedTimeframe}&location=${selectedLocation}`);
      if (!res.ok) throw new Error('Failed to fetch audience data');
      return res.json();
    }
  });

  const { data: segments, isLoading: isLoadingSegments } = useQuery<AudienceSegment[]>({
    queryKey: ['audience-segments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audience/segments');
      if (!res.ok) throw new Error('Failed to fetch segments');
      return res.json();
    }
  });

  if (isLoadingAudience || isLoadingSegments) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audience Intelligence</h1>
          <p className="text-muted-foreground">
            Analyze and understand your audience behavior and demographics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Magnet className="mr-2 h-4 w-4" />
            Create Segment
          </Button>
          <Button asChild>
            <Link href="/admin/audience/analysis/new">
              <Crosshair className="mr-2 h-4 w-4" />
              New Analysis
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audience</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audienceData?.totalAudience?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Unique viewers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audienceData?.averageEngagement?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">Interaction rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Dwell Time</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audienceData?.averageDwellTime?.toFixed(1) || '0'}s
            </div>
            <p className="text-xs text-muted-foreground">Per view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Viewers</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audienceData?.uniqueViewers?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 my-4">
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="nairobi">Nairobi</SelectItem>
            <SelectItem value="mombasa">Mombasa</SelectItem>
            <SelectItem value="kisumu">Kisumu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="demographics">
            <PieChart className="mr-2 h-4 w-4" />
            Demographics
          </TabsTrigger>
          <TabsTrigger value="behavior">
            <Eye className="mr-2 h-4 w-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Users className="mr-2 h-4 w-4" />
            Segments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demographics">
          <Card>
            <CardHeader>
              <CardTitle>Demographic Analysis</CardTitle>
              <CardDescription>Audience breakdown by demographics</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Demographics content will be implemented here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle>Behavior Analysis</CardTitle>
              <CardDescription>Audience interaction patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Behavior analysis content will be implemented here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
      <Card>
        <CardHeader>
              <CardTitle>Audience Segments</CardTitle>
              <CardDescription>Manage and analyze audience segments</CardDescription>
        </CardHeader>
        <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments?.map((segment) => (
                      <TableRow key={segment.id}>
                        <TableCell>
                          <div className="font-medium">{segment.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {segment.description}
                          </div>
                        </TableCell>
                        <TableCell>{segment.size.toLocaleString()}</TableCell>
                        <TableCell>{new Date(segment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(segment.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}