import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

// Create a function that takes in the destination_city
// and returns the weather forecast for that date and location using the OpenWeather API and the OpenWeather API key stored in Supabase
export async function getWeatherForecast(
    destination_city: string,
    scheduled_departure: Date,
    flight_id: number,
    fa_flight_id: string,
    aircraft_type: string,
    user_id: string,
    supabaseClient: SupabaseClient
) {
    console.log(
        `Fetching weather forecast for the destination: ${destination_city} arriving ${scheduled_departure} via ${flight_id}, onboard a ${aircraft_type}`
    );
    // Get the OpenWeather API key from Supabase ENV
    const weatherKey = Deno.env.get('OPENWEATHER_KEY') ?? '';
    // Get the weather forecast for the destination city on the depart date
    const weatherForecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${destination_city}&appid=${weatherKey}&units=metric`;
    try {
        let forecastFetched: boolean = false; // fetch the weather forecast from the OpenWeather API
        const weatherForecastResponse = await fetch(weatherForecastURL);

        // check for weather forecast response errors and throw an error if they occur
        if (!weatherForecastResponse.ok) {
            // check to see if the weather forecast response is a 404
            if (weatherForecastResponse.status === 404) {
                // if the weather forecast response is a 404, log the error
                console.log(
                    `Weather forecast not available for ${destination_city} on ${scheduled_departure}`
                );
                // update the flight table with the error and weather forecast status code
                // wait 2 seconds before trying to update the flight table
                await new Promise((resolve) => setTimeout(resolve, 2000));
                // try and update the flight table with the error and weather forecast status code
                // if there is an error updating the flight table, log the error
                try {
                    const { data: updateData, error: updateError } =
                        await supabaseClient
                            .from('flights')
                            .update({
                                weather_forecast_fetched: forecastFetched,
                                weather_forecast_status_code:
                                    weatherForecastResponse.status,
                                weather_forecast_error: `Forecast not available for ${destination_city} on ${scheduled_departure}`,
                            })
                            .eq('id', flight_id)
                            .select();
                    if (updateError) throw updateError;

                    return new Response('Weather forecast not available', {
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'text/plain',
                        },
                        status: 500,
                    });
                } catch (error) {
                    console.error(
                        'Error updating flight table:',
                        error.message
                    );
                    return new Response(error.message, {
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'text/plain',
                        },
                        status: 500,
                    });
                }
            }

            // if the weather forecast response is not a 404, throw an error

            const error = new Error(
                `Weather API returned ${weatherForecastResponse.status} ${weatherForecastResponse.statusText}`
            );
            console.error('Error fetching weather forecast:', error);
            // wait 2 seconds before trying to update the flight table
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // try and update the flight table with the error and weather forecast status code
            // if there is an error updating the flight table, log the error
            try {
                const { data: updateData, error: updateError } =
                    await supabaseClient
                        .from('flights')
                        .update({
                            weather_forecast_fetched: forecastFetched,
                            weather_forecast_status_code:
                                weatherForecastResponse.status,
                            weather_forecast_error: error.message,
                        })
                        .eq('id', flight_id)
                        .select();
                if (updateError) throw updateError;

                return new Response('Error fetching weather forecast', {
                    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
                    status: 500,
                });
            } catch (error) {
                console.error('Error updating flight table:', error.message);
            }
        }
        // if the weather forecast was fetched successfully, parse the response
        console.log(
            `Weather forecast for ${destination_city} fetched successfully with status ${weatherForecastResponse.status}.`
        );
        const weatherForecast = await weatherForecastResponse.json();
        forecastFetched = true;
        // format the scheduled_departure date to match the weatherForecast.dt_txt
        const scheduled_departure_date = new Date(scheduled_departure)
            .toISOString()
            .split('T')[0];

        // find the weather forecast for the scheduled_departure date
        const weather = weatherForecast.list.find((forecast: any) =>
            forecast.dt_txt.startsWith(scheduled_departure_date)
        );

        if (forecastFetched) {
            // try to insert the weather forecast into the database
            console.log('Preparing weather forecast data for insert');
            try {
                const { data: weatherForecastData, error: insertError } =
                    await supabaseClient
                        .from('forecasts')
                        .insert([
                            {
                                flight_id: flight_id,
                                fa_flight_id: fa_flight_id,
                                destination_city: destination_city,
                                forecast_city: weatherForecast.city.name,
                                coord_lon: weatherForecast.city.coord.lon,
                                coord_lat: weatherForecast.city.coord.lat,
                                sunrise: weatherForecast.city.sunrise,
                                sunset: weatherForecast.city.sunset,
                                country: weatherForecast.city.country,
                                scheduled_departure: scheduled_departure,
                                weather: JSON.stringify(weather),
                                user_id: user_id,
                            },
                        ])
                        .select();
                if (insertError) throw insertError;
                console.log('Weather forecast inserted successfully');
                forecastFetched = true;
                // wait for the weather forecast to be inserted and then wait 2 seconds before updating the flight table
                await new Promise((r) => setTimeout(r, 2000));
                // try to update the flight table with the weather forecast id and status

                try {
                    console.log(
                        `Updating flight table with weather forecast id and status for flight ${weatherForecastData[0].flight_id}`
                    );
                    const { data: updateData, error: updateError } =
                        await supabaseClient
                            .from('flights')
                            .update({
                                weather_forecast_id: weatherForecastData[0].id,
                                weather_forecast_fetched: forecastFetched,
                                weather_forecast_status_code: 200,
                            })
                            .eq('id', flight_id)
                            .select();
                    if (updateError) throw updateError;
                    console.log(
                        'Flight table updated successfully with weather forecast id and status'
                    );
                } catch (error) {
                    console.error(
                        'Error updating flight table:',
                        error.message
                    );
                }
            } catch (error) {
                console.log('Error inserting weather forecast:', error.message);
                return new Response('Internal server error', {
                    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
                    status: 500,
                });
            }
        }

        return { forecastFetched, weather };
    } catch (error) {
        console.log('error fetching weather:', error);
        console.error(error.message);
        return new Response('Internal server error', {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
            status: 500,
        });
    }
}
