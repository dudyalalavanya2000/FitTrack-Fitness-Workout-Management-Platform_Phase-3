
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas import (
    WorkoutSuggestionRequest,
    WorkoutSuggestionResponse,
    WorkoutSuggestion,
    SuggestedExercise,
)


router = APIRouter()


# Recommendation library based on the selected fitness goal.
# The engine selects exercises according to equipment and fitness level.

EXERCISE_LIBRARY = {
    "weight_loss": {
        "no_equipment": [
            ("Jumping Jacks", "Cardio", "Keep a steady pace and land softly."),
            ("High Knees", "Cardio", "Lift your knees comfortably while jogging in place."),
            ("Bodyweight Squats", "Strength", "Keep your chest lifted and knees aligned."),
            ("Mountain Climbers", "Cardio", "Maintain a stable plank position."),
            ("Reverse Lunges", "Strength", "Step backward and lower with control."),
            ("Plank", "Core", "Keep your body in a straight line."),
        ],
        "dumbbells": [
            ("Dumbbell Squats", "Strength", "Hold dumbbells safely and squat with control."),
            ("Dumbbell Lunges", "Strength", "Take controlled steps and maintain balance."),
            ("Dumbbell Rows", "Strength", "Pull the weights toward your waist."),
            ("Dumbbell Thrusters", "Strength", "Combine a controlled squat and overhead press."),
            ("Marching in Place", "Cardio", "March steadily and maintain good posture."),
            ("Plank", "Core", "Keep your body in a straight line."),
        ],
        "gym": [
            ("Treadmill Walking", "Cardio", "Begin at a comfortable walking speed."),
            ("Stationary Cycling", "Cardio", "Maintain a steady cycling pace."),
            ("Leg Press", "Strength", "Use a comfortable range of motion."),
            ("Lat Pulldown", "Strength", "Pull the bar toward your upper chest."),
            ("Elliptical Trainer", "Cardio", "Use a smooth and controlled movement."),
            ("Plank", "Core", "Keep your body in a straight line."),
        ],
    },
    "muscle_gain": {
        "no_equipment": [
            ("Push-ups", "Strength", "Keep your body aligned while lowering."),
            ("Bodyweight Squats", "Strength", "Lower slowly and push through your feet."),
            ("Reverse Lunges", "Strength", "Keep your balance and move with control."),
            ("Glute Bridges", "Strength", "Lift your hips while keeping your core engaged."),
            ("Pike Push-ups", "Strength", "Lower your head carefully between your arms."),
            ("Plank", "Core", "Maintain a stable and neutral body position."),
        ],
        "dumbbells": [
            ("Dumbbell Chest Press", "Strength", "Press the weights upward with control."),
            ("Dumbbell Rows", "Strength", "Keep your back neutral while pulling."),
            ("Dumbbell Shoulder Press", "Strength", "Press overhead without arching your back."),
            ("Dumbbell Squats", "Strength", "Keep your knees aligned with your feet."),
            ("Dumbbell Bicep Curls", "Strength", "Avoid swinging your upper body."),
            ("Dumbbell Lunges", "Strength", "Use controlled steps and maintain balance."),
        ],
        "gym": [
            ("Chest Press Machine", "Strength", "Adjust the seat before starting."),
            ("Lat Pulldown", "Strength", "Pull the bar down without swinging."),
            ("Leg Press", "Strength", "Use a comfortable and controlled range."),
            ("Seated Cable Row", "Strength", "Keep your torso steady while pulling."),
            ("Shoulder Press Machine", "Strength", "Use a comfortable range of motion."),
            ("Leg Curl Machine", "Strength", "Move slowly and avoid jerking."),
        ],
    },
    "endurance": {
        "no_equipment": [
            ("Marching in Place", "Cardio", "Maintain a steady and comfortable rhythm."),
            ("Step-back Jacks", "Cardio", "Step out one leg at a time."),
            ("Low-impact High Knees", "Cardio", "Lift your knees without rushing."),
            ("Bodyweight Squats", "Strength", "Use controlled and consistent repetitions."),
            ("Standing Knee Raises", "Cardio", "Alternate knees at a steady pace."),
            ("Walking in Place", "Cardio", "Keep moving at a sustainable pace."),
        ],
        "dumbbells": [
            ("Dumbbell March", "Cardio", "Use light weights and march steadily."),
            ("Dumbbell Squats", "Strength", "Maintain a consistent controlled rhythm."),
            ("Dumbbell Rows", "Strength", "Keep your back neutral."),
            ("Farmer Carry", "Strength", "Walk steadily while holding the weights."),
            ("Step-back Lunges", "Strength", "Alternate legs with controlled movement."),
            ("Marching in Place", "Cardio", "Continue at a sustainable pace."),
        ],
        "gym": [
            ("Treadmill Walking", "Cardio", "Maintain a steady walking pace."),
            ("Stationary Cycling", "Cardio", "Use a comfortable resistance."),
            ("Elliptical Trainer", "Cardio", "Keep a smooth and consistent rhythm."),
            ("Rowing Machine", "Cardio", "Use controlled strokes and good posture."),
            ("Incline Walking", "Cardio", "Choose a manageable incline."),
            ("Stationary Cycling", "Cardio", "Finish with a comfortable cycling pace."),
        ],
    },
    "general_fitness": {
        "no_equipment": [
            ("Walking in Place", "Cardio", "Walk steadily and breathe comfortably."),
            ("Bodyweight Squats", "Strength", "Keep your chest lifted."),
            ("Wall Push-ups", "Strength", "Keep your body aligned."),
            ("Glute Bridges", "Strength", "Lift your hips with control."),
            ("Standing Knee Raises", "Cardio", "Alternate legs at a comfortable pace."),
            ("Bird Dogs", "Core", "Extend opposite arm and leg slowly."),
        ],
        "dumbbells": [
            ("Dumbbell Squats", "Strength", "Keep your movement controlled."),
            ("Dumbbell Rows", "Strength", "Pull the weights toward your waist."),
            ("Dumbbell Shoulder Press", "Strength", "Use a comfortable overhead range."),
            ("Dumbbell Lunges", "Strength", "Maintain balance throughout the movement."),
            ("Dumbbell Bicep Curls", "Strength", "Keep your elbows close to your sides."),
            ("Marching in Place", "Cardio", "Maintain a steady rhythm."),
        ],
        "gym": [
            ("Treadmill Walking", "Cardio", "Start at a comfortable speed."),
            ("Chest Press Machine", "Strength", "Use a manageable resistance."),
            ("Lat Pulldown", "Strength", "Keep your movement controlled."),
            ("Stationary Cycling", "Cardio", "Maintain a comfortable pace."),
            ("Leg Press", "Strength", "Avoid locking your knees."),
            ("Seated Cable Row", "Strength", "Keep your back neutral."),
        ],
    },
}


LEVEL_SETTINGS = {
    "beginner": {
        "sets": 2,
        "reps": "8-10",
        "rest_seconds": 60,
    },
    "intermediate": {
        "sets": 3,
        "reps": "10-12",
        "rest_seconds": 45,
    },
    "advanced": {
        "sets": 4,
        "reps": "12-15",
        "rest_seconds": 30,
    },
}


def build_suggestions(request: WorkoutSuggestionRequest):
    exercises = EXERCISE_LIBRARY[request.fitness_goal][request.equipment]
    level_settings = LEVEL_SETTINGS[request.fitness_level]

    # Create three variations by rotating the exercise selection.
    variations = [
        ("Balanced Workout", 0),
        ("Workout Variation A", 2),
        ("Workout Variation B", 4),
    ]

    suggestions = []

    exercise_count = 4 if request.duration_minutes < 40 else 5
    exercise_count = min(exercise_count, len(exercises))

    base_duration = request.duration_minutes // exercise_count
    extra_minutes = request.duration_minutes % exercise_count

    for title, start_index in variations:
        selected = [
            exercises[(start_index + index) % len(exercises)]
            for index in range(exercise_count)
        ]

        suggested_exercises = []

        for index, (name, category, instructions) in enumerate(selected):
            duration = base_duration + (1 if index < extra_minutes else 0)

            suggested_exercises.append(
                SuggestedExercise(
                    name=name,
                    category=category,
                    duration_minutes=duration,
                    sets=level_settings["sets"],
                    reps=level_settings["reps"],
                    rest_seconds=level_settings["rest_seconds"],
                    instructions=instructions,
                )
            )

        suggestions.append(
            WorkoutSuggestion(
                title=title,
                description=(
                    f"A personalized {request.fitness_goal.replace('_', ' ')} "
                    f"workout designed for your {request.fitness_level} level."
                ),
                fitness_goal=request.fitness_goal,
                fitness_level=request.fitness_level,
                equipment=request.equipment,
                total_duration_minutes=request.duration_minutes,
                exercises=suggested_exercises,
                safety_tip=(
                    "Warm up before exercising, use proper form, stay hydrated, "
                    "and stop if you experience pain, dizziness, or unusual discomfort."
                ),
            )
        )

    return suggestions


@router.post(
    "/suggestions",
    response_model=WorkoutSuggestionResponse,
)
def get_ai_workout_suggestions(
    request: WorkoutSuggestionRequest,
    current_user: User = Depends(get_current_user),
):
    suggestions = build_suggestions(request)

    return WorkoutSuggestionResponse(
        user_id=current_user.id,
        recommendation_type="Personalized rule-based workout recommendations",
        suggestions=suggestions,
    )
