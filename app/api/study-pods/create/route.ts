import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { CreatePodRequest } from '@/types/study-pods';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/create
 * Create a new study pod
 */
export async function POST(request: Request) {
  try {
    console.log('=== Study Pod Creation Started ===');
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const body: CreatePodRequest = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Pod name must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!body.subject || body.subject.trim().length < 2) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!body.skill_level) {
      return NextResponse.json(
        { error: 'Skill level is required' },
        { status: 400 }
      );
    }

    // Validate max_members
    const maxMembers = body.max_members || 6;
    if (maxMembers < 2 || maxMembers > 20) {
      return NextResponse.json(
        { error: 'Max members must be between 2 and 20' },
        { status: 400 }
      );
    }

    // Create the study pod
    console.log('Creating study pod with data:', {
      created_by: user.id,
      name: body.name.trim(),
      subject: body.subject.trim(),
      skill_level: body.skill_level,
      max_members: maxMembers,
    });

    const { data: pod, error: podError } = await supabase
      .from('study_pods')
      .insert({
        created_by: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        subject: body.subject.trim(),
        skill_level: body.skill_level,
        max_members: maxMembers,
        is_public: body.is_public !== false, // Default to true
        requires_approval: body.requires_approval || false,
        meeting_schedule: body.meeting_schedule || [],
        topics: body.topics || [],
        goals: body.goals?.trim() || null,
        thumbnail_url: body.thumbnail_url || null,
        color_scheme: body.color_scheme || 'from-green-500 to-emerald-500',
        target_problems_count: body.target_problems_count || 0,
        status: 'active',
      })
      .select()
      .single();

    if (podError) {
      console.error('Error creating study pod:', podError);
      return NextResponse.json(
        { error: 'Failed to create study pod', details: podError.message, code: podError.code },
        { status: 500 }
      );
    }

    console.log('Study pod created successfully:', pod.id);

    // Add creator as first member with owner role
    const { error: memberError } = await supabase
      .from('study_pod_members')
      .insert({
        pod_id: pod.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Rollback: delete the pod
      await supabase.from('study_pods').delete().eq('id', pod.id);
      return NextResponse.json(
        { error: 'Failed to initialize study pod', details: memberError.message, code: memberError.code },
        { status: 500 }
      );
    }

    // Create initial activity
    await supabase.from('study_pod_activities').insert({
      pod_id: pod.id,
      user_id: user.id,
      activity_type: 'announcement',
      title: 'Study pod created',
      description: `${body.name} was created`,
      metadata: { pod_name: body.name },
    });

    // Create group chat for the study pod
    console.log('Creating group chat for study pod:', pod.id);
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        name: `${body.name.trim()} - Study Pod Chat`,
        type: 'group',
        created_by: user.id,
        metadata: {
          study_pod_id: pod.id,
          pod_name: body.name.trim(),
        }
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating group chat:', conversationError);
      // Don't fail the entire pod creation, just log the error
    } else {
      console.log('Group chat created:', conversation.id);

      // Add creator as participant
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'owner',
          added_by: user.id,
          status: 'active',
        });

      if (participantError) {
        console.error('Error adding creator to group chat:', participantError);
      } else {
        // Link the conversation to the study pod
        const { error: updatePodError } = await supabase
          .from('study_pods')
          .update({ group_chat_id: conversation.id })
          .eq('id', pod.id);

        if (updatePodError) {
          console.error('Error linking group chat to pod:', updatePodError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      pod,
      message: 'Study pod created successfully',
    });
  } catch (error) {
    console.error('Unexpected error creating study pod:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
