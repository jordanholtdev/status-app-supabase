import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Task {
    ident: string;
    user_id: number;
}

async function createTask(supabaseClient: SupabaseClient, task: Task) {
    const { error } = await supabaseClient.from('testing_flights').insert(task);
    if (error) throw error;

    return new Response(JSON.stringify({ task }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

serve(async (req) => {
    const { url, method } = req;

    // This is needed if you're planning to invoke your function from a browser.
    if (method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create a Supabase client with the Auth context of the logged in user.
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            // Create client with Auth context of the user that called the function.
            // This way your row-level-security (RLS) policies are applied.
            {
                global: {
                    headers: {
                        Authorization: req.headers.get('Authorization')!,
                    },
                },
            }
        );

        // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
        const taskPattern = new URLPattern({ pathname: '/restful-tasks/:id' });
        const matchingPath = taskPattern.exec(url);
        const id = matchingPath ? matchingPath.pathname.groups.id : null;

        let task = null;
        if (method === 'POST' || method === 'PUT') {
            const body = await req.json();
            task = body.task;
        }

        // call relevant method based on method and id
        switch (true) {
            case id && method === 'GET':
                return getTask(supabaseClient, id as string);
            case id && method === 'PUT':
                return updateTask(supabaseClient, id as string, task);
            case id && method === 'DELETE':
                return deleteTask(supabaseClient, id as string);
            case method === 'POST':
                return createTask(supabaseClient, task);
            case method === 'GET':
                return getAllTasks(supabaseClient);
            default:
                return getAllTasks(supabaseClient);
        }
    } catch (error) {
        console.error(error);

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
