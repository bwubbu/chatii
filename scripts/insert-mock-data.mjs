#!/usr/bin/env node

/**
 * Mock Data Insertion Script for Admin Dashboard Presentation
 * 
 * Usage: node scripts/insert-mock-data.mjs
 * 
 * This script inserts realistic mock data into your Supabase database for demonstration:
 * - Overview tab: analytics, conversations, users, feedback
 * - Data & Training tab: flagged messages, training data
 * - Persona Requests tab: user requests
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomScore = () => (Math.random() * 1.5 + 3.5).toFixed(1); // 3.5-5.0
const getRandomDate = (daysAgo = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - getRandomInt(0, daysAgo));
  date.setHours(getRandomInt(0, 23), getRandomInt(0, 59), 0, 0);
  return date.toISOString();
};

// Mock personas
const personas = [
  {
    id: 'persona_legal_' + generateId(),
    title: 'Legal Advisor',
    description: 'Expert legal consultant providing accurate legal information and guidance',
    instructions: 'You are an expert legal advisor. Provide accurate, fair, and trustworthy legal information. Always consider multiple perspectives and maintain professional respectfulness.',
    avatar_url: null,
    created_at: '2024-01-01T10:00:00Z',
    is_active: true,
  },
  {
    id: 'persona_health_' + generateId(),
    title: 'Healthcare Assistant',
    description: 'Compassionate healthcare professional providing wellness information',
    instructions: 'You are a healthcare professional. Provide accurate health information with empathy. Always recommend consulting with licensed practitioners.',
    avatar_url: null,
    created_at: '2024-01-05T14:30:00Z',
    is_active: true,
  },
  {
    id: 'persona_edu_' + generateId(),
    title: 'Educational Mentor',
    description: 'Experienced educator supporting learning and skill development',
    instructions: 'You are an experienced educator. Help students learn effectively with clear explanations and encouraging feedback.',
    avatar_url: null,
    created_at: '2024-01-10T09:15:00Z',
    is_active: true,
  },
];

// Generate mock data
const generateMockData = () => {
  const userIds = Array.from({ length: 8 }, () => 'user_' + generateId());

  const conversations = userIds.flatMap(userId =>
    Array.from({ length: getRandomInt(2, 4) }, () => ({
      id: 'conv_' + generateId(),
      user_id: userId,
      persona_id: personas[getRandomInt(0, personas.length - 1)].id,
      title: [
        'Legal consultation',
        'Health inquiry',
        'Learning session',
        'General question',
        'Follow-up discussion',
      ][getRandomInt(0, 4)],
      created_at: getRandomDate(),
      updated_at: getRandomDate(),
    }))
  );

  const messages = conversations.flatMap(conv =>
    Array.from({ length: getRandomInt(4, 12) }, () => ({
      id: 'msg_' + generateId(),
      conversation_id: conv.id,
      role: Math.random() > 0.5 ? 'user' : 'assistant',
      content: 'Sample conversation message',
      created_at: getRandomDate(),
    }))
  );

  const feedback = conversations.slice(0, Math.floor(conversations.length * 0.65)).map(conv => ({
    id: 'feedback_' + generateId(),
    conversation_id: conv.id,
    persona_id: conv.persona_id,
    user_id: conv.user_id,
    politeness: parseFloat(getRandomScore()),
    fairness: parseFloat(getRandomScore()),
    respectfulness: parseFloat(getRandomScore()),
    trustworthiness: parseFloat(getRandomScore()),
    competence: parseFloat(getRandomScore()),
    likeability: parseFloat(getRandomScore()),
    open_ended: [
      'Very helpful and professional response',
      'Clear and well-explained information',
      'Respectful and unbiased approach',
      'Knowledgeable and accurate',
      'Great support and follow-up',
    ][getRandomInt(0, 4)],
    created_at: getRandomDate(),
  }));

  const flaggedMessages = [
    {
      id: 'flagged_' + generateId(),
      message_id: 'msg_' + generateId(),
      conversation_id: conversations[0].id,
      persona_id: personas[0].id,
      user_id: userIds[0],
      reason: 'Biased language detected in response',
      severity: 'high',
      status: 'pending',
      admin_notes: null,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'flagged_' + generateId(),
      message_id: 'msg_' + generateId(),
      conversation_id: conversations[1].id,
      persona_id: personas[1].id,
      user_id: userIds[1],
      reason: 'Potentially inaccurate medical information',
      severity: 'critical',
      status: 'pending',
      admin_notes: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'flagged_' + generateId(),
      message_id: 'msg_' + generateId(),
      conversation_id: conversations[2].id,
      persona_id: personas[2].id,
      user_id: userIds[2],
      reason: 'Tone appears dismissive',
      severity: 'medium',
      status: 'approved',
      admin_notes: 'Reviewed and documented for training',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'flagged_' + generateId(),
      message_id: 'msg_' + generateId(),
      conversation_id: conversations[3].id,
      persona_id: personas[0].id,
      user_id: userIds[3],
      reason: 'Missing important context in response',
      severity: 'medium',
      status: 'approved',
      admin_notes: 'Added to training set',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'flagged_' + generateId(),
      message_id: 'msg_' + generateId(),
      conversation_id: conversations[4].id,
      persona_id: personas[1].id,
      user_id: userIds[4],
      reason: 'Incomplete information provided',
      severity: 'low',
      status: 'approved',
      admin_notes: 'Documented',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const demographics = userIds.map(userId => ({
    id: 'demo_' + generateId(),
    user_id: userId,
    age_group: ['18-25', '26-35', '36-45', '46-55', '55+'][getRandomInt(0, 4)],
    gender: ['male', 'female', 'non-binary', 'prefer_not_to_say'][getRandomInt(0, 3)],
    role: [
      'student',
      'professional',
      'educator',
      'healthcare_worker',
      'legal_professional',
    ][getRandomInt(0, 4)],
    created_at: getRandomDate(),
  }));

  const personaRequests = [
    {
      id: 'preq_' + generateId(),
      user_email: 'alice.smith@example.com',
      persona_name: 'Financial Advisor',
      description:
        'A knowledgeable financial planning expert who provides investment and budgeting advice with fair and trustworthy recommendations.',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'bob.johnson@example.com',
      persona_name: 'Career Coach',
      description:
        'An experienced career professional offering resume review, interview preparation, and career development guidance.',
      status: 'approved',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'carol.white@example.com',
      persona_name: 'Tech Support Specialist',
      description:
        'A technology expert providing troubleshooting, technical guidance, and software recommendations.',
      status: 'completed',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'diana.lee@example.com',
      persona_name: 'Nutrition Expert',
      description:
        'A certified nutritionist providing personalized dietary recommendations and wellness advice.',
      status: 'pending',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'evan.harris@example.com',
      persona_name: 'Business Consultant',
      description:
        'A business strategy consultant offering insights on market analysis, growth strategies, and operations optimization.',
      status: 'rejected',
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return {
    personas,
    conversations,
    messages,
    feedback,
    flaggedMessages,
    demographics,
    personaRequests,
  };
};

// Insert data with error handling
const insertData = async () => {
  console.log('\n🚀 Starting mock data insertion for presentation...\n');

  const mockData = generateMockData();
  let insertedCount = 0;

  try {
    // 1. Insert personas
    console.log('📝 Inserting 3 personas...');
    for (const persona of mockData.personas) {
      const { error } = await supabase.from('personas').insert(persona);
      if (error) {
        console.warn(`   ⚠️  Error inserting persona "${persona.title}":`, error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} personas\n`);
    insertedCount = 0;

    // 2. Insert demographics
    console.log(`📊 Inserting ${mockData.demographics.length} demographic records...`);
    for (const demo of mockData.demographics) {
      const { error } = await supabase.from('demographics').insert(demo);
      if (error) {
        console.warn('   ⚠️  Error inserting demographic:', error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} demographic records\n`);
    insertedCount = 0;

    // 3. Insert conversations
    console.log(`💬 Inserting ${mockData.conversations.length} conversations...`);
    for (const conv of mockData.conversations) {
      const { error } = await supabase.from('conversations').insert(conv);
      if (error) {
        console.warn('   ⚠️  Error inserting conversation:', error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} conversations\n`);
    insertedCount = 0;

    // 4. Insert messages
    console.log(`📨 Inserting ${mockData.messages.length} messages...`);
    for (const msg of mockData.messages) {
      const { error } = await supabase.from('messages').insert(msg);
      if (error) {
        console.warn('   ⚠️  Error inserting message:', error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} messages\n`);
    insertedCount = 0;

    // 5. Insert feedback
    console.log(`⭐ Inserting ${mockData.feedback.length} feedback records...`);
    for (const fb of mockData.feedback) {
      const { error } = await supabase.from('feedback_questionnaire').insert(fb);
      if (error) {
        console.warn('   ⚠️  Error inserting feedback:', error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} feedback records\n`);
    insertedCount = 0;

    // 6. Insert flagged messages
    console.log(`🚩 Inserting ${mockData.flaggedMessages.length} flagged messages...`);
    for (const flagged of mockData.flaggedMessages) {
      const { error } = await supabase.from('flagged_messages').insert(flagged);
      if (error) {
        console.warn('   ⚠️  Error inserting flagged message:', error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} flagged messages\n`);
    insertedCount = 0;

    // 7. Insert persona requests
    console.log(`🎯 Inserting ${mockData.personaRequests.length} persona requests...`);
    for (const req of mockData.personaRequests) {
      const { error } = await supabase.from('persona_requests').insert(req);
      if (error) {
        console.warn('   ⚠️  Error inserting persona request:', error.message);
      } else {
        insertedCount++;
      }
    }
    console.log(`   ✅ Inserted ${insertedCount} persona requests\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ Mock data insertion completed successfully!\n');
    console.log('📊 Summary of inserted data:');
    console.log(`   • Personas: ${mockData.personas.length}`);
    console.log(`   • Conversations: ${mockData.conversations.length}`);
    console.log(`   • Messages: ${mockData.messages.length}`);
    console.log(`   • Feedback records: ${mockData.feedback.length}`);
    console.log(`   • Flagged messages: ${mockData.flaggedMessages.length}`);
    console.log(`   • Demographics: ${mockData.demographics.length}`);
    console.log(`   • Persona requests: ${mockData.personaRequests.length}`);
    console.log('\n📋 What you can now demonstrate:');
    console.log('   ✓ Overview Tab: Complete analytics dashboard with charts');
    console.log('   ✓ Data & Training Tab: Flagged messages and training data insights');
    console.log('   ✓ Persona Requests: User requests with various statuses');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error during data insertion:', error.message);
    process.exit(1);
  }
};

// Run script
insertData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
