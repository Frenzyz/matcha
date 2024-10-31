// Event type keywords for better categorization
export const eventTypeKeywords: Record<string, string[]> = {
  academic: [
    'class', 'lecture', 'seminar', 'workshop', 'study', 'tutoring',
    'exam', 'test', 'quiz', 'assignment', 'project', 'presentation',
    'office hours', 'academic', 'education', 'learning', 'library',
    'research', 'thesis', 'dissertation', 'defense', 'capstone',
    'lab', 'laboratory', 'practicum', 'course', 'curriculum',
    'study group', 'office hours', 'advising', 'academic support',
    'writing center', 'math lab', 'tutor', 'professor', 'instructor',
    'faculty', 'dean', 'department', 'college', 'school', 'university'
  ],
  
  career: [
    'career', 'job', 'interview', 'resume', 'networking', 'internship',
    'professional', 'employer', 'recruitment', 'hiring', 'employment',
    'work', 'industry', 'corporate', 'business', 'company', 'startup',
    'entrepreneurship', 'mentor', 'coaching', 'skill', 'training',
    'certification', 'portfolio', 'career fair', 'job fair',
    'linkedin', 'cover letter', 'application', 'salary', 'negotiation'
  ],
  
  wellness: [
    'health', 'wellness', 'fitness', 'gym', 'exercise', 'meditation',
    'yoga', 'mindfulness', 'counseling', 'therapy', 'mental health',
    'nutrition', 'diet', 'stress', 'relaxation', 'self-care',
    'medical', 'doctor', 'appointment', 'checkup', 'vaccination',
    'recreation', 'sports', 'workout', 'physical', 'massage'
  ],
  
  social: [
    'club', 'meeting', 'social', 'gathering', 'party', 'celebration',
    'event', 'festival', 'concert', 'performance', 'show', 'exhibition',
    'community', 'organization', 'group', 'team', 'society', 'association',
    'union', 'council', 'committee', 'assembly', 'mixer', 'networking'
  ],
  
  research: [
    'research', 'study', 'experiment', 'investigation', 'analysis',
    'data', 'survey', 'observation', 'field work', 'laboratory',
    'science', 'discovery', 'innovation', 'development', 'testing',
    'methodology', 'hypothesis', 'theory', 'publication', 'grant'
  ],
  
  service: [
    'volunteer', 'service', 'community', 'outreach', 'help',
    'assistance', 'support', 'aid', 'charity', 'nonprofit',
    'giving', 'donation', 'contribution', 'philanthropy',
    'social work', 'civic', 'public service', 'food bank'
  ],
  
  cultural: [
    'cultural', 'diversity', 'inclusion', 'multicultural', 'international',
    'heritage', 'tradition', 'celebration', 'festival', 'ceremony',
    'language', 'art', 'music', 'dance', 'theater', 'film',
    'exhibition', 'showcase', 'performance', 'culture', 'ethnic'
  ],
  
  athletic: [
    'sport', 'game', 'match', 'tournament', 'competition',
    'athletics', 'team', 'practice', 'training', 'fitness',
    'championship', 'league', 'intramural', 'recreation',
    'physical activity', 'exercise', 'varsity', 'club sport'
  ],
  
  administrative: [
    'advising', 'registration', 'enrollment', 'orientation',
    'administrative', 'paperwork', 'documentation', 'forms',
    'deadline', 'application', 'submission', 'verification',
    'approval', 'processing', 'review', 'transcript', 'diploma'
  ],
  
  financial: [
    'financial', 'scholarship', 'grant', 'aid', 'funding',
    'payment', 'tuition', 'fees', 'loan', 'budget',
    'money', 'finance', 'accounting', 'billing', 'cost',
    'expense', 'reimbursement', 'stipend', 'award', 'prize'
  ]
};

export function determineEventType(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  for (const [type, keywords] of Object.entries(eventTypeKeywords)) {
    if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
      return type;
    }
  }
  
  return 'academic'; // Default type
}