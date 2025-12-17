/**
 * Helper functions for RAG (Retrieval Augmented Generation)
 * Retrieves relevant Malaysian guidelines and book sections based on conversation context
 */

export interface MalaysianGuideline {
  id: string;
  guideline_id: string;
  guideline_name: string;
  description: string;
  content: string;
  category: 'politeness' | 'fairness' | 'system';
  similarity?: number;
}

export interface BookSection {
  id: string;
  section_number: number;
  book_title: string;
  book_author: string;
  book_isbn?: string;
  chapter?: string;
  section_title?: string;
  page_number?: number;
  content: string;
  keywords: string[];
  target_culture: 'Malay' | 'Malaysian Chinese' | 'Malaysian Indian' | 'Swedish' | 'General';
  relevance_score: number;
  similarity?: number;
}

/**
 * Retrieve relevant Malaysian guidelines using RAG
 */
export async function retrieveMalaysianGuidelines(
  query: string,
  limit: number = 3
): Promise<MalaysianGuideline[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const response = await fetch(`${baseUrl}/api/rag/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit,
        matchThreshold: 0.6, // Lower threshold to get more guidelines
      }),
    });

    if (!response.ok) {
      console.warn('RAG retrieval failed, continuing without guidelines');
      return [];
    }

    const data = await response.json();
    return data.guidelines || [];
  } catch (error) {
    console.error('Error retrieving Malaysian guidelines:', error);
    return []; // Return empty array on error, don't break the chat
  }
}

/**
 * Retrieve relevant book sections using RAG
 * Can filter by target culture based on user's nationality/race
 */
export async function retrieveBookSections(
  query: string,
  limit: number = 3,
  targetCulture?: 'Malay' | 'Malaysian Chinese' | 'Malaysian Indian' | 'Swedish' | 'General'
): Promise<BookSection[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const response = await fetch(`${baseUrl}/api/rag/retrieve-book-sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit,
        targetCulture,
        matchThreshold: 0.6, // Lower threshold to get more sections
      }),
    });

    if (!response.ok) {
      console.warn('Book sections retrieval failed, continuing without sections');
      return [];
    }

    const data = await response.json();
    return data.sections || [];
  } catch (error) {
    console.error('Error retrieving book sections:', error);
    return []; // Return empty array on error, don't break the chat
  }
}

/**
 * Retrieve both Malaysian guidelines and book sections in one efficient call
 * This is the recommended approach - more efficient than separate calls
 */
export async function retrieveCombinedRAG(
  query: string,
  guidelinesLimit: number = 3,
  bookSectionsLimit: number = 2,
  targetCulture?: 'Malay' | 'Malaysian Chinese' | 'Malaysian Indian' | 'Swedish' | 'General'
): Promise<{
  guidelines: MalaysianGuideline[];
  bookSections: BookSection[];
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const response = await fetch(`${baseUrl}/api/rag/retrieve-combined`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        guidelinesLimit,
        bookSectionsLimit,
        targetCulture,
        matchThreshold: 0.6,
      }),
    });

    if (!response.ok) {
      console.warn('Combined RAG retrieval failed, falling back to separate calls');
      // Fallback to separate calls
      const [guidelines, bookSections] = await Promise.all([
        retrieveMalaysianGuidelines(query, guidelinesLimit),
        retrieveBookSections(query, bookSectionsLimit, targetCulture),
      ]);
      return { guidelines, bookSections };
    }

    const data = await response.json();
    return {
      guidelines: data.guidelines || [],
      bookSections: data.bookSections || [],
    };
  } catch (error) {
    console.error('Error retrieving combined RAG:', error);
    // Fallback to separate calls
    const [guidelines, bookSections] = await Promise.all([
      retrieveMalaysianGuidelines(query, guidelinesLimit),
      retrieveBookSections(query, bookSectionsLimit, targetCulture),
    ]);
    return { guidelines, bookSections };
  }
}

/**
 * Format guidelines into system prompt section
 */
export function formatGuidelinesForPrompt(guidelines: MalaysianGuideline[]): string {
  if (guidelines.length === 0) {
    return '';
  }

  const guidelineTexts = guidelines.map(g => `- ${g.content}`).join('\n');

  return `
MALAYSIAN CULTURAL GUIDELINES (Apply these based on context):
${guidelineTexts}

IMPORTANT: When interacting with users:
- Use formal Malaysian honorifics (Encik/Puan/Tuan) when appropriate, especially at conversation start
- Use indirect, face-saving language for refusals (avoid blunt "tidak boleh" or "I cannot")
- End conversations with warm, polite closings beyond simple "thank you"
- Never make assumptions based on ethnicity, religion, or cultural background
- Be transparent about being an AI if asked, but frame it politely
- Adapt formality based on user's language style while maintaining respectful boundaries
`;
}

/**
 * Map user nationality and race to target culture for book section retrieval
 */
export function mapUserToTargetCulture(
  nationality?: string,
  race?: string
): 'Malay' | 'Malaysian Chinese' | 'Malaysian Indian' | 'Swedish' | 'General' | undefined {
  if (!nationality) return undefined;
  
  if (nationality === 'Sweden') {
    return 'Swedish';
  }
  
  if (nationality === 'Malaysia') {
    if (race === 'Malay') return 'Malay';
    if (race === 'Malaysian Chinese') return 'Malaysian Chinese';
    if (race === 'Malaysian Indian') return 'Malaysian Indian';
    return 'General'; // Malaysian but race not specified
  }
  
  return 'General';
}

/**
 * Format book sections into system prompt section
 */
export function formatBookSectionsForPrompt(sections: BookSection[]): string {
  if (sections.length === 0) {
    return '';
  }

  const sectionTexts = sections.map(s => {
    let text = `From "${s.book_title}" by ${s.book_author}`;
    if (s.chapter) text += ` (${s.chapter})`;
    text += `:\n${s.content}`;
    return text;
  }).join('\n\n');

  return `
CULTURAL CONTEXT FROM ACADEMIC SOURCES (Use to inform your communication style):
${sectionTexts}

Note: Use this cultural knowledge to adapt your communication appropriately, but do not explicitly mention these sources or cultural details unless directly relevant to the conversation.
`;
}















