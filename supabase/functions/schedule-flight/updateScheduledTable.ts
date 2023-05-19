import { corsHeaders } from '../_shared/cors.ts';
import {
    createClient,
    SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

export async function updateScheduledTable(
    response: Response,
    supabaseClient: SupabaseClient,
    scheduledFlight: any
) {
    // if the flight is not found, update the schedule_lookup table with the lookup results and status
    if (response.status >= 400 && response.status < 500) {
        try {
            const { data: updateResults, error: updateError } =
                await supabaseClient
                    .from('schedule_lookup')
                    .update({
                        lookup_complete: true,
                        lookup_flight_id: null,
                        lookup_status_code: 404,
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
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/plain',
                },
                status: 500,
            });
        }
    }
}
