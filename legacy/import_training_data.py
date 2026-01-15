#!/usr/bin/env python3
"""
Import training data from exported JSONL files back into Supabase database.

This script reads exported training data (in embedding or finetuning format)
and uploads it to the database, creating conversations, messages, and feedback records.

Usage:
    python import_training_data.py <jsonl_file> [--skip-existing] [--user-id <uuid>]

Environment Variables Required:
    NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY: Service role key (bypasses RLS)
"""

import json
import logging
import os
import re
import sys
import argparse
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py is not installed. Install it with: pip install supabase")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_embedding_format(content: str) -> List[Tuple[str, str]]:
    """
    Parse embedding format: "User: ...\nAssistant: ...\nUser: ...\nAssistant: ..."
    Returns list of (sender, content) tuples.
    """
    messages = []
    lines = content.split('\n')
    current_sender = None
    current_content = []
    
    for line in lines:
        if line.startswith('User: '):
            # Save previous message if exists
            if current_sender and current_content:
                messages.append((current_sender, '\n'.join(current_content)))
            # Start new user message
            current_sender = 'user'
            current_content = [line[6:]]  # Remove "User: " prefix
        elif line.startswith('Assistant: '):
            # Save previous message if exists
            if current_sender and current_content:
                messages.append((current_sender, '\n'.join(current_content)))
            # Start new assistant message
            current_sender = 'bot'  # Database uses 'bot' not 'assistant'
            current_content = [line[11:]]  # Remove "Assistant: " prefix
        else:
            # Continuation of current message
            if current_sender:
                current_content.append(line)
    
    # Don't forget the last message
    if current_sender and current_content:
        messages.append((current_sender, '\n'.join(current_content)))
    
    return messages


def parse_finetuning_format(text: str) -> List[Tuple[str, str]]:
    """
    Parse Mistral finetuning format with special tokens.
    Returns list of (sender, content) tuples.
    """
    messages = []
    
    # Remove begin/end markers
    text = text.replace('<|begin_of_text|>', '').replace('<|end_of_text|>', '')
    
    # Split by message headers
    # Pattern: <|start_header_id|>user<|end_header_id|>\n\ncontent<|eot_id|>
    pattern = r'<\|start_header_id\|>(user|assistant)<\|end_header_id\|>\s*\n\s*(.*?)(?=<\|start_header_id\|>|<\|eot_id\|>|$)'
    
    matches = re.finditer(pattern, text, re.DOTALL)
    for match in matches:
        sender = match.group(1)
        content = match.group(2).strip()
        
        # Remove trailing <|eot_id|> if present
        content = content.replace('<|eot_id|>', '').strip()
        
        if content:
            # Convert 'assistant' to 'bot' for database
            db_sender = 'bot' if sender == 'assistant' else sender
            messages.append((db_sender, content))
    
    return messages


def detect_format(example: Dict[str, Any]) -> str:
    """Detect if the example is in embedding or finetuning format."""
    if 'content' in example:
        return 'embedding'
    elif 'text' in example:
        return 'finetuning'
    else:
        raise ValueError("Unknown format: missing 'content' or 'text' field")


def parse_messages(example: Dict[str, Any]) -> List[Tuple[str, str]]:
    """Parse messages from either embedding or finetuning format."""
    format_type = detect_format(example)
    
    if format_type == 'embedding':
        content = example.get('content', '')
        return parse_embedding_format(content)
    else:  # finetuning
        text = example.get('text', '')
        return parse_finetuning_format(text)


def import_training_data(
    supabase: Client,
    jsonl_file: str,
    skip_existing: bool = False,
    user_id: Optional[str] = None
) -> Dict[str, int]:
    """
    Import training data from JSONL file into Supabase.
    
    Returns:
        Dictionary with counts: {'imported': int, 'skipped': int, 'errors': int}
    """
    stats = {'imported': 0, 'skipped': 0, 'errors': 0}
    
    logger.info(f"Reading training data from {jsonl_file}")
    
    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                example = json.loads(line)
                metadata = example.get('metadata', {})
                
                # Extract conversation info
                conversation_id = metadata.get('conversation_id')
                persona_id = metadata.get('persona_id')
                feedback_scores = metadata.get('feedback_scores', {})
                created_at = metadata.get('created_at')
                
                if not conversation_id:
                    logger.warning(f"Line {line_num}: Missing conversation_id, skipping")
                    stats['errors'] += 1
                    continue
                
                if not persona_id:
                    logger.warning(f"Line {line_num}: Missing persona_id, skipping")
                    stats['errors'] += 1
                    continue
                
                # Check if conversation already exists
                if skip_existing:
                    existing = supabase.table('conversations').select('id').eq('id', conversation_id).execute()
                    if existing.data:
                        logger.info(f"Line {line_num}: Conversation {conversation_id} already exists, skipping")
                        stats['skipped'] += 1
                        continue
                
                # Parse messages
                try:
                    messages = parse_messages(example)
                except Exception as e:
                    logger.error(f"Line {line_num}: Error parsing messages: {e}")
                    stats['errors'] += 1
                    continue
                
                if not messages:
                    logger.warning(f"Line {line_num}: No messages found, skipping")
                    stats['errors'] += 1
                    continue
                
                # Get or create user_id
                if not user_id:
                    # Try to get admin user
                    admin_email = "kyrodahero123@gmail.com"
                    user_result = supabase.table('auth.users').select('id').eq('email', admin_email).execute()
                    if user_result.data:
                        user_id = user_result.data[0]['id']
                    else:
                        logger.error("Could not find admin user. Please provide --user-id")
                        stats['errors'] += 1
                        continue
                
                # Parse created_at timestamp
                timestamp = datetime.now().isoformat()
                if created_at:
                    try:
                        # Try to parse the timestamp
                        if isinstance(created_at, str):
                            timestamp = created_at
                    except:
                        pass
                
                # Create conversation
                conversation_data = {
                    'id': conversation_id,
                    'user_id': user_id,
                    'persona_id': persona_id,
                    'title': f"Imported Conversation {conversation_id[:8]}",
                    'created_at': timestamp,
                    'updated_at': timestamp,
                    'last_message_at': timestamp
                }
                
                try:
                    result = supabase.table('conversations').insert(conversation_data).execute()
                    logger.debug(f"Created conversation {conversation_id}")
                except Exception as e:
                    if 'duplicate key' in str(e).lower() or 'unique constraint' in str(e).lower():
                        if skip_existing:
                            stats['skipped'] += 1
                            continue
                        # Update existing conversation
                        supabase.table('conversations').update({
                            'updated_at': timestamp,
                            'last_message_at': timestamp
                        }).eq('id', conversation_id).execute()
                        logger.debug(f"Updated conversation {conversation_id}")
                    else:
                        raise
                
                # Insert messages
                message_data_list = []
                for idx, (sender, content) in enumerate(messages):
                    message_data = {
                        'conversation_id': conversation_id,
                        'sender': sender,
                        'content': content,
                        'created_at': timestamp
                    }
                    message_data_list.append(message_data)
                
                if message_data_list:
                    try:
                        supabase.table('messages').insert(message_data_list).execute()
                        logger.debug(f"Inserted {len(message_data_list)} messages for conversation {conversation_id}")
                    except Exception as e:
                        logger.warning(f"Error inserting messages for {conversation_id}: {e}")
                        # Continue anyway
                
                # Create feedback questionnaire entry
                if feedback_scores:
                    feedback_data = {
                        'conversation_id': conversation_id,
                        'persona_id': persona_id,
                        'politeness': feedback_scores.get('politeness'),
                        'fairness': feedback_scores.get('fairness'),
                        'respectfulness': feedback_scores.get('respectfulness'),
                        'trustworthiness': feedback_scores.get('trustworthiness'),
                        'competence': feedback_scores.get('competence'),
                        'likeability': feedback_scores.get('likeability'),
                        'open_ended': feedback_scores.get('open_ended'),
                        'created_at': timestamp
                    }
                    
                    # Remove None values
                    feedback_data = {k: v for k, v in feedback_data.items() if v is not None}
                    
                    try:
                        supabase.table('feedback_questionnaire').insert(feedback_data).execute()
                        logger.debug(f"Created feedback entry for conversation {conversation_id}")
                    except Exception as e:
                        if 'duplicate key' not in str(e).lower():
                            logger.warning(f"Error inserting feedback for {conversation_id}: {e}")
                
                stats['imported'] += 1
                
                if line_num % 10 == 0:
                    logger.info(f"Processed {line_num} lines... (imported: {stats['imported']}, skipped: {stats['skipped']}, errors: {stats['errors']})")
            
            except json.JSONDecodeError as e:
                logger.error(f"Line {line_num}: Invalid JSON: {e}")
                stats['errors'] += 1
            except Exception as e:
                logger.error(f"Line {line_num}: Unexpected error: {e}")
                stats['errors'] += 1
    
    return stats


def main():
    parser = argparse.ArgumentParser(
        description='Import exported training data into Supabase database'
    )
    parser.add_argument(
        'jsonl_file',
        type=str,
        help='Path to the JSONL file to import'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='Skip conversations that already exist in the database'
    )
    parser.add_argument(
        '--user-id',
        type=str,
        help='User ID to assign conversations to (default: admin user)'
    )
    
    args = parser.parse_args()
    
    # Check environment variables
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url:
        logger.error("NEXT_PUBLIC_SUPABASE_URL environment variable is not set")
        sys.exit(1)
    
    if not supabase_key:
        logger.error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set")
        sys.exit(1)
    
    # Check if file exists
    if not os.path.exists(args.jsonl_file):
        logger.error(f"File not found: {args.jsonl_file}")
        sys.exit(1)
    
    # Create Supabase client
    logger.info("Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)
    
    # Import data
    logger.info(f"Starting import from {args.jsonl_file}")
    stats = import_training_data(
        supabase,
        args.jsonl_file,
        skip_existing=args.skip_existing,
        user_id=args.user_id
    )
    
    # Print summary
    logger.info("\n" + "="*50)
    logger.info("Import Summary:")
    logger.info(f"  Imported: {stats['imported']}")
    logger.info(f"  Skipped:  {stats['skipped']}")
    logger.info(f"  Errors:   {stats['errors']}")
    logger.info("="*50)


if __name__ == "__main__":
    main()