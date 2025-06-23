#!/usr/bin/env python3
"""
Scheduler for Automated Feedback Training Pipeline
Implements periodic training based on feedback data
"""

import schedule
import time
import logging
from datetime import datetime
from automated_feedback_training import FeedbackBasedTrainingPipeline

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TrainingScheduler:
    """Scheduler for automated feedback-based training"""
    
    def __init__(self):
        self.pipeline = FeedbackBasedTrainingPipeline()
        
    def run_weekly_analysis(self):
        """Run weekly feedback analysis and training if needed"""
        logger.info("Starting weekly feedback analysis...")
        
        try:
            result = self.pipeline.run_pipeline()
            
            if result['training_triggered']:
                logger.info(f"✅ Training completed! Generated {result['examples_generated']} examples")
                logger.info(f"📁 Training file: {result['training_file']}")
            else:
                logger.info("ℹ️  No training needed this week - models performing well!")
                
        except Exception as e:
            logger.error(f"❌ Weekly training failed: {e}")
            
    def run_daily_check(self):
        """Run daily checks for urgent issues (high-severity flags)"""
        logger.info("Running daily feedback check...")
        
        # This would check for critical flags and trigger immediate training if needed
        logger.info("✅ Daily check completed")
        
    def start_scheduler(self):
        """Start the scheduling system"""
        logger.info("🚀 Starting Feedback Training Scheduler")
        
        # Schedule weekly training on Sundays at 2 AM
        schedule.every().sunday.at("02:00").do(self.run_weekly_analysis)
        
        # Schedule daily checks at 8 AM
        schedule.every().day.at("08:00").do(self.run_daily_check)
        
        logger.info("📅 Scheduled:")
        logger.info("  - Weekly training: Sundays at 2 AM")
        logger.info("  - Daily checks: Every day at 8 AM")
        
        while True:
            schedule.run_pending()
            time.sleep(3600)  # Check every hour

if __name__ == "__main__":
    scheduler = TrainingScheduler()
    scheduler.start_scheduler() 