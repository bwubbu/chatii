"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responses: FeedbackResponses) => void;
  onSkip: () => void;
}

interface FeedbackResponses {
  politeness: number | null;
  fairness: number | null;
  respectfulness: number | null;
  trustworthiness: number | null;
  competence: number | null;
  likeability: number | null;
  openEnded: string;
}

const questions = [
  {
    id: "politeness",
    text: "How friendly and polite was the chatbot?",
    statement: "The chatbot communicated in a polite manner."
  },
  {
    id: "fairness", 
    text: "How friendly and fair did the chatbot seem?",
    statement: "The chatbot treated me fairly and without bias."
  },
  {
    id: "respectfulness",
    text: "How respectful was the chatbot's language?",
    statement: "I felt that the chatbot treated me with respect."
  },
  {
    id: "trustworthiness",
    text: "How unbiased did the chatbot's responses seem?",
    statement: "I found the chatbot trustworthy."
  },
  {
    id: "competence",
    text: "How clear and understandable were the chatbot's messages?",
    statement: "The chatbot responded competently to my questions."
  },
  {
    id: "likeability",
    text: "How consistent was the chatbot in staying polite and fair throughout your interaction?",
    statement: "I enjoyed interacting with the chatbot."
  }
];

export default function FeedbackQuestionnaire({ isOpen, onClose, onSubmit, onSkip }: FeedbackQuestionnaireProps) {
  const [responses, setResponses] = useState<FeedbackResponses>({
    politeness: null,
    fairness: null,
    respectfulness: null,
    trustworthiness: null,
    competence: null,
    likeability: null,
    openEnded: ""
  });

  const handleRatingChange = (questionId: keyof FeedbackResponses, rating: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };

  const handleSubmit = () => {
    console.log('Submitting feedback:', responses);
    onSubmit(responses);
    onClose(); // Close the survey after submission
  };

  const handleSkip = () => {
    console.log('Skipping feedback survey');
    onSkip();
    onClose(); // Close the survey after skipping
  };

  const isComplete = Object.entries(responses)
    .filter(([key]) => key !== 'openEnded')
    .every(([, value]) => value !== null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#171717] border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-xl">Feedback Survey</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-4">
                <div>
                  <h3 className="text-white font-medium mb-2">
                    {index + 1}. {question.text}
                  </h3>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Not At All</span>
                  <div className="flex space-x-4">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleRatingChange(question.id as keyof FeedbackResponses, rating)}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                          responses[question.id as keyof FeedbackResponses] === rating
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-400 text-gray-400 hover:border-blue-400 hover:text-blue-400'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">Extremely</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-medium">Details (Optional)</h3>
            <Textarea
              placeholder="What could we do to make the chatbot even more fair or polite?"
              value={responses.openEnded}
              onChange={(e) => setResponses(prev => ({ ...prev, openEnded: e.target.value }))}
              className="bg-[#23232a] border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
            />
          </div>

          <div className="flex justify-center space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="px-8 py-2 border-gray-500 text-black hover:bg-gray-700 hover:text-white"
            >
              Skip Survey
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 