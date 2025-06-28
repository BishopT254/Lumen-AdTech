'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertCircle,
  Check,
  Flag,
  Plus,
  Trash,
  Users,
  Percent,
  Settings,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Feature flag type definition
type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: any | null;
  percentage: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export default function FeatureFlagsPage() {
  // Session and routing
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Redirect to signin page when unauthenticated
      router.push("/auth/signin");
    },
  });
  const router = useRouter();
  
  // Component state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newFlag, setNewFlag] = useState<{
    name: string;
    description: string;
    enabled: boolean;
    percentage: number | null;
    conditions: any | null;
  }>({
    name: '',
    description: '',
    enabled: false,
    percentage: null,
    conditions: null,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Fetch feature flags on load
  useEffect(() => {
    if (status === "authenticated") {
      fetchFeatureFlags();
    }
  }, [status]);

  // Fetch all feature flags from the API
  const fetchFeatureFlags = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/feature-flags');
      
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }
      
      const data = await response.json();
      setFeatureFlags(data.flags);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      toast("Error loading feature flags", {
        description: "Could not load feature flags. Please try again.",
        style: { backgroundColor: "hsl(var(--destructive))", color: "white" }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create or update a feature flag
  const saveFeatureFlag = async () => {
    if (!newFlag.name) {
      toast("Missing required field", {
        description: "Feature flag name is required",
        style: { backgroundColor: "hsl(var(--destructive))", color: "white" }
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFlag),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save feature flag');
      }
      
      const result = await response.json();
      
      // Refresh the list
      await fetchFeatureFlags();
      
      // Reset form and close dialog
      setNewFlag({
        name: '',
        description: '',
        enabled: false,
        percentage: null,
        conditions: null,
      });
      setShowCreateDialog(false);
      
      toast("Feature flag saved", {
        description: `Feature flag "${result.featureFlag.name}" has been ${result.featureFlag.enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error saving feature flag:', error);
      toast("Error saving feature flag", {
        description: "Could not save feature flag. Please try again.",
        style: { backgroundColor: "hsl(var(--destructive))", color: "white" }
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Delete a feature flag
  const deleteFeatureFlag = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the feature flag "${name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/feature-flags?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete feature flag');
      }
      
      // Refresh the list
      await fetchFeatureFlags();
      
      toast("Feature flag deleted", {
        description: `Feature flag "${name}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting feature flag:', error);
      toast("Error deleting feature flag", {
        description: "Could not delete feature flag. Please try again.",
        style: { backgroundColor: "hsl(var(--destructive))", color: "white" }
      });
    }
  };

  // Toggle a feature flag's enabled status
  const toggleFeatureFlag = async (flag: FeatureFlag) => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: flag.name,
          enabled: !flag.enabled,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }
      
      // Refresh the list
      await fetchFeatureFlags();
      
      toast("Feature flag updated", {
        description: `Feature flag "${flag.name}" has been ${!flag.enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast("Error updating feature flag", {
        description: "Could not update feature flag. Please try again.",
        style: { backgroundColor: "hsl(var(--destructive))", color: "white" }
      });
    }
  };

  // Filter feature flags based on search and filter
  const filteredFlags = featureFlags.filter(flag => {
    const matchesSearch = searchQuery 
      ? flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesFilter = filter === 'all' 
      ? true 
      : (filter === 'enabled' ? flag.enabled : !flag.enabled);
    
    return matchesSearch && matchesFilter;
  });

  // Show loading state while authenticating
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Will redirect in the useEffect via onUnauthenticated callback
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Feature Flags
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage feature flags for gradual rollouts and A/B testing
          </p>
        </div>
        <div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Feature Flag
          </Button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant={filter === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'enabled' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter('enabled')}
          >
            Enabled
          </Button>
          <Button 
            variant={filter === 'disabled' ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter('disabled')}
          >
            Disabled
          </Button>
        </div>
        
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search feature flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Feature flags table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[120px] text-center">Rollout</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">Loading feature flags...</div>
                  </TableCell>
                </TableRow>
              ) : filteredFlags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center">
                      <Flag className="h-10 w-10 text-gray-400" />
                    </div>
                    <div className="mt-2 text-gray-500">
                      {searchQuery
                        ? "No feature flags match your search"
                        : "No feature flags found"}
                    </div>
                    <div className="mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Flag
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-medium align-middle">
                      {flag.name}
                      {flag.conditions && (
                        <Badge variant="outline" className="ml-2">
                          <Settings className="h-3 w-3 mr-1" />
                          Conditional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-middle">
                      {flag.description || <span className="text-gray-400 italic">No description</span>}
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      <div className="flex justify-center">
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => toggleFeatureFlag(flag)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center align-middle">
                      {flag.percentage !== null ? (
                        <Badge variant="secondary" className="mx-auto">
                          <Percent className="h-3 w-3 mr-1" />
                          {flag.percentage}%
                        </Badge>
                      ) : (
                        <span className="text-gray-400">100%</span>
                      )}
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setNewFlag({
                              name: flag.name,
                              description: flag.description,
                              enabled: flag.enabled,
                              percentage: flag.percentage,
                              conditions: flag.conditions,
                            });
                            setShowCreateDialog(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFeatureFlag(flag.name)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Feature Flag Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newFlag.name && featureFlags.some(f => f.name === newFlag.name)
                ? "Edit Feature Flag"
                : "Create Feature Flag"}
            </DialogTitle>
            <DialogDescription>
              {newFlag.name && featureFlags.some(f => f.name === newFlag.name)
                ? "Update an existing feature flag"
                : "Create a new feature flag for gradual rollouts"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Feature Flag Name</Label>
              <Input
                id="name"
                placeholder="e.g., new-dashboard-ui"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                disabled={newFlag.name && featureFlags.some(f => f.name === newFlag.name)}
              />
              <p className="text-xs text-gray-500">
                A unique identifier for the feature flag. Use lowercase letters, numbers, and hyphens.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this feature flag controls..."
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={newFlag.enabled}
                onCheckedChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="percentage">Percentage Rollout</Label>
                <Badge variant="outline">
                  {newFlag.percentage !== null ? `${newFlag.percentage}%` : "100%"}
                </Badge>
              </div>
              
              {newFlag.percentage !== null ? (
                <div className="pt-2">
                  <Slider
                    id="percentage"
                    min={0}
                    max={100}
                    step={5}
                    value={[newFlag.percentage]}
                    onValueChange={(value) => setNewFlag({ ...newFlag, percentage: value[0] })}
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setNewFlag({ ...newFlag, percentage: null })}
                  >
                    Reset to 100%
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFlag({ ...newFlag, percentage: 50 })}
                >
                  <Percent className="mr-2 h-4 w-4" />
                  Enable Percentage Rollout
                </Button>
              )}
              
              <p className="text-xs text-gray-500">
                Gradually roll out this feature to a percentage of users.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFlag({
                  name: '',
                  description: '',
                  enabled: false,
                  percentage: null,
                  conditions: null,
                });
                setShowCreateDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveFeatureFlag} disabled={isCreating}>
              {isCreating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {newFlag.name && featureFlags.some(f => f.name === newFlag.name) ? "Update" : "Create"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}