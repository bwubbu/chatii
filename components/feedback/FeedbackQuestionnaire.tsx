"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

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

  return (
    <Drawer open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // When drawer is closed (by dragging down or clicking outside), treat as skip
        handleSkip();
      }
    }} shouldScaleBackground={false}>
      <DrawerContent className="bg-[#171717] border-gray-700 text-white max-h-[90vh] [&>button]:hidden [&>div:first-child]:bg-gray-600">
        <DrawerHeader className="text-center pb-4 pt-2">
          <DrawerTitle className="text-white text-xl">Feedback Survey</DrawerTitle>
          <DrawerDescription className="text-gray-400">
            Help us improve by sharing your experience
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-2 text-sm">
                      {index + 1}. {question.text}
                    </h3>
                  </div>
                  
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap">Not At All</span>
                    <div className="flex space-x-2 flex-1 justify-center">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleRatingChange(question.id as keyof FeedbackResponses, rating)}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                            responses[question.id as keyof FeedbackResponses] === rating
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-gray-500 text-gray-400 hover:border-blue-400 hover:text-blue-400'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">Extremely</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-white font-medium text-sm">Details (Optional)</h3>
              <Textarea
                placeholder="What could we do to make the chatbot even more fair or polite?"
                value={responses.openEnded}
                onChange={(e) => setResponses(prev => ({ ...prev, openEnded: e.target.value }))}
                className="bg-[#23232a] border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t border-gray-700 pt-4">
          <div className="flex justify-center gap-4 w-full">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 max-w-[200px] border-gray-500 text-white hover:bg-gray-700 hover:text-white bg-[#2a2a2f]"
            >
              Skip Survey
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="flex-1 max-w-[200px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 