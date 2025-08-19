class ExerciseApp {
    constructor() {
        this.exercises = [];
        this.filteredExercises = [];
        this.selectedExercises = [];
        this.recentWorkouts = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadExercises();
        await this.loadRecentWorkouts();
    }

    // Load exercises from API
    async loadExercises() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        
        try {
            loadingEl.style.display = 'block';
            const response = await fetch('/api/get-exercises');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.exercises = await response.json();
            this.filteredExercises = [...this.exercises];
            this.renderExercises();
            loadingEl.style.display = 'none';
        } catch (error) {
            console.error('Error loading exercises:', error);
            loadingEl.style.display = 'none';
            errorEl.textContent = 'Failed to load exercises. Please check your connection.';
            errorEl.style.display = 'block';
        }
    }

    // Load recent workouts
    async loadRecentWorkouts() {
        try {
            const response = await fetch('/api/get-workouts');
            if (response.ok) {
                this.recentWorkouts = await response.json();
                this.renderWorkouts();
            }
        } catch (error) {
            console.error('Error loading workouts:', error);
        }
    }

    // Set up event listeners
    setupEventListeners() {
        // Workout form submission
        document.getElementById('workout-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createWorkout();
        });

        // Exercise search
        document.getElementById('exercise-search').addEventListener('input', (e) => {
            this.filterExercises();
        });

        // Category filter
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterExercises();
        });
    }

    // Filter exercises based on search and category
    filterExercises() {
        const searchTerm = document.getElementById('exercise-search').value.toLowerCase();
        const selectedCategory = document.getElementById('category-filter').value;

        this.filteredExercises = this.exercises.filter(exercise => {
            const matchesSearch = exercise.name.toLowerCase().includes(searchTerm) ||
                                (exercise.description && exercise.description.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });

        this.renderExercises();
    }

    // Render exercises grid
    renderExercises() {
        const container = document.getElementById('exercises-list');
        
        if (this.filteredExercises.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">No exercises found matching your criteria.</p>';
            return;
        }

        container.innerHTML = this.filteredExercises.map(exercise => {
            const isSelected = this.selectedExercises.some(se => se.exercise_id === exercise.id);
            const muscleGroups = Array.isArray(exercise.muscle_groups) ? 
                exercise.muscle_groups.join(', ') : exercise.muscle_groups || '';

            return `
                <div class="exercise-card">
                    <div class="category">${exercise.category || 'General'}</div>
                    <h3>${exercise.name}</h3>
                    ${muscleGroups ? `<div class="muscle-groups">Target: ${muscleGroups}</div>` : ''}
                    ${exercise.description ? `<div class="description">${exercise.description}</div>` : ''}
                    ${exercise.equipment ? `<div class="muscle-groups">Equipment: ${exercise.equipment}</div>` : ''}
                    <button onclick="app.addToWorkout(${exercise.id})" ${isSelected ? 'disabled' : ''}>
                        ${isSelected ? 'Added ✓' : 'Add to Workout'}
                    </button>
                </div>
            `;
        }).join('');
    }

    // Add exercise to workout
    addToWorkout(exerciseId) {
        const exercise = this.exercises.find(e => e.id === exerciseId);
        if (!exercise || this.selectedExercises.some(se => se.exercise_id === exerciseId)) {
            return;
        }

        this.selectedExercises.push({
            exercise_id: exerciseId,
            name: exercise.name,
            sets: 3,
            reps: 10,
            weight: 0,
            rest_seconds: 60
        });

        this.renderSelectedExercises();
        this.updateCreateButton();
        this.renderExercises(); // Re-render to update button states
    }

    // Remove exercise from workout
    removeFromWorkout(index) {
        this.selectedExercises.splice(index, 1);
        this.renderSelectedExercises();
        this.updateCreateButton();
        this.renderExercises(); // Re-render to update button states
    }

    // Update exercise parameters
    updateExercise(index, field, value) {
        if (field === 'sets' || field === 'reps' || field === 'rest_seconds') {
            this.selectedExercises[index][field] = parseInt(value) || 0;
        } else if (field === 'weight') {
            this.selectedExercises[index][field] = parseFloat(value) || 0;
        }
    }

    // Render selected exercises
    renderSelectedExercises() {
        const container = document.getElementById('selected-exercises');
        const placeholder = container.querySelector('.placeholder');

        if (this.selectedExercises.length === 0) {
            if (placeholder) placeholder.style.display = 'block';
            const existingExercises = container.querySelectorAll('.selected-exercise');
            existingExercises.forEach(el => el.remove());
            return;
        }

        if (placeholder) placeholder.style.display = 'none';

        // Remove existing exercise elements
        const existingExercises = container.querySelectorAll('.selected-exercise');
        existingExercises.forEach(el => el.remove());

        // Add new exercise elements
        this.selectedExercises.forEach((exercise, index) => {
            const exerciseEl = document.createElement('div');
            exerciseEl.className = 'selected-exercise';
            exerciseEl.innerHTML = `
                <h4>${exercise.name}</h4>
                <div class="exercise-inputs">
                    <div>
                        <label>Sets</label>
                        <input type="number" min="1" max="20" value="${exercise.sets}" 
                               onchange="app.updateExercise(${index}, 'sets', this.value)">
                    </div>
                    <div>
                        <label>Reps</label>
                        <input type="number" min="1" max="100" value="${exercise.reps}" 
                               onchange="app.updateExercise(${index}, 'reps', this.value)">
                    </div>
                    <div>
                        <label>Weight (lbs)</label>
                        <input type="number" min="0" max="1000" step="0.5" value="${exercise.weight}" 
                               onchange="app.updateExercise(${index}, 'weight', this.value)">
                    </div>
                    <div>
                        <label>Rest (sec)</label>
                        <input type="number" min="0" max="600" step="15" value="${exercise.rest_seconds}" 
                               onchange="app.updateExercise(${index}, 'rest_seconds', this.value)">
                    </div>
                </div>
                <button class="remove-btn" onclick="app.removeFromWorkout(${index})">Remove</button>
            `;
            container.appendChild(exerciseEl);
        });
    }

    // Update create workout button state
    updateCreateButton() {
        const button = document.getElementById('create-workout-btn');
        const workoutName = document.getElementById('workout-name').value.trim();
        
        button.disabled = !workoutName || this.selectedExercises.length === 0;
    }

    // Create workout
    async createWorkout() {
        const name = document.getElementById('workout-name').value.trim();
        const notes = document.getElementById('workout-notes').value.trim();
        const button = document.getElementById('create-workout-btn');

        if (!name || this.selectedExercises.length === 0) {
            alert('Please enter a workout name and add at least one exercise');
            return;
        }

        try {
            button.disabled = true;
            button.textContent = 'Creating...';

            const response = await fetch('/api/create-workout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    notes: notes || null,
                    exercises: this.selectedExercises
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Reset form
            document.getElementById('workout-form').reset();
            this.selectedExercises = [];
            this.renderSelectedExercises();
            this.updateCreateButton();
            this.renderExercises();

            // Reload recent workouts
            await this.loadRecentWorkouts();

            alert('Workout created successfully! 🎉');
        } catch (error) {
            console.error('Error creating workout:', error);
            alert('Error creating workout. Please try again.');
        } finally {
            button.disabled = false;
            button.textContent = 'Create Workout';
        }
    }

    // Render recent workouts
    renderWorkouts() {
        const container = document.getElementById('workouts-list');
        
        if (this.recentWorkouts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">No workouts yet. Create your first workout above!</p>';
            return;
        }

        container.innerHTML = this.recentWorkouts.map(workout => {
            const workoutDate = new Date(workout.date).toLocaleDateString();
            const exerciseCount = workout.exercises ? workout.exercises.length : 0;
            
            return `
                <div class="workout-card">
                    <h3>${workout.name}</h3>
                    <div class="workout-meta">
                        📅 ${workoutDate} • 
                        💪 ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}
                        ${workout.duration_minutes ? ` • ⏱️ ${workout.duration_minutes} min` : ''}
                    </div>
                    ${workout.notes ? `<p><strong>Notes:</strong> ${workout.notes}</p>` : ''}
                    ${workout.exercises && workout.exercises.length > 0 ? `
                        <div class="workout-exercises">
                            ${workout.exercises.map(ex => `
                                <div class="workout-exercise">
                                    <strong>${ex.exercise_name}</strong> - 
                                    ${ex.sets} sets × ${ex.reps} reps
                                    ${ex.weight > 0 ? ` @ ${ex.weight} lbs` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExerciseApp();
    
    // Update create button state when workout name changes
    document.getElementById('workout-name').addEventListener('input', () => {
        window.app.updateCreateButton();
    });
});

// Global reference for onclick handlers
window.app = null;