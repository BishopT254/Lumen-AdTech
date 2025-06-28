'use client';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, BarChart, LineChart, Badge 
} from '@/components/ui';
import { Leaf, Zap, Co2, Trees } from 'lucide-react';

export default function SustainabilityPage() {
  const { data: session } = useSession();
  
  const { data: sustainabilityData } = useQuery({
    queryKey: ['sustainability'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sustainability');
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sustainability Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Carbon Saved</CardTitle>
            <Trees className="h-6 w-6 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {sustainabilityData?.carbonSaved} kg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Energy Saved</CardTitle>
            <Zap className="h-6 w-6 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {sustainabilityData?.energySaved} kWh
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Energy Efficiency</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <BarChart
            data={sustainabilityData?.deviceEfficiency}
            xAxis="deviceType"
            yAxis="efficiency"
            theme="green"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carbon Footprint Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <LineChart
            data={sustainabilityData?.footprintTrend}
            xAxis="month"
            yAxis="carbon"
            strokeColor="#10b981"
          />
        </CardContent>
      </Card>
    </div>
  );
}