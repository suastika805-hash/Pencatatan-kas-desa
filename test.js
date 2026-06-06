const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qbyfypinitcsveyounif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieWZ5cGluaXRjc3ZleW91bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDMxODgsImV4cCI6MjA5NDExOTE4OH0.8WLWrZ6GJdE9DnrcVGL13psfouQ2lI-Nwb5CfhuAHdk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('expenses').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log('EXPENSES:');
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
