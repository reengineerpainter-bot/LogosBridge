/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nnqtssberaxgblsgzyjw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucXRzc2JlcmF4Z2Jsc2d6eWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTM5NTEsImV4cCI6MjEwNzYyOTk1MX0.Hpvokzr0oxU9liwQG3pJcl5fvb-fnpq_QeUf-BfZ2c8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
