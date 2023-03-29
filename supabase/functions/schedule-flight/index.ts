import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

console.log(`Function "schedule-flight" up and running!`);

interface FlightRequest {
    depart_date: string;
    flight: {
        numSyllables: number;
        score: number;
        word: string;
    };
}

async function scheduleFlightAlerts(
    // accepts the flght selection & supabase client
    // inserts the selection into the database
    // registers the flight selection to receive alerts
    supabaseClient: SupabaseClient,
    flightRequest: FlightRequest
) {
    // get the user session for row level security RLS
    const {
        data: { user },
    } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
        .from('testing_flights')
        .insert([
            {
                name: flightRequest.flight.word,
                user_id: user?.id,
            },
        ])
        .select();
    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

async function handleIncomingFlightAlerts(
    supabaseClient: SupabaseClient,
    id: string
) {
    // handles the incoming alerts to the registered URL for flight aware alerts
    // accepts an http POST request that matches a specific pattern
    // the alert is then parsed & inserted into the database

    console.log('handleAlert', id);

    return new Response(JSON.stringify({ test: 'alerts get' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

serve(async (req: Request) => {
    // takes in the request
    const { url, method } = req;

    // CORS preflight checklist for browsers
    // this function is invoked from both browser and server
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

        const regex = /\/(\d+)$/; // Regular expression to match a slash followed by one or more digits at the end of the string
        const match = url.match(regex); // Match the URL against the regular expression
        let alertId = match ? '' : null;

        if (match) {
            const number = parseInt(match[1], 10); // Parse the matched number as an integer
            let result = number.toString();
            alertId = result;
        }

        let flight = null;

        if (method === 'POST' || method === 'PUT') {
            const body = await req.json();
            flight = body;
        }

        // call relevant method based on method and id
        switch (true) {
            case alertId && method === 'POST':
                return handleIncomingFlightAlerts(
                    supabaseClient,
                    alertId as string
                );
            case method === 'POST':
                return scheduleFlightAlerts(supabaseClient, flight);
            default:
                return new Response(JSON.stringify({ ok: 'good' }), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                    status: 200,
                });
        }
    } catch (error) {
        console.error(error);

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
