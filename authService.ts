import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SignUpInput = {
  username: string;
  displayName: string;
  email: string;
  password: string;
};

function authErrorMessage(error: AuthError) {
  const message = error.message.toLowerCase();
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Un compte existe déjà avec cette adresse e-mail.';
  }
  if (message.includes('invalid login credentials')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (message.includes('duplicate key') || message.includes('profiles_username_key')) {
    return "Ce nom d'utilisateur est déjà pris.";
  }
  if (message.includes('password')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authErrorMessage(error));
}

export async function signUp({ username, displayName, email, password }: SignUpInput) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase(),
        display_name: displayName.trim(),
      },
    },
  });
  if (error) throw new Error(authErrorMessage(error));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('La déconnexion a échoué. Réessayez.');
}
