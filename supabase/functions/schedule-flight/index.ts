import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';
import { getWeatherForecast } from './getForecast.ts';
import { updateScheduledTable } from './updateScheduledTable.ts';

console.log(`Function "schedule-flight" up and running!`);

interface FlightRequest {
    depart_date: string;
    flight: {
        ident: string;
        operator: string;
        fa_flight_id: string;
        filed_ete: number;
        scheduled_out: Date;
        scheduled_off: Date;
        scheduled_on: Date;
        status: string;
        estimated_out: Date;
        estimated_off: Date;
        estimated_on: Date;
        actual_off: Date;
        actual_on: Date;
        actual_in: Date;
        route_distance: number;
        diverted: boolean;
        progress_percent: number;
        cancelled: boolean;
        origin: {
            name: string;
            city: string;
            code_iata: string;
            airport_info_url: string;
        };
        destination: {
            name: string;
            city: string;
            code_iata: string;
            airport_info_url: string;
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
    try {
        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        const { data, error } = await supabaseClient
            .from('flights')
            .insert([
                {
                    ident: flightRequest.flight.ident,
                    operator: flightRequest.flight.operator,
                    fa_flight_id: flightRequest.flight.fa_flight_id,
                    filed_ete: flightRequest.flight.filed_ete,
                    scheduled_out: flightRequest.flight.scheduled_out,
                    scheduled_off: flightRequest.flight.scheduled_off,
                    scheduled_on: flightRequest.flight.scheduled_on,
                    status: flightRequest.flight.status,
                    estimated_out: flightRequest.flight.estimated_out,
                    estimated_off: flightRequest.flight.estimated_off,
                    estimated_on: flightRequest.flight.estimated_on,
                    actual_off: flightRequest.flight.actual_off,
                    actual_on: flightRequest.flight.actual_on,
                    actual_in: flightRequest.flight.actual_in,
                    route_distance: flightRequest.flight.route_distance,
                    diverted: flightRequest.flight.diverted,
                    destination_airport_info_url:
                        flightRequest.flight.destination.airport_info_url,
                    progress_percent: flightRequest.flight.progress_percent,
                    cancelled: flightRequest.flight.cancelled,
                    origin_name: flightRequest.flight.origin.name,
                    origin_city: flightRequest.flight.origin.city,
                    origin_code_iata: flightRequest.flight.origin.code_iata,
                    origin_airport_info_url:
                        flightRequest.flight.origin.airport_info_url,
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

        // try to fetch the weather forecast for the destination city on the depart date
        let weatherForecast;
        try {
            weatherForecast = await getWeatherForecast(
                data[0].destination_city,
                data[0].scheduled_off,
                data[0].id,
                data[0].fa_flight_id,
                data[0].aircraft_type,
                data[0].user_id,
                supabaseClient
            );
        } catch (error) {
            console.log('Error fetching weather:', error.message);
            return new Response('Internal server error', {
                headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
                status: 500,
            });
        }
        // check the weather forecast results returned from getWeatherForecast
        // if the weather forecast is not available, log an error
        if (!weatherForecast) {
            console.log('Weather forecast not available');
            return new Response('Internal server error', {
                headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
                status: 500,
            });
        }

        return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error(error);

        // check to see what the error is and return a response with the appropriate status code
        if (error.message.includes('duplicate key value violates unique')) {
            return new Response(
                JSON.stringify({
                    results: [],
                    isScheduled: false,
                    lookupComplete: true,
                    lookupStatus: `Flight ${flightRequest.flight.ident} is already scheduled`,
                }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                    status: 409,
                }
            );
        }

        throw new Error('Failed to schedule flight alerts');
    }
}

async function handleInsertLookupResults(
    scheduledLookupResults: any,
    scheduledFlight: any,
    supabaseClient: SupabaseClient
) {
    console.log(
        `Preparing lookup results for flight ${scheduledFlight.id}. Inserting into database.`
    );
    // Insert the lookup results into the database
    // Return the resultsa and store them in a variable called completedLookupResults
    let completedLookupResults;
    try {
        const { data: lookupInserted, error: errorLookup } =
            await supabaseClient
                .from('flights')
                .insert([
                    {
                        ident: scheduledLookupResults.flights[0]['ident'],
                        operator: scheduledLookupResults.flights[0]['operator'],
                        fa_flight_id:
                            scheduledLookupResults.flights[0]['fa_flight_id'],
                        filed_ete:
                            scheduledLookupResults.flights[0]['filed_ete'],
                        scheduled_out:
                            scheduledLookupResults.flights[0]['scheduled_out'],
                        scheduled_off:
                            scheduledLookupResults.flights[0]['scheduled_off'],
                        scheduled_on:
                            scheduledLookupResults.flights[0]['scheduled_on'],
                        status: scheduledLookupResults.flights[0]['status'],
                        estimated_out:
                            scheduledLookupResults.flights[0]['estimated_out'],
                        estimated_off:
                            scheduledLookupResults.flights[0]['estimated_off'],
                        estimated_on:
                            scheduledLookupResults.flights[0]['estimated_on'],
                        actual_off:
                            scheduledLookupResults.flights[0]['actual_off'],
                        actual_on:
                            scheduledLookupResults.flights[0]['actual_on'],
                        actual_in:
                            scheduledLookupResults.flights[0]['actual_in'],
                        route_distance:
                            scheduledLookupResults.flights[0]['route_distance'],
                        diverted: scheduledLookupResults.flights[0]['diverted'],
                        destination_airport_info_url:
                            scheduledLookupResults.flights[0]['destination'][
                                'airport_info_url'
                            ],
                        progress_percent:
                            scheduledLookupResults.flights[0][
                                'progress_percent'
                            ],
                        cancelled:
                            scheduledLookupResults.flights[0]['cancelled'],
                        origin_name:
                            scheduledLookupResults.flights[0]['origin']['name'],
                        origin_city:
                            scheduledLookupResults.flights[0]['origin']['city'],
                        origin_code_iata:
                            scheduledLookupResults.flights[0]['origin'][
                                'code_iata'
                            ],
                        origin_airport_info_url:
                            scheduledLookupResults.flights[0]['origin'][
                                'airport_info_url'
                            ],
                        destination_name:
                            scheduledLookupResults.flights[0]['destination'][
                                'name'
                            ],
                        destination_city:
                            scheduledLookupResults.flights[0]['destination'][
                                'city'
                            ],
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
        completedLookupResults = lookupInserted;
        if (errorLookup) throw errorLookup;
        console.log(
            `Lookup results inserted successfully for flight ${scheduledFlight.id}.`
        );

        // verify that there are lookupInserted results and that the flight id matches the scheduled flight id

        let weatherForecast;
        try {
            // Get the weather forecast for the flight
            weatherForecast = await getWeatherForecast(
                lookupInserted[0].destination_city,
                lookupInserted[0].scheduled_off,
                lookupInserted[0].id,
                lookupInserted[0].fa_flight_id,
                lookupInserted[0].aircraft_type,
                lookupInserted[0].user_id,
                supabaseClient
            );
        } catch (error) {
            console.error('Error fetching weather forecast:', error.message);
            return new Response('Internal server error', {
                headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
                status: 500,
            });
        }

        // update the schedule_lookup table with the lookup results of the lookup that was just performed
        // include the weather forecast lookup results as well if they exist
        try {
            const { data: updateResults, error: updateError } =
                await supabaseClient
                    .from('schedule_lookup')
                    .update({
                        lookup_complete: true,
                        lookup_flight_id: lookupInserted[0].id,
                        lookup_status_code: 200,
                        lookup_weather_complete: true,
                    })
                    .match({ id: scheduledFlight.id })
                    .select();
            if (updateError) throw updateError;
            console.log(
                'Scheduled lookup table updated successfully with lookup results and status'
            );
        } catch (error) {
            console.error('Error updating scheduled lookup table:', error);
            return new Response('Internal server error', {
                headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
                status: 500,
            });
        }
    } catch (error) {
        console.error('Error inserting lookup results:', error.message);
        return new Response('Internal server error', {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
            status: 500,
        });
    }
}

async function performLookup(
    scheduledToday: any,
    supabaseClient: SupabaseClient
) {
    // Perform the lookup
    // Insert the results into the database
    console.log(`Performing lookup for ${scheduledToday.length} flights...`);
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
                        console.log(
                            `Error performing lookup for ${scheduledFlight.ident}: ${response.status}`
                        );
                        // if the response is not ok, throw an error
                        // update the schedule_lookup table with the lookup results of the lookup that was just performed
                        updateScheduledTable(
                            response,
                            supabaseClient,
                            scheduledFlight
                        );
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

    return new Response(
        JSON.stringify({
            ok: 'Scheduled flight lookup in progress.',
        }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
    );
}

async function handleDatabaseUpdate(
    updatedFlight: any,
    supabaseClient: SupabaseClient
) {
    const { data, error } = await supabaseClient
        .from('flights')
        .update({
            ident: updatedFlight.flights[0]['ident'],
            operator: updatedFlight.flights[0]['operator'],
            fa_flight_id: updatedFlight.flights[0]['fa_flight_id'],
            filed_ete: updatedFlight.flights[0]['filed_ete'],
            scheduled_out: updatedFlight.flights[0]['scheduled_out'],
            scheduled_off: updatedFlight.flights[0]['scheduled_off'],
            scheduled_on: updatedFlight.flights[0]['scheduled_on'],
            status: updatedFlight.flights[0]['status'],
            estimated_out: updatedFlight.flights[0]['estimated_out'],
            estimated_off: updatedFlight.flights[0]['estimated_off'],
            estimated_on: updatedFlight.flights[0]['estimated_on'],
            actual_off: updatedFlight.flights[0]['actual_off'],
            actual_on: updatedFlight.flights[0]['actual_on'],
            actual_in: updatedFlight.flights[0]['actual_in'],
            route_distance: updatedFlight.flights[0]['route_distance'],
            diverted: updatedFlight.flights[0]['diverted'],
            destination_airport_info_url:
                updatedFlight.flights[0]['destination']['airport_info_url'],
            progress_percent: updatedFlight.flights[0]['progress_percent'],
            cancelled: updatedFlight.flights[0]['cancelled'],
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
}

async function updateFlights(data: any[], supabaseClient: SupabaseClient) {
    // Iterate over the array of flights
    // For each flight in the array, parse the fa_flight_id
    // Call the FlightAware API to get the latest flight status for the flight
    // Update the flight in the database with the latest flight status
    // Return the updated flights from the database
    console.log(`Fetching latest flight status...`);
    console.log(`Updating ${data.length} flights...`);
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
                        console.log(`Error updating flight: ${flight.ident}`);
                        throw new Error('Network response was not OK');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log(`Flight updated: ${flight.ident}`);
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
        })
    );

    return new Response(JSON.stringify({ ok: 'Flight updates successful' }), {
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
        // Select all the scheduled flights for today from the database and return them
        const { data, error } = await supabaseClient
            .from('schedule_lookup')
            .select('*')
            .eq('flight_date', new Date().toISOString().split('T')[0])
            .eq('lookup_complete', false);
        if (error) throw error;
        return performLookup(data, supabaseClient);
    } else {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
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
