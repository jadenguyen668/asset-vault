import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/admin-login
 * Validates root admin credentials from env vars.
 * On success, creates (or fetches) the admin user in Supabase using
 * the service role key, signs them in, and returns the session.
 */
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envUsername || !envPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured on server' },
        { status: 500 }
      );
    }

    // Validate credentials against env
    if (username !== envUsername || password !== envPassword) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Use service role to manage the admin user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // The admin email is deterministic based on the username
    const adminEmail = `${envUsername}@admin.liveasset.local`;

    // Try to find existing admin user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(
      (u) => u.email === adminEmail
    );

    let userId: string;

    if (existingAdmin) {
      userId = existingAdmin.id;
      // Update password in case it changed in env
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: envPassword,
      });
    } else {
      // Create the admin user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: envPassword,
          email_confirm: true, // auto-confirm
          user_metadata: { is_root_admin: true },
        });

      if (createError || !newUser.user) {
        return NextResponse.json(
          { error: createError?.message || 'Failed to create admin user' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // Ensure profile has admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile) {
      // Insert profile if trigger didn't fire (e.g., user already existed)
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: adminEmail,
        display_name: 'Admin',
        role: 'admin',
      });
    } else if (profile.role !== 'admin') {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);
    }

    // Generate a session token for the admin user
    // We use signInWithPassword via a separate anon client
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: signInData, error: signInError } =
      await supabaseAnon.auth.signInWithPassword({
        email: adminEmail,
        password: envPassword,
      });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: signInError?.message || 'Failed to create admin session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
