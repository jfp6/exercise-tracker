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
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
    // Parse request body
    const { name, notes, exercises } = JSON.parse(event.body || '{}')

    // Validate required fields
    if (!name || !name.trim()) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Workout name is required' })
      }
    }

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'At least one exercise is required' })
      }
    }

    console.log(`Creating workout: ${name} with ${exercises.length} exercises`)

    // Create the workout record
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert([{
        name: name.trim(),
        notes: notes?.trim() || null,
        date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
      }])
      .select()
      .single()

    if (workoutError) {
      console.error('Error creating workout:', workoutError)
      throw workoutError
    }

    console.log('Workout created successfully:', workout.id)

    // Add exercises to the workout
    const workoutExercises = exercises.map(exercise => ({
      workout_id: workout.id,
      exercise_id: exercise.exercise_id,
      sets: exercise.sets || 1,
      reps: exercise.reps || 0,
      weight: exercise.weight || 0,
      rest_seconds: exercise.rest_seconds || null,
      notes: exercise.notes || null
    }))

    const { data: workoutExercisesData, error: exercisesError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises)
      .select()

    if (exercisesError) {
      console.error('Error adding exercises to workout:', exercisesError)
      // Try to clean up the workout if exercise insertion fails
      await supabase.from('workouts').delete().eq('id', workout.id)
      throw exercisesError
    }

    console.log(`Successfully added ${workoutExercisesData.length} exercises to workout`)

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        ...workout,
        exercises: workoutExercisesData
      })
    }

  } catch (error) {
    console.error('Error creating workout:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to create workout',
        details: error.message
      })
    }
  }
}
