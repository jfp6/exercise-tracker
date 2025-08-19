import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export const handler = async (event, context) => {
  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
      }
    }
  }

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
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
    // Extract workout ID from URL path
    const pathParts = event.path.split('/')
    const workoutId = pathParts[pathParts.length - 1]

    if (!workoutId || isNaN(parseInt(workoutId))) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Valid workout ID is required' })
      }
    }

    console.log(`Deleting workout: ${workoutId}`)

    // Delete the workout (CASCADE will automatically delete related workout_exercises)
    const { data, error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', parseInt(workoutId))
      .select()

    if (error) {
      console.error('Error deleting workout:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Workout not found' })
      }
    }

    console.log('Workout deleted successfully')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
      },
      body: JSON.stringify({ 
        message: 'Workout deleted successfully',
        deleted: data[0]
      })
    }

  } catch (error) {
    console.error('Error deleting workout:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to delete workout',
        details: error.message
      })
    }
  }
}