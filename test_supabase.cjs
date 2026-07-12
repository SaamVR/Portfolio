const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZHFtaHhxdmxwY29nY25rbHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTkzMjksImV4cCI6MjA5ODQ5NTMyOX0.x6mt7wwijHZGKOmac0JqqliNptx0nbnJGlqDS5sME_4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const uuid = 'b8bb89df-155e-4cf0-a92c-5591ed5f4d1e'; // fake UUID
  const res = await supabase.from('stores').update({ name: 'test' }).eq('id', uuid);
  console.log('Update stores:', res.error ? res.error : res.data);
  const res2 = await supabase.from('store_themes').upsert({ store_id: uuid, preset_id: 'default' }, { onConflict: 'store_id' });
  console.log('Upsert store_themes:', res2.error ? res2.error : res2.data);
  const res3 = await supabase.from('store_page_blocks').delete().eq('store_id', uuid);
  console.log('Delete store_page_blocks:', res3.error ? res3.error : res3.data);
  const res4 = await supabase.from('store_pages').delete().eq('store_id', uuid);
  console.log('Delete store_pages:', res4.error ? res4.error : res4.data);
  const res5 = await supabase.from('store_pages').insert([{ store_id: uuid, slug: 'test', title: 'test', id: uuid }]);
  console.log('Insert store_pages:', res5.error ? res5.error : res5.data);
}
run();
