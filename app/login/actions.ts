'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

/**
 * Get the base URL dynamically
 */
async function getURL() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  return `${protocol}://${host}`
}

/**
 * Function to handle user login
 * @param formData - FormData from login form
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error)
    redirect(`/login?error=${encodeURIComponent(error.message || 'Login failed. Please check your credentials.')}`)
  }

  revalidatePath('/', 'layout')

  // Decide destination based on onboarding flags
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('federal_school_code, questionnaire_completed')
    .eq('user_id', user.id)
    .single()

  // Always redirect to dashboard - modals will handle onboarding/questionnaire
  redirect('/dashboard')
}

/**
 * Function to handle user signup
 * @param formData - FormData from signup form
 */
export async function signup(formData: FormData) {
  console.log('=== SIGNUP ACTION START ===')
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm-password') as string
  const fullName = formData.get('full_name') as string
  const username = formData.get('username') as string

  console.log('Signup data:', { email, fullName, username, hasPassword: !!password })

  // Validate inputs
  if (!email || !password || !fullName || !username) {
    console.error('Missing required fields')
    redirect(`/signup?error=${encodeURIComponent('All fields are required')}`)
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
  if (!usernameRegex.test(username)) {
    console.error('Invalid username format')
    redirect(`/signup?error=${encodeURIComponent('Username must be 3-20 characters and can only contain letters, numbers, underscores and hyphens')}`)
  }

  // Check if username is already taken
  const { data: existingUser } = await supabase
    .from('users')
    .select('username')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (existingUser) {
    console.error('Username already taken')
    redirect(`/signup?error=${encodeURIComponent('Username is already taken. Please choose another one.')}`)
  }

  if (password !== confirmPassword) {
    console.error('Passwords do not match')
    redirect(`/signup?error=${encodeURIComponent('Passwords do not match')}`)
  }

  if (password.length < 6) {
    console.error('Password too short (minimum 6 characters)')
    redirect(`/signup?error=${encodeURIComponent('Password must be at least 6 characters long')}`)
  }

  const data = {
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username.toLowerCase(),
      }
    }
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(data)

  if (signUpError) {
    console.error('Signup error:', signUpError)
    
    // Handle specific error cases with better messages
    if (signUpError.message?.includes('already registered')) {
      redirect(`/signup?error=${encodeURIComponent('Email is already registered. Please login instead.')}`)
    }
    
    // If there's a database trigger error, the user might still be created in auth.users
    // Let's check and handle it manually
    if (signUpError.message?.includes('Database error')) {
      console.log('Database trigger error detected, checking if user was created...')
      
      // Wait a moment for auth to process
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Try to sign in to see if the user exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (!signInError && signInData.user) {
        console.log('User exists in auth.users, creating profile manually...')

        // Create the profile manually in unified users table
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            user_id: signInData.user.id,
            full_name: fullName,
            username: username.toLowerCase(),
            email: email,
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })

        if (profileError && profileError.code !== '23505') {
          console.error('Profile creation error:', profileError)
        } else {
          console.log('Profile created successfully via manual insertion')
          revalidatePath('/', 'layout')
          redirect('/onboarding')
        }
      }
    }
    
    redirect(`/signup?error=${encodeURIComponent(signUpError.message || 'Signup failed. Please try again.')}`)
  }

  console.log('Signup successful:', signUpData.user?.id)

  // Verify the profile was created by the callback
  if (signUpData.user) {
    // Wait a moment for the callback to complete
    await new Promise(resolve => setTimeout(resolve, 300))

    const { data: profile, error: profileCheckError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', signUpData.user.id)
      .maybeSingle()

    if (profileCheckError) {
      console.error('Profile check error:', profileCheckError)
    }

    // If profile doesn't exist, create it manually
    if (!profile) {
      console.log('Profile not found after signup, creating manually...')

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: signUpData.user.id,
          full_name: fullName,
          username: username.toLowerCase(),
          email: email,
        })

      if (profileError && profileError.code !== '23505') {
        console.error('Manual profile creation error:', profileError)
        // Continue anyway - the callback will handle it
      } else {
        console.log('Manual profile creation successful')
      }
    } else {
      console.log('Profile exists, all good!')
    }
  }

  revalidatePath('/', 'layout')
  console.log('=== SIGNUP ACTION END ===')
  redirect('/onboarding')
}

/**
 * Function to handle GitHub OAuth login
 */
export async function signInWithGithub() {
  console.log('=== GITHUB OAUTH START ===')
  const supabase = await createClient()
  const redirectTo = await getURL()
  
  console.log('GitHub redirect URL:', `${redirectTo}/auth/callback`)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${redirectTo}/auth/callback`
    }
  })

  if (error) {
    console.error('GitHub OAuth error:', error)
    redirect('/error')
  }

  if (data.url) {
    console.log('Redirecting to GitHub...')
    redirect(data.url)
  }
}

/**
 * Function to handle Google OAuth login
 */
export async function signInWithGoogle() {
  console.log('=== GOOGLE OAUTH START ===')
  const supabase = await createClient()
  const redirectTo = await getURL()
  
  console.log('Google redirect URL:', `${redirectTo}/auth/callback`)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${redirectTo}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })

  if (error) {
    console.error('Google OAuth error:', error)
    redirect('/error')
  }

  if (data.url) {
    console.log('Redirecting to Google...')
    redirect(data.url)
  }
}
