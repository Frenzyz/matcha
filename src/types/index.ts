export interface Event {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    type:
        | 'academic'
        | 'career'
        | 'wellness'
        | 'social'
        | 'research'
        | 'service'
        | 'cultural'
        | 'athletic'
        | 'administrative'
        | 'financial';
    status: 'pending' | 'completed';
    attendees?: number;
    is_recurring?: boolean;
    recurrence_rule?: string;
    source: 'manual' | 'scraped' | 'google' | 'canvas' | 'demo' | 'calendar';
    created_at?: string;
    updated_at?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    student_id?: string;
    major?: string;
    avatar_url?: string;
    theme_color?: string;
    setup_completed?: boolean;
    google_calendar_token?: string;
    google_calendar_ids?: string[];
    created_at: string;
    last_seen?: string;
}

export interface Scholarship {
    id: string;
    title: string;
    description: string;
    amount: number;
    deadline: string;
    type: 'merit' | 'need-based' | 'research' | 'general';
    awards: number;
    organization: string;
    majors?: string[];
    requirements?: string[];
    url: string | null;
}

export interface Assignment {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    course: string;
    due_date: string;
    progress: number;
    status: 'pending' | 'in_progress' | 'completed' | 'late';
    created_at?: string;
    updated_at?: string;
}
