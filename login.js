// login.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua pelos seus dados reais
const supabaseUrl = 'https://zjjvzouaalphxenypomp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanZ6b3VhYWxwaHhlbnlwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDU0MzMsImV4cCI6MjA2MTEyMTQzM30.V846ghEfXW7D1DegBovnzW7i8T27gdzmygWXOiS7SxQ'; // Coloque sua chave aqui com segurança
const supabase = createClient(supabaseUrl, supabaseKey);

// Função de login
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Erro no login:', error);
    throw error;
  }

  console.log('Login bem-sucedido:', data);
  return data;
}

export {supabase};