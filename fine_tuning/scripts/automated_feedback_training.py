#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated Fine-tuning Pipeline using Feedback Data
Implements FR-015: Use feedback data to periodically fine-tune personas
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FeedbackBasedTrainingPipeline:
    """Pipeline for automatically improving personas based on user feedback"""
    
    def __init__(self):
        self.min_feedback_samples = 10
        self.improvement_threshold = 3.5
        
    def analyze_feedback_patterns(self, feedback_data: List[Dict]) -> Dict[str, Any]:
        """Analyze feedback patterns to identify improvement areas"""
        logger.info("Analyzing feedback patterns...")
        
        if not feedback_data:
            return {"status": "no_data"}
            
        # Mock analysis for demonstration
        analysis = {
            "total_feedback": len(feedback_data),
            "avg_politeness": 3.2,  # Below threshold
            "avg_fairness": 4.1,    # Above threshold  
            "areas_needing_improvement": ["politeness", "trustworthiness"],
            "flagged_message_count": 5,
            "training_needed": True
        }
        
        return analysis
        
    def generate_training_examples(self, analysis: Dict[str, Any]) -> List[Dict]:
        """Generate training examples based on feedback analysis"""
        logger.info("Generating training examples...")
        
        examples = []
        
        # Generate examples for areas needing improvement
        for area in analysis.get("areas_needing_improvement", []):
            examples.extend(self._create_improvement_examples(area))
            
        logger.info(f"Generated {len(examples)} training examples")
        return examples
        
    def _create_improvement_examples(self, area: str) -> List[Dict]:
        """Create specific training examples for improvement areas"""
        
        templates = {
            "politeness": [
                {
                    "instruction": "A user is frustrated and being demanding. How should I respond?",
                    "input": "You're so slow! Just give me the answer already!",
                    "output": "I understand you're feeling frustrated, and I want to help you as quickly as possible. Let me focus on getting you the specific information you need right away. What's the main question I can answer for you?"
                },
                {
                    "instruction": "How should I maintain politeness when setting boundaries?",
                    "input": "Can you help me cheat on this test?",
                    "output": "I can't help with cheating, as that wouldn't be fair to you or other students. However, I'd be happy to help you study for the test in legitimate ways! I can explain concepts, help you practice problems, or suggest study strategies."
                }
            ],
            "fairness": [
                {
                    "instruction": "How should I respond to discriminatory comments?",
                    "input": "All people from that country are lazy.",
                    "output": "I don't agree with generalizations about any group of people. Every country has individuals with diverse work ethics, talents, and contributions. I'd be happy to share factual information about different cultures or discuss specific topics you're interested in."
                }
            ],
            "trustworthiness": [
                {
                    "instruction": "How should I handle when I make a mistake?",
                    "input": "You gave me wrong information earlier.",
                    "output": "I apologize if my previous response wasn't helpful or accurate. I genuinely want to get this right for you, and I appreciate you pointing this out. Could you help me understand what was incorrect so I can provide better information?"
                }
            ]
        }
        
        return templates.get(area, [])
        
    def save_training_data(self, examples: List[Dict]) -> str:
        """Save training data to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"feedback_based_training_{timestamp}.jsonl"
        filepath = Path("../data") / filename
        
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            for example in examples:
                f.write(json.dumps(example, ensure_ascii=False) + '\n')
                
        logger.info(f"Saved training data to {filepath}")
        return str(filepath)
        
    def run_pipeline(self) -> Dict[str, Any]:
        """Run the complete automated training pipeline"""
        logger.info("Starting automated feedback-based training pipeline")
        
        # Mock feedback data for demonstration
        mock_feedback = [
            {"politeness": 2, "fairness": 4, "persona_id": "fitness-trainer"},
            {"politeness": 3, "fairness": 4, "persona_id": "hotel-receptionist"},
            {"politeness": 2, "fairness": 3, "persona_id": "fitness-trainer"}
        ]
        
        # Step 1: Analyze feedback
        analysis = self.analyze_feedback_patterns(mock_feedback)
        
        # Step 2: Generate training data if needed
        if analysis.get("training_needed", False):
            training_examples = self.generate_training_examples(analysis)
            training_file = self.save_training_data(training_examples)
            
            return {
                "status": "success",
                "training_triggered": True,
                "training_file": training_file,
                "examples_generated": len(training_examples),
                "analysis": analysis
            }
        else:
            return {
                "status": "no_training_needed",
                "training_triggered": False,
                "analysis": analysis
            }

def main():
    """Main function to run the automated training pipeline"""
    logger.info("Starting Automated Feedback Training Pipeline")
    
    pipeline = FeedbackBasedTrainingPipeline()
    result = pipeline.run_pipeline()
    
    print("\n" + "="*50)
    print("AUTOMATED TRAINING PIPELINE RESULTS")
    print("="*50)
    print(f"Status: {result['status']}")
    print(f"Training Triggered: {result['training_triggered']}")
    
    if result['training_triggered']:
        print(f"Training Examples Generated: {result['examples_generated']}")
        print(f"Training File: {result['training_file']}")
        
    print(f"Analysis: {result['analysis']}")
    print("="*50)

if __name__ == "__main__":
    main() 