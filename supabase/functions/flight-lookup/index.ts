import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function "flight-lookup" initiating`);

interface Flight {
    ident: string;
    selected_date: string;
}

async function scheduleFlightLookup(
    // accepts the flght selection & supabase client
    // inserts the selection into the database
    // registers the flight selection to receive alerts
    supabaseClient: SupabaseClient,
    flight: Flight
) {
    // get the user session for row level security RLS
    const {
        data: { user },
    } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
        .from('schedule_lookup')
        .insert([
            {
                ident: flight.ident,
                flight_date: flight.selected_date,
                user_id: user?.id,
            },
        ])
        .select();
    if (error) throw error;

    let results = data;

    return new Response(
        JSON.stringify({
            results,
            isScheduled: true,
            lookupComplete: false,
            lookupStatus: 'Scheduled',
        }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
    );
}

async function lookupFlight(supabaseClient: SupabaseClient, flight: Flight) {
    // lookupFlight handles flight lookup requests
    // Performs date check:
    // If date within range lookup executed immediately
    // Future dates scheduled, past dates dropped

    const submittedDate = new Date(flight.selected_date);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10); // limit searches 10 days in the past
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2); // limit searches 2 days in the future

    if (submittedDate > startDate && submittedDate < endDate) {
        // Fetch list if submitted date is within range
        const fetchUrl = `https://aeroapi.flightaware.com/aeroapi/flights/${flight.ident}?start=${flight.selected_date}`;
        const fetchOptions = {
            headers: {
                Accept: 'application/json',
                'x-apikey': Deno.env.get('FLIGHTAWARE_KEY') ?? '',
            },
        };

        try {
            console.log(
                `Fetching data for flight ${flight.ident} on ${submittedDate}...`
            );
            const response = await fetch(fetchUrl, fetchOptions);
            if (!response.ok) {
                if (response.status >= 400 && response.status < 500) {
                    // if the error is a 4xx error, return the response as-is
                    const data = await response.json();
                    return new Response(
                        JSON.stringify({
                            results: [],
                            isScheduled: false,
                            lookupComplete: true,
                            lookupStatus: `Error: ${response.status} ${response.statusText}. ${data.title} - ${data.detail} Please check flight number & try again. `,
                        }),
                        {
                            headers: {
                                ...corsHeaders,
                                'Content-Type': 'application/json',
                            },
                            status: 200,
                        }
                    );
                } else {
                    const errorMessage = `Network response was not OK: ${response.status} ${response.statusText}.`;
                    throw new Error(errorMessage);
                }
            }
            const data = await response.json();

            // check to see if there are any results in the flights array
            if (data.flights.length === 0) {
                return new Response(
                    JSON.stringify({
                        results: [],
                        isScheduled: false,
                        lookupComplete: true,
                        lookupStatus: `No results found for flight: ${flight.ident}. Please check flight number & try again.`,
                    }),
                    {
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                        status: 200,
                    }
                );
            }

            console.log(
                `Data successfully fetched for flight: ${flight.ident}. Date: ${submittedDate}.`
            );
            return new Response(
                JSON.stringify({
                    results: data,
                    isScheduled: false,
                    lookupComplete: true,
                    lookupStatus: 'Complete',
                }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                    status: 200,
                }
            );
        } catch (error) {
            console.error(
                `Error fetching data for flight: ${flight.ident}. Date: ${submittedDate}:`,
                error
            );
            const errorResponse = new Response(
                JSON.stringify({
                    error: error.message,
                }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                    status: 502,
                }
            );
            return errorResponse;
        }
    } else {
        console.log(
            `Search date:${submittedDate} - out of range for immediate lookup.`
        );
        console.log(`Scheduling lookup...`);
        if (submittedDate < new Date()) {
            // Date is too far in the past. Will not be scheduled.
            console.log('Not scheduling: Date too far past');
            return new Response(
                JSON.stringify({
                    results: [],
                    isScheduled: false,
                    lookupComplete: false,
                    lookupStatus:
                        'The submitted flight number has not been scheduled for lookup. The date exceeds the 10 day historical information limit.',
                }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                    status: 200,
                }
            );
        } else {
            // Date is in the future: Schedule a lookup
            // Call the schedule lookup function
            try {
                console.log(`Lookup Scheduled On: ${submittedDate}`);
                return scheduleFlightLookup(supabaseClient, flight);
            } catch {
                return new Response(
                    JSON.stringify({
                        results: [{ msg: 'Scheduled' }],
                        isScheduled: true,
                        lookupComplete: false,
                        lookupStatus: 'Scheduled',
                    }),
                    {
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                        status: 200,
                    }
                );
            }
        }
    }
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

        return lookupFlight(supabaseClient, body);
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
