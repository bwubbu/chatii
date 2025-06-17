"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DemographicsData {
  age: number;
  gender: string;
  role: string;
  persona_title: string;
  created_at: string;
}

interface AnalyticsStats {
  totalUsers: number;
  averageAge: number;
  genderDistribution: { [key: string]: number };
  topRoles: { [key: string]: number };
  personaUsage: { [key: string]: number };
}

export default function DemographicsAnalytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data, error } = await supabase
      .from("demographics")
      .select(`
        age,
        gender,
        role,
        created_at,
        personas (
          title
        )
      `);

    if (error) {
      console.error("Error fetching demographics analytics:", error);
      setLoading(false);
      return;
    }

    // Process the data
    const demographicsData = data as any[];
    const totalUsers = demographicsData.length;
    
    // Calculate average age
    const ages = demographicsData.filter(d => d.age).map(d => d.age);
    const averageAge = ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;
    
    // Gender distribution
    const genderDistribution = demographicsData.reduce((acc, d) => {
      const gender = d.gender || 'unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
    
    // Top roles
    const topRoles = demographicsData.reduce((acc, d) => {
      const role = d.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    
    // Persona usage
    const personaUsage = demographicsData.reduce((acc, d) => {
      const persona = d.personas?.title || 'unknown';
      acc[persona] = (acc[persona] || 0) + 1;
      return acc;
    }, {});

    setStats({
      totalUsers,
      averageAge,
      genderDistribution,
      topRoles,
      personaUsage
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="text-white">Loading analytics...</div>;
  }

  if (!stats) {
    return <div className="text-white">No data available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Users */}
      <Card className="bg-[#20232a] border-[#23272f]">
        <CardHeader>
          <CardTitle className="text-white">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-400">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      {/* Average Age */}
      <Card className="bg-[#20232a] border-[#23272f]">
        <CardHeader>
          <CardTitle className="text-white">Average Age</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-400">{stats.averageAge}</div>
        </CardContent>
      </Card>

      {/* Gender Distribution */}
      <Card className="bg-[#20232a] border-[#23272f]">
        <CardHeader>
          <CardTitle className="text-white">Gender Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.genderDistribution).map(([gender, count]) => (
              <div key={gender} className="flex justify-between">
                <span className="text-gray-300 capitalize">{gender}</span>
                <span className="text-white font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Roles */}
      <Card className="bg-[#20232a] border-[#23272f]">
        <CardHeader>
          <CardTitle className="text-white">Top Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.topRoles)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([role, count]) => (
                <div key={role} className="flex justify-between">
                  <span className="text-gray-300 capitalize">{role}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Persona Usage */}
      <Card className="bg-[#20232a] border-[#23272f] md:col-span-2">
        <CardHeader>
          <CardTitle className="text-white">Persona Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.personaUsage)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .map(([persona, count]) => (
                <div key={persona} className="flex justify-between">
                  <span className="text-gray-300">{persona}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 