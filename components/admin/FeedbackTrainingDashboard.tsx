"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { format } from "date-fns";

interface TrainingMetrics {
  totalFeedback: number;
  avgScores: {
    politeness: number;
    fairness: number;
    respectfulness: number;
    trustworthiness: number;
    competence: number;
    likeability: number;
  };
  flaggedMessages: number;
  trainingJobs: TrainingJob[];
}

interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  examplesGenerated: number;
  improvementAreas: string[];
}

export default function FeedbackTrainingDashboard() {
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [personas, setPersonas] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Export filters
  const [scoreFilter, setScoreFilter] = useState<'high' | 'low' | 'custom'>('high');
  const [customMinScore, setCustomMinScore] = useState<string>('');
  const [customMaxScore, setCustomMaxScore] = useState<string>('');
  const [selectedPersona, setSelectedPersona] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    fetchTrainingMetrics();
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from("personas")
        .select("id, title")
        .order("title");
      
      if (error) {
        console.error("Error fetching personas:", error);
      } else {
        setPersonas(data || []);
      }
    } catch (error) {
      console.error("Error fetching personas:", error);
    }
  };

  const fetchTrainingMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch feedback data
      const { data: feedbackData } = await supabase
        .from("feedback_questionnaire")
        .select("*")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch flagged messages
      const { data: flaggedData } = await supabase
        .from("flagged_messages")
        .select("*")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Calculate metrics
      const avgScores = {
        politeness: feedbackData?.reduce((sum, item) => sum + (item.politeness || 0), 0) / (feedbackData?.length || 1),
        fairness: feedbackData?.reduce((sum, item) => sum + (item.fairness || 0), 0) / (feedbackData?.length || 1),
        respectfulness: feedbackData?.reduce((sum, item) => sum + (item.respectfulness || 0), 0) / (feedbackData?.length || 1),
        trustworthiness: feedbackData?.reduce((sum, item) => sum + (item.trustworthiness || 0), 0) / (feedbackData?.length || 1),
        competence: feedbackData?.reduce((sum, item) => sum + (item.competence || 0), 0) / (feedbackData?.length || 1),
        likeability: feedbackData?.reduce((sum, item) => sum + (item.likeability || 0), 0) / (feedbackData?.length || 1),
      };

      // Mock training jobs for demonstration
      const mockTrainingJobs: TrainingJob[] = [
        {
          id: '1',
          status: 'completed',
          createdAt: '2024-01-15T02:00:00Z',
          completedAt: '2024-01-15T02:45:00Z',
          examplesGenerated: 24,
          improvementAreas: ['politeness', 'trustworthiness']
        },
        {
          id: '2',
          status: 'running',
          createdAt: '2024-01-22T02:00:00Z',
          examplesGenerated: 18,
          improvementAreas: ['fairness']
        }
      ];

      setMetrics({
        totalFeedback: feedbackData?.length || 0,
        avgScores,
        flaggedMessages: flaggedData?.length || 0,
        trainingJobs: mockTrainingJobs
      });
    } catch (error) {
      console.error("Error fetching training metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualTraining = async () => {
    // This would trigger a manual training job
    console.log("Triggering manual training...");
    // Add actual implementation here
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Determine score range based on filter
      if (scoreFilter === 'high') {
        params.append('minScore', '4.0');
      } else if (scoreFilter === 'low') {
        params.append('maxScore', '2.5');
      } else if (scoreFilter === 'custom') {
        if (customMinScore) {
          params.append('minScore', customMinScore);
        }
        if (customMaxScore) {
          params.append('maxScore', customMaxScore);
        }
      }

      // Add date range
      if (startDate) {
        params.append('startDate', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }

      // Add persona filter
      if (selectedPersona && selectedPersona !== 'all') {
        params.append('personaId', selectedPersona);
      }

      // Call export API (cookies will be sent automatically)
      const response = await fetch(`/api/export-feedback?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_training_data_${new Date().toISOString().split('T')[0]}.jsonl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (error: any) {
      console.error("Export error:", error);
      setExportError(error.message || "Failed to export data");
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-400";
    if (score >= 3.5) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreTrend = (score: number) => {
    if (score >= 4) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (score >= 3.5) return <Clock className="w-4 h-4 text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Feedback Training Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={triggerManualTraining} className="bg-blue-600 hover:bg-blue-700">
            Trigger Manual Training
          </Button>
        </div>
      </div>

      {/* Export Section */}
      <Card className="bg-[#1a1a1f] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Export Training Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Filter */}
          <div className="space-y-2">
            <Label className="text-gray-300">Score Range</Label>
            <Select value={scoreFilter} onValueChange={(value: 'high' | 'low' | 'custom') => setScoreFilter(value)}>
              <SelectTrigger className="bg-[#23232a] border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Quality (≥ 4.0)</SelectItem>
                <SelectItem value="low">Low Quality (< 2.5)</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {scoreFilter === 'custom' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">Min Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={customMinScore}
                    onChange={(e) => setCustomMinScore(e.target.value)}
                    className="bg-[#23232a] border-gray-600 text-white"
                    placeholder="0.0"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">Max Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={customMaxScore}
                    onChange={(e) => setCustomMaxScore(e.target.value)}
                    className="bg-[#23232a] border-gray-600 text-white"
                    placeholder="5.0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-gray-300">Date Range</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#23232a] border-gray-600 text-white justify-start text-left font-normal"
                  >
                    {startDate ? format(startDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1a1a1f] border-gray-700">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="bg-[#1a1a1f]"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#23232a] border-gray-600 text-white justify-start text-left font-normal"
                  >
                    {endDate ? format(endDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1a1a1f] border-gray-700">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="bg-[#1a1a1f]"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Persona Filter */}
          <div className="space-y-2">
            <Label className="text-gray-300">Persona (Optional)</Label>
            <Select value={selectedPersona} onValueChange={setSelectedPersona}>
              <SelectTrigger className="bg-[#23232a] border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Personas</SelectItem>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    {persona.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Button and Status */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Training Data
                </>
              )}
            </Button>
            {exportSuccess && (
              <span className="text-green-400 text-sm">Export successful! File downloaded.</span>
            )}
            {exportError && (
              <span className="text-red-400 text-sm">{exportError}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="training">Training Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Feedback</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics?.totalFeedback || 0}</div>
                <p className="text-xs text-gray-400">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Flagged Messages</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics?.flaggedMessages || 0}</div>
                <p className="text-xs text-gray-400">Requiring attention</p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Training Jobs</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics?.trainingJobs.length || 0}</div>
                <p className="text-xs text-gray-400">This month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-[#1a1a1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics && Object.entries(metrics.avgScores).map(([metric, score]) => (
                <div key={metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 capitalize">{metric}</span>
                      {getScoreTrend(score)}
                    </div>
                    <span className={`font-semibold ${getScoreColor(score)}`}>
                      {score.toFixed(1)}/5.0
                    </span>
                  </div>
                  <Progress 
                    value={(score / 5) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card className="bg-[#1a1a1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Training Jobs History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Started</TableHead>
                    <TableHead className="text-gray-400">Examples</TableHead>
                    <TableHead className="text-gray-400">Focus Areas</TableHead>
                    <TableHead className="text-gray-400">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.trainingJobs.map((job) => (
                    <TableRow key={job.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'running' ? 'secondary' :
                          job.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {job.examplesGenerated}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {job.improvementAreas.map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {job.completedAt ? 
                          `${Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / (1000 * 60))}m` :
                          job.status === 'running' ? 'Running...' : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 