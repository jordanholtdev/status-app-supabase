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
        ident: string;
        fa_flight_id: string;
        filed_ete: number;
        scheduled_out: Date;
        scheduled_off: Date;
        scheduled_on: Date;
        origin: {
            name: string;
            city: string;
            code_iata: string;
        };
        destination: {
            name: string;
            city: string;
            code_iata: string;
        };
        aircraft_type: string;
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
        .from('flights')
        .insert([
            {
                ident: flightRequest.flight.ident,
                fa_flight_id: flightRequest.flight.fa_flight_id,
                filed_ete: flightRequest.flight.filed_ete,
                scheduled_out: flightRequest.flight.scheduled_out,
                scheduled_off: flightRequest.flight.scheduled_off,
                scheduled_on: flightRequest.flight.scheduled_on,
                origin_name: flightRequest.flight.origin.name,
                origin_city: flightRequest.flight.origin.city,
                origin_code_iata: flightRequest.flight.origin.code_iata,
                destination_name: flightRequest.flight.destination.name,
                destination_city: flightRequest.flight.destination.city,
                destination_code_iata:
                    flightRequest.flight.destination.code_iata,
                aircraft_type: flightRequest.flight.aircraft_type,
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

async function handleInsertLookupResults(
    scheduledLookupResults: any,
    scheduledFlight: any,
    supabaseClient: SupabaseClient
) {
    // Insert the lookup results into the database
    // Return the results
    console.log(
        'scheduledLookupResults',
        scheduledLookupResults.flights[0]['ident']
    );
    console.log('scheduledFlight', scheduledFlight.user_id);
    const { data, error } = await supabaseClient
        .from('flights')
        .insert([
            {
                ident: scheduledLookupResults.flights[0]['ident'],
                fa_flight_id: scheduledLookupResults.flights[0]['fa_flight_id'],
                filed_ete: scheduledLookupResults.flights[0]['filed_ete'],
                scheduled_out:
                    scheduledLookupResults.flights[0]['scheduled_out'],
                scheduled_off:
                    scheduledLookupResults.flights[0]['scheduled_off'],
                scheduled_on: scheduledLookupResults.flights[0]['scheduled_on'],
                origin_name:
                    scheduledLookupResults.flights[0]['origin']['name'],
                origin_city:
                    scheduledLookupResults.flights[0]['origin']['city'],
                origin_code_iata:
                    scheduledLookupResults.flights[0]['origin']['code_iata'],
                destination_name:
                    scheduledLookupResults.flights[0]['destination']['name'],
                destination_city:
                    scheduledLookupResults.flights[0]['destination']['city'],
                destination_code_iata:
                    scheduledLookupResults.flights[0]['destination'][
                        'code_iata'
                    ],
                aircraft_type:
                    scheduledLookupResults.flights[0]['aircraft_type'],
                user_id: scheduledFlight.user_id,
            },
        ])
        .select();
    if (error) throw error;

    const { data: scheduledToday, error: error2 } = await supabaseClient
        .from('schedule_lookup')
        .update({ lookup_complete: true })
        .eq('id', scheduledFlight.id)
        .select();
    if (error2) throw error2;

    console.log('data:', data, 'lookup complete:', scheduledToday);
}

async function performLookup(
    scheduledToday: any,
    supabaseClient: SupabaseClient
) {
    // Perform the lookup
    // Return the results
    console.log('scheduled', scheduledToday);
    const lookupResults = Promise.all(
        scheduledToday.map(async (scheduledFlight: any) => {
            fetch(
                `https://aeroapi.flightaware.com/aeroapi/flights/${scheduledFlight.ident}?start=${scheduledFlight.flight_date}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'x-apikey': Deno.env.get('FLIGHTAWARE_KEY') ?? '',
                    },
                }
            )
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not OK');
                    }
                    return response.json();
                })
                .then((data) => {
                    handleInsertLookupResults(
                        data,
                        scheduledFlight,
                        supabaseClient
                    );
                })
                .catch((error) => {
                    return new Response(
                        JSON.stringify({ error: error.message }),
                        {
                            headers: {
                                ...corsHeaders,
                                'Content-Type': 'application/json',
                            },
                            status: 502,
                        }
                    );
                });
        })
    );

    return new Response(JSON.stringify({ ok: 'perform lookup' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

async function handleDatabaseUpdate(
    updatedFlight: any,
    supabaseClient: SupabaseClient
) {
    console.log('updated flight', updatedFlight.flights[0]['ident']);

    const { data, error } = await supabaseClient
        .from('flights')
        .update({
            ident: updatedFlight.flights[0]['ident'],
            fa_flight_id: updatedFlight.flights[0]['fa_flight_id'],
            filed_ete: updatedFlight.flights[0]['filed_ete'],
            scheduled_out: updatedFlight.flights[0]['scheduled_out'],
            scheduled_off: updatedFlight.flights[0]['scheduled_off'],
            scheduled_on: updatedFlight.flights[0]['scheduled_on'],
            origin_name: updatedFlight.flights[0]['origin.name'],
            origin_city: updatedFlight.flights[0]['origin.city'],
            origin_code_iata: updatedFlight.flights[0]['origin.code_iata'],
            destination_name: updatedFlight.flights[0]['destination.name'],
            destination_city: updatedFlight.flights[0]['destination.city'],
            destination_code_iata:
                updatedFlight.flights[0]['destination.code_iata'],
            aircraft_type: updatedFlight.flights[0]['aircraft_type'],
        })
        .eq('fa_flight_id', updatedFlight.flights[0]['fa_flight_id'])
        .select();
    if (error) throw error;

    console.log('inserted', data);
}

async function updateFlights(data: any[], supabaseClient: SupabaseClient) {
    // Iterate over the array of flights
    // For each flight in the array, parse the fa_flight_id
    // Call the FlightAware API to get the latest flight status for the flight
    // Update the flight in the database with the latest flight status
    // Return the updated flights from the database
    const updatedFlights = Promise.all(
        data.map(async (flight) => {
            fetch(
                `https://aeroapi.flightaware.com/aeroapi/flights/${flight.fa_flight_id}?ident_type=fa_flight_id`,
                {
                    headers: {
                        Accept: 'application/json',
                        'x-apikey': Deno.env.get('FLIGHTAWARE_KEY') ?? '',
                    },
                }
            )
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not OK');
                    }
                    return response.json();
                })
                .then((data) => {
                    handleDatabaseUpdate(data, supabaseClient);
                })
                .catch((error) => {
                    return new Response(
                        JSON.stringify({ error: error.message }),
                        {
                            headers: {
                                ...corsHeaders,
                                'Content-Type': 'application/json',
                            },
                            status: 502,
                        }
                    );
                });
            console.log(flight.fa_flight_id);
        })
    );
    console.log(updatedFlights);

    return new Response(JSON.stringify({ ok: 'update flight ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

async function handleIncomingScheduleCalls(
    supabaseClient: SupabaseClient,
    id: string
) {
    // Determine if the id is "update" or "schedule"
    // If "update" then call the updateFlights function
    // If "schedule" then call the performLookup function
    if (id === 'update') {
        // Select all the flights from the database and return them
        const { data, error } = await supabaseClient
            .from('flights')
            .select('*');
        if (error) throw error;
        return updateFlights(data, supabaseClient);
    } else if (id === 'schedule') {
        console.log(new Date().toISOString().split('T')[0]);
        const { data, error } = await supabaseClient
            .from('schedule_lookup')
            .select('*')
            .eq('flight_date', new Date().toISOString().split('T')[0]);
        if (error) throw error;
        return performLookup(data, supabaseClient);
    } else {
        return new Response(JSON.stringify({ error: 'Invalid ID' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
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

        // Regular expression to match a slash followed by one or more words at the end of the string
        // Match the URL against the regular expression
        // Parse the matched number as an integer
        const regex = /\/(\w+)$/; // Regular expression to match a slash followed by one or more words at the end of the string
        const match = url.match(regex); // Match the URL against the regular expression
        let alertId = match ? '' : null;

        if (match) {
            // Parse the matched word
            alertId = match[1];
        }

        let flight;

        if (method === 'POST' || method === 'PUT') {
            const body = await req.json();
            flight = body;
        }

        // call relevant method based on method and id
        switch (true) {
            case alertId && method === 'POST':
                return handleIncomingScheduleCalls(
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
