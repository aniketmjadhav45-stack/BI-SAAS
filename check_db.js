import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('data_sources').select('*').order('created_at', { ascending: false }).limit(1);
  if (error) console.error(error);
  else {
     console.log("dataSources length:", data.length);
     if (data.length > 0) {
        console.log("typeof parsed_data:", typeof data[0].parsed_data);
        console.log("Is array?", Array.isArray(data[0].parsed_data));
        console.log("Length:", data[0].parsed_data?.length);
        console.log("First element:", data[0].parsed_data?.[0]);
     }
  }
}
check();
