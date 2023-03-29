import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function "flight-service" up and running!`);

interface Flight {
    ident: string;
    depart_date: string;
}

// function validates user input
// if flight departure date > 48 hours, schedule flight
// if flight departure date < 48, results are returned

async function createFlight(supabaseClient: SupabaseClient, task: Flight) {
    // TODO validate user input flight

    const response = await fetch(
        `https://api.datamuse.com/words?rel_rhy=${task.ident}`
    );
    const text = await response.text();
    const results = await JSON.parse(text);

    return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
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
        // Now we can get the session or user object
        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        const body = await req.json();

        return createFlight(supabaseClient, body);
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
