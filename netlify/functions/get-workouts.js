import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    console.log('Fetching recent workouts from Supabase...')

    // Get recent workouts (last 10)
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError)
      throw workoutsError
    }

    // If no workouts found, return empty array
    if (!workouts || workouts.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify([])
      }
    }

    console.log(`Found ${workouts.length} workouts`)

    // Get exercise details for each workout
    const workoutsWithExercises = await Promise.all(
      workouts.map(async (workout) => {
        const { data: workoutExercises, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select(`
            *,
            exercises (
              name,
              category
            )
          `)
          .eq('workout_id', workout.id)
          .order('created_at')

        if (exercisesError) {
          console.error(`Error fetching exercises for workout ${workout.id}:`, exercisesError)
          // Don't fail the whole request, just return workout without exercises
          return {
            ...workout,
            exercises: []
          }
        }

        // Format exercise data for display
        const exercises = workoutExercises.map(we => ({
          exercise_name: we.exercises?.name || 'Unknown Exercise',
          category: we.exercises?.category || 'Unknown',
          sets: we.sets,
          reps: we.reps,
          weight: we.weight,
          rest_seconds: we.rest_seconds,
          notes: we.notes
        }))

        return {
          ...workout,
          exercises
        }
      })
    )

    console.log('Successfully fetched workouts with exercises')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify(workoutsWithExercises)
    }

  } catch (error) {
    console.error('Error fetching workouts:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to fetch workouts',
        details: error.message
      })
    }
  }
}
