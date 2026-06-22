import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ktxbagunrxdcvdrhwcjo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0eGJhZ3VucnhkY3Zkcmh3Y2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMTY2NzAsImV4cCI6MjA5NzU5MjY3MH0.-Bfitqs_MZ2LjXlP11f5SOYDGKdPVMqERlE4QF8EWrU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
