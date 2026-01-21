/**
 * Mock Data Insertion Script for Presentation
 * 
 * This script inserts realistic mock data for the admin dashboard presentation.
 * It populates:
 * - Overview tab: analytics, conversations, users, feedback
 * - Data & Training tab: flagged messages, feedback data, training data insights
 * - Persona Requests tab: user persona requests
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomScore = () => (Math.random() * 2 + 3.5).toFixed(1); // 3.5-5.5
const getRandomLowScore = () => (Math.random() * 2).toFixed(1); // 0-2
const getRandomDate = (daysAgo: number = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - getRandomInt(0, daysAgo));
  return date.toISOString();
};

interface MockData {
  personasData: any[];
  usersData: any[];
  conversationsData: any[];
  messagesData: any[];
  feedbackData: any[];
  flaggedMessagesData: any[];
  demographicsData: any[];
  personaRequestsData: any[];
}

// Generate comprehensive mock data
const generateMockData = (): MockData => {
  const personasData = [
    {
      id: 'persona_1',
      title: 'Legal Advisor',
      description: 'An expert legal consultant providing accurate legal information and guidance',
      instructions: 'You are an expert legal advisor. Provide accurate, fair, and trustworthy legal information. Always consider multiple perspectives and maintain professional respectfulness.',
      avatar_url: null,
      created_at: '2024-01-01T10:00:00Z',
      is_active: true,
    },
    {
      id: 'persona_2',
      title: 'Healthcare Assistant',
      description: 'A compassionate healthcare professional providing wellness information',
      instructions: 'You are a healthcare professional. Provide accurate health information with empathy. Always recommend consulting with licensed practitioners for medical concerns.',
      avatar_url: null,
      created_at: '2024-01-05T14:30:00Z',
      is_active: true,
    },
    {
      id: 'persona_3',
      title: 'Educational Mentor',
      description: 'An experienced educator supporting learning and skill development',
      instructions: 'You are an experienced educator. Help students learn effectively with clear explanations and encouraging feedback. Adapt to different learning styles.',
      avatar_url: null,
      created_at: '2024-01-10T09:15:00Z',
      is_active: true,
    },
  ];

  const userIds = [
    'user_' + generateId(),
    'user_' + generateId(),
    'user_' + generateId(),
    'user_' + generateId(),
    'user_' + generateId(),
  ];

  const conversationsData = userIds.flatMap(userId =>
    Array.from({ length: getRandomInt(2, 5) }, (_, i) => ({
      id: 'conv_' + generateId(),
      user_id: userId,
      persona_id: personasData[getRandomInt(0, 2)].id,
      title: ['Legal Question', 'Health Advice', 'Learning Support', 'General Inquiry', 'Follow-up Discussion'][i % 5],
      created_at: getRandomDate(),
      updated_at: getRandomDate(),
    }))
  );

  const messagesData = conversationsData.flatMap(conv =>
    Array.from({ length: getRandomInt(3, 15) }, () => ({
      id: 'msg_' + generateId(),
      conversation_id: conv.id,
      role: Math.random() > 0.5 ? 'user' : 'assistant',
      content: 'Sample conversation message',
      created_at: getRandomDate(),
    }))
  );

  const feedbackData = conversationsData.slice(0, Math.floor(conversationsData.length * 0.6)).map(conv => ({
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
      'Clear and well-explained',
      'Respectful and unbiased',
      'Knowledgeable and accurate',
      'Great follow-up support',
    ][getRandomInt(0, 4)],
    created_at: getRandomDate(),
  }));

  const flaggedMessagesData = Array.from({ length: 8 }, (_, i) => ({
    id: 'flagged_' + generateId(),
    message_id: 'msg_' + generateId(),
    conversation_id: 'conv_' + generateId(),
    persona_id: personasData[getRandomInt(0, 2)].id,
    user_id: userIds[getRandomInt(0, 4)],
    reason: [
      'Biased language detected',
      'Inaccurate information',
      'Inappropriate tone',
      'Potentially harmful advice',
      'Missing context',
    ][getRandomInt(0, 4)],
    severity: ['critical', 'high', 'medium', 'low'][getRandomInt(0, 3)],
    status: i < 3 ? 'pending' : (i < 6 ? 'approved' : 'rejected'),
    admin_notes: i < 3 ? null : 'Reviewed and processed',
    created_at: getRandomDate(),
  }));

  const demographicsData = userIds.map(userId => ({
    id: 'demo_' + generateId(),
    user_id: userId,
    age_group: ['18-25', '26-35', '36-45', '46-55', '55+'][getRandomInt(0, 4)],
    gender: ['male', 'female', 'non-binary', 'prefer_not_to_say'][getRandomInt(0, 3)],
    role: ['student', 'professional', 'educator', 'healthcare_worker', 'legal_professional'][getRandomInt(0, 4)],
    created_at: getRandomDate(),
  }));

  const personaRequestsData = [
    {
      id: 'preq_' + generateId(),
      user_email: 'alice.smith@example.com',
      persona_name: 'Financial Advisor',
      description: 'A knowledgeable financial planning expert who provides investment and budgeting advice',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'bob.johnson@example.com',
      persona_name: 'Career Coach',
      description: 'An experienced career professional offering resume review and interview preparation',
      status: 'approved',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'carol.white@example.com',
      persona_name: 'Tech Support Specialist',
      description: 'A technology expert providing troubleshooting and technical guidance',
      status: 'completed',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'preq_' + generateId(),
      user_email: 'diana.lee@example.com',
      persona_name: 'Nutrition Expert',
      description: 'A certified nutritionist providing personalized dietary recommendations',
      status: 'pending',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return {
    personasData,
    usersData: userIds.map(id => ({ id })),
    conversationsData,
    messagesData,
    feedbackData,
    flaggedMessagesData,
    demographicsData,
    personaRequestsData,
  };
};

// Insert mock data
const insertMockData = async () => {
  const mockData = generateMockData();

  try {
    console.log('🚀 Starting mock data insertion...\n');

    // 1. Insert personas
    console.log('📝 Inserting personas...');
    const { error: personasError } = await supabase.from('personas').insert(mockData.personasData);
    if (personasError) {
      console.warn('⚠️  Personas insert warning:', personasError.message);
    } else {
      console.log(`✅ Inserted ${mockData.personasData.length} personas`);
    }

    // 2. Insert demographics
    console.log('📊 Inserting demographics...');
    const { error: demographicsError } = await supabase.from('demographics').insert(mockData.demographicsData);
    if (demographicsError) {
      console.warn('⚠️  Demographics insert warning:', demographicsError.message);
    } else {
      console.log(`✅ Inserted ${mockData.demographicsData.length} demographic records`);
    }

    // 3. Insert conversations
    console.log('💬 Inserting conversations...');
    const { error: conversationsError } = await supabase.from('conversations').insert(mockData.conversationsData);
    if (conversationsError) {
      console.warn('⚠️  Conversations insert warning:', conversationsError.message);
    } else {
      console.log(`✅ Inserted ${mockData.conversationsData.length} conversations`);
    }

    // 4. Insert messages
    console.log('📨 Inserting messages...');
    const { error: messagesError } = await supabase.from('messages').insert(mockData.messagesData);
    if (messagesError) {
      console.warn('⚠️  Messages insert warning:', messagesError.message);
    } else {
      console.log(`✅ Inserted ${mockData.messagesData.length} messages`);
    }

    // 5. Insert feedback
    console.log('⭐ Inserting feedback...');
    const { error: feedbackError } = await supabase.from('feedback_questionnaire').insert(mockData.feedbackData);
    if (feedbackError) {
      console.warn('⚠️  Feedback insert warning:', feedbackError.message);
    } else {
      console.log(`✅ Inserted ${mockData.feedbackData.length} feedback records`);
    }

    // 6. Insert flagged messages
    console.log('🚩 Inserting flagged messages...');
    const { error: flaggedError } = await supabase.from('flagged_messages').insert(mockData.flaggedMessagesData);
    if (flaggedError) {
      console.warn('⚠️  Flagged messages insert warning:', flaggedError.message);
    } else {
      console.log(`✅ Inserted ${mockData.flaggedMessagesData.length} flagged messages`);
    }

    // 7. Insert persona requests (via API since this table might be managed differently)
    console.log('🎯 Inserting persona requests...');
    for (const request of mockData.personaRequestsData) {
      const { error: reqError } = await supabase.from('persona_requests').insert(request);
      if (reqError && !reqError.message.includes('duplicate')) {
        console.warn('⚠️  Persona request insert warning:', reqError.message);
      }
    }
    console.log(`✅ Inserted ${mockData.personaRequestsData.length} persona requests`);

    console.log('\n✨ Mock data insertion completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Personas: ${mockData.personasData.length}`);
    console.log(`  - Conversations: ${mockData.conversationsData.length}`);
    console.log(`  - Messages: ${mockData.messagesData.length}`);
    console.log(`  - Feedback records: ${mockData.feedbackData.length}`);
    console.log(`  - Flagged messages: ${mockData.flaggedMessagesData.length}`);
    console.log(`  - Demographics: ${mockData.demographicsData.length}`);
    console.log(`  - Persona requests: ${mockData.personaRequestsData.length}`);

  } catch (error) {
    console.error('❌ Error inserting mock data:', error);
    process.exit(1);
  }
};

// Run the script
insertMockData();
