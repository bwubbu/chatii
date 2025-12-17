"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Users, TrendingUp, AlertTriangle, CheckCircle, Eye } from "lucide-react"

export default function BiasDetectionInfo() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="bg-[#1a1a1f] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Understanding Bias Detection & Fairness Metrics
          </CardTitle>
          <CardDescription className="text-gray-400">
            How our AI fairness monitoring system works behind the scenes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Bias Detection Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Bias Detection (98.2%)</h3>
              <Badge variant="outline" className="text-blue-400 border-blue-400">Automated Analysis</Badge>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg space-y-3">
              <p className="text-gray-200">
                Our bias detection system uses multiple techniques to identify potentially unfair or discriminatory responses:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-cyan-400 font-medium">🔍 Text Pattern Analysis</h4>
                  <p className="text-gray-300 text-sm">
                    Scans AI responses for language patterns that might indicate bias, such as gender assumptions, 
                    role stereotypes, or culturally insensitive terms.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-cyan-400 font-medium">📊 Sentiment Consistency</h4>
                  <p className="text-gray-300 text-sm">
                    Compares response tone and helpfulness across different user demographics to ensure 
                    consistent quality regardless of user background.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-cyan-400 font-medium">🚨 Keyword Detection</h4>
                  <p className="text-gray-300 text-sm">
                    Uses machine learning to identify potentially problematic language or assumptions 
                    about users based on their demographic information.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-cyan-400 font-medium">⚖️ Comparative Analysis</h4>
                  <p className="text-gray-300 text-sm">
                    Compares response quality, length, and helpfulness across demographic groups to 
                    identify systematic differences in treatment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Demographic Fairness Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Demographic Fairness Metrics</h3>
              <Badge variant="outline" className="text-green-400 border-green-400">Real-time Calculation</Badge>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg space-y-4">
              <p className="text-gray-200">
                These metrics analyze whether the AI provides equitable service across different user groups:
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h4 className="text-green-400 font-medium">👥 Gender Equality (94%)</h4>
                  <p className="text-gray-300 text-sm mt-1">
                    Compares average satisfaction scores between male, female, and non-binary users. 
                    Score = 1 - (standard deviation of satisfaction across gender groups).
                  </p>
                  <code className="text-xs text-cyan-300 bg-gray-900 px-2 py-1 rounded mt-2 inline-block">
                    Fairness = 1 - std_dev(satisfaction_by_gender) / max_possible_std_dev
                  </code>
                </div>
                
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h4 className="text-yellow-400 font-medium">🎂 Age Group Fairness (91%)</h4>
                  <p className="text-gray-300 text-sm mt-1">
                    Ensures similar response quality across age groups (18-24, 25-34, 35-44, 45-54, 55+). 
                    Lower scores indicate age-based disparities in service quality.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-400 pl-4">
                  <h4 className="text-purple-400 font-medium">💼 Role-based Equality (96%)</h4>
                  <p className="text-gray-300 text-sm mt-1">
                    Monitors whether professional roles (student, teacher, engineer, etc.) affect the 
                    quality or tone of AI responses. High scores indicate equitable treatment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">How Calculations Work</h3>
              <Badge variant="outline" className="text-orange-400 border-orange-400">Technical Details</Badge>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-200 font-medium">Real-time Processing</p>
                    <p className="text-gray-400 text-sm">
                      Every user interaction is analyzed within seconds of completion, feeding into live fairness metrics.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-200 font-medium">Statistical Significance</p>
                    <p className="text-gray-400 text-sm">
                      Metrics are only displayed when there's sufficient data (minimum 30 responses per demographic group).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-200 font-medium">Continuous Learning</p>
                    <p className="text-gray-400 text-sm">
                      Detection algorithms improve over time using feedback from flagged content and human reviews.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert System */}
          <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h4 className="text-red-400 font-medium">Automated Alerts</h4>
            </div>
            <p className="text-gray-300 text-sm">
              When fairness scores drop below 85% or bias detection confidence exceeds 95%, 
              automatic alerts are sent to administrators for immediate review and potential model retraining.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 