
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://snxglcgkjlmehagsulan.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueGdsY2dramxtZWhhZ3N1bGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjMzNjYsImV4cCI6MjA4MDA5OTM2Nn0.TBd_cPt9oqh-6VGZWExj2roWZFwbN0ctxXb6Kv2TC_4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
