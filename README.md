# FitTrack – Fitness & Workout Management Platform

## Overview

FitTrack is a full-stack fitness and workout management application developed using **FastAPI, React, and SQLite**.

The platform helps users manage workouts, track daily fitness progress, set personal fitness goals, monitor performance through analytics, schedule workouts, explore exercises, maintain workout streaks, earn achievement badges, receive personalized workout suggestions, and manage fitness reminders.

The project demonstrates full-stack application development, REST API integration, JWT authentication, database management, background scheduling, and data visualization.

## Project Objectives

- Provide secure user registration and login.
- Allow users to manage workout activities.
- Track daily fitness progress and health-related metrics.
- Create and manage personal fitness goals.
- Generate fitness reports and analytics.
- Schedule workouts in advance.
- Provide an exercise library with search and filtering.
- Track workout consistency through streaks.
- Reward users with achievement badges.
- Provide a personalized fitness dashboard.
- Track nutrition and water intake.
- Provide personalized workout suggestions.
- Track workout sessions using a timer.
- Support third-party fitness activity integrations.
- Schedule reminders for workouts, meals, and hydration.

## Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT Authentication
- Bcrypt Password Hashing
- Uvicorn
- APScheduler

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Axios
- React Router DOM
- React Toastify
- Lucide React

## Project Modules

# PHASE 1: FITNESS TRACKING PLATFORM

### Module 1: User Authentication

- User registration and login.
- JWT-based authentication.
- Password hashing using bcrypt.
- Protected API endpoints.
- Token storage using browser localStorage.

### Module 2: Workout Management

- Add new workouts.
- View workout history.
- Edit existing workouts.
- Delete workouts.
- Track workout duration.
- Record calories burned.
- Categorize workout activities.

### Module 3: Daily Progress Tracking

- Record daily weight.
- Track calories consumed.
- Track water intake.
- Record exercise duration.
- View daily progress history.
- Update and delete progress records.
- Prevent duplicate daily progress entries.

### Module 4: Fitness Goal Management

- Create personal fitness goals.
- Set target and current values.
- Define start and target dates.
- Track goal completion percentage.
- Update goal progress.
- Mark goals as completed.
- Reopen or delete goals.

### Module 5: Reports & Analytics

- Fitness summary.
- Daily workout reports.
- Weekly workout summaries.
- Workout duration analysis.
- Calories burned tracking.
- Weight progress history.
- Fitness goal summaries.
- Goal completion statistics.

### Module 6: Notifications System

- Display notifications.
- Show unread notification count.
- Mark individual notifications as read.
- Mark all notifications as read.
- Delete notifications.
- Generate fitness-related notifications.
- Generate notifications when goals are completed.

# PHASE 2: ADVANCED TRACKING & USER ENGAGEMENT

Phase 2 extends FitTrack with workout scheduling, exercise management, progress comparisons, motivational features, and personalized dashboard functionality.

### Module 7: Workout Plans & Scheduling

- Create workout plans.
- Schedule workouts for future dates.
- View all scheduled workout plans.
- View upcoming workouts.
- Retrieve individual workout plans.
- Update workout schedules.
- Delete workout plans.
- Generate workout scheduling notifications.

**API Prefix:** `/api/v1/workout-plans/`

### Module 8: Exercise Library

- Add new exercises.
- View available exercises.
- Categorize exercises into Cardio, Strength, and Yoga.
- Search exercises by name.
- Filter exercises by category.
- Associate exercises with workouts.
- Update and delete exercises.

**API Prefix:** `/api/v1/exercises/`

### Module 9: Progress Comparison

- Compare weekly workout performance.
- Generate monthly fitness statistics.
- Analyze workout duration.
- Track calories burned.
- Monitor weight progress.
- Generate daily progress reports.
- Display fitness improvement trends.
- Analyze goal completion statistics.

**API Prefix:** `/api/v1/reports/`

### Module 10: Streak Tracking System

- Track daily workout streaks.
- Calculate current workout streak.
- Maintain longest workout streak.
- Recalculate streaks when workout records change.
- Reset current streak when workout days are missed.
- Display workout streak statistics.

**API Prefix:** `/api/v1/streaks/`

### Module 11: Achievement Badges

- Create default achievement badges.
- Award badges for completing the first workout.
- Award badges for maintaining a 3-day streak.
- Award badges for maintaining a 7-day streak.
- Award badges for completing 10 workouts.
- Award badges for completing fitness goals.
- Prevent duplicate badge awards.
- View all available badges.
- View badges earned by users.

**API Prefix:** `/api/v1/badges/`

### Module 12: Personalized Dashboard

- Display daily workout summary.
- Show total workout duration.
- Display total calories burned.
- Show daily fitness progress.
- Display upcoming workout schedules.
- Track fitness goal progress percentages.
- Display current workout streak.
- Display longest workout streak.
- Show earned achievement badges.
- Retrieve user-specific dashboard information.

**API Prefix:** `/api/v1/dashboard/`

# PHASE 3: SMART FITNESS, HEALTH INTEGRATION & AUTOMATION

Phase 3 enhances FitTrack with nutrition tracking, hydration monitoring, personalized workout recommendations, live workout timing, third-party fitness activity integration, advanced analytics, and automated reminders.

### Module 13: Nutrition & Meal Tracking

- Add daily meal entries.
- Record meal details.
- Track calories consumed.
- View meal history.
- Calculate daily calorie totals.
- Display nutrition summaries.
- Manage meal records.

### Module 14: Water Intake Tracker

- Record daily water consumption.
- Set daily water intake goals.
- Track consumed water.
- Calculate remaining water intake.
- Display hydration progress.
- View water intake history.
- Manage water intake records.

### Module 15: AI Workout Suggestions

- Generate personalized workout suggestions.
- Consider user fitness goals.
- Use workout history for recommendations.
- Consider workout consistency and streak information.
- Recommend suitable workout activities.
- Display suggested workouts in the frontend.

**Implementation Note:** The current recommendation engine uses rule-based logic. It does not claim to be a trained machine-learning model or a generative AI service.

### Module 16: Workout Timer & Live Tracking

- Start workout sessions.
- Stop workout sessions.
- Track workout duration.
- Record completed workout sessions.
- Estimate calories burned.
- View workout session history.
- Display live workout timer information.

### Module 17: Third-Party Fitness Integration

- Register supported fitness providers.
- Connect and disconnect provider registrations.
- Import external fitness activity records.
- Track imported steps.
- Record external activity duration and calories.
- Prevent duplicate external activity imports.
- View imported activity history.

**Implementation Note:** The current implementation supports provider registration and external activity ingestion. Direct native synchronization with Android Health Connect or Apple HealthKit requires additional mobile SDK integration and device permissions.

### Module 18: Advanced Analytics Dashboard

- Generate fitness analytics overview.
- Analyze workout trends.
- Track calories burned.
- Display activity distribution.
- Monitor weight progress.
- Analyze fitness goal performance.
- Calculate goal completion statistics.
- Generate personalized fitness insights.
- Support weekly, monthly, yearly, and custom date ranges.

**API Prefix:** `/api/v1/analytics/`

### Module 19: In-App Reminders & Alerts

- Create personalized fitness reminders.
- Schedule workout reminders.
- Schedule meal reminders.
- Schedule water intake reminders.
- Support one-time reminders.
- Support daily recurring reminders.
- Support weekly recurring reminders.
- Edit and delete reminders.
- Activate and deactivate reminders.
- Generate in-app notifications when scheduled reminders trigger.

**API Prefix:** `/api/v1/reminders/`

**Implementation Note:** APScheduler checks scheduled reminders while the backend application is running. The current implementation generates in-app notifications; it does not provide mobile push notifications.

## Database

FitTrack uses SQLite with SQLAlchemy ORM.

### Phase 1 – Core Tables

| Table | Description |
|---|---|
| Users | Stores user account information |
| Workouts | Stores workout activities |
| Progress | Stores daily fitness progress |
| Goals | Stores personal fitness goals |
| Notifications | Stores user notifications |

### Phase 2 – Additional Tables

| Table | Description |
|---|---|
| Workout_Plans | Stores scheduled workout plans |
| Exercises | Stores exercise library information |
| Workout_Exercises | Connects exercises with workouts |
| Streaks | Stores workout streak information |
| Badges | Stores achievement badge definitions |
| User_Badges | Stores badges earned by users |

### Phase 3 – Additional Data

Phase 3 extends the database with records for:

- Nutrition and meal tracking.
- Water intake tracking.
- Workout timer sessions.
- External fitness activities and provider registrations.
- Scheduled fitness reminders.

The database maintains user-specific records and relationships between users and their fitness activities.

## Security Features

- JWT-based authentication.
- Bcrypt password hashing.
- Protected API endpoints.
- User ownership validation.
- Pydantic request and response validation.
- Environment-based configuration.
- CORS configuration for frontend-backend integration.
- Database constraints to prevent duplicate records where applicable.
- User-specific data access and authorization.

## Project Structure

```text
FitTrack/
│
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── workouts.py
│   │   │   ├── progress.py
│   │   │   ├── goals.py
│   │   │   ├── reports.py
│   │   │   ├── notifications.py
│   │   │   ├── workout_plans.py
│   │   │   ├── exercises.py
│   │   │   ├── streaks.py
│   │   │   ├── badges.py
│   │   │   ├── dashboard.py
│   │   │   ├── nutrition.py
│   │   │   ├── water.py
│   │   │   ├── ai_workouts.py
│   │   │   ├── workout_timer.py
│   │   │   ├── health_integrations.py
│   │   │   ├── advanced_analytics.py
│   │   │   └── reminders.py
│   │   │
│   │   ├── services/
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── reminder_scheduler.py
│   │   ├── streak_utils.py
│   │   ├── badge_utils.py
│   │   └── main.py
│   │
│   ├── generated_files/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── index.html
│
├── .gitignore
└── README.md
```

*Note: This is a representative project structure. Keep the actual repository structure aligned with the files in your project.*

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd FitTrack
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file inside the backend directory.

Configure the required environment variables:

```env
DATABASE_URL=sqlite:///./fittrack.db
SECRET_KEY=your_secure_random_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Use a strong secret key for actual deployments. Never upload real credentials or secrets to GitHub.

### 4. Start the Backend Server

```bash
uvicorn app.main:app --reload
```

Backend URL:

http://127.0.0.1:8000

Swagger API Documentation:

http://127.0.0.1:8000/docs

### 5. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Frontend URL:

http://localhost:5173

### Windows PowerShell Note

If PowerShell blocks activation scripts, you can run the backend without activating the virtual environment:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

For the frontend, use:

```powershell
npm.cmd install
npm.cmd run dev
```

## API Integration

The React frontend communicates with the FastAPI backend using Axios.

### Main API Modules

| Module | API Prefix |
|---|---|
| Authentication | `/api/v1/auth/` |
| Workouts | `/api/v1/workouts/` |
| Daily Progress | `/api/v1/progress/` |
| Fitness Goals | `/api/v1/goals/` |
| Reports | `/api/v1/reports/` |
| Notifications | `/api/v1/notifications/` |
| Workout Plans | `/api/v1/workout-plans/` |
| Exercise Library | `/api/v1/exercises/` |
| Streak Tracking | `/api/v1/streaks/` |
| Achievement Badges | `/api/v1/badges/` |
| Personalized Dashboard | `/api/v1/dashboard/` |
| Advanced Analytics | `/api/v1/analytics/` |
| Health Integrations | `/api/v1/health/` |
| Reminders | `/api/v1/reminders/` |

All protected APIs require a valid JWT access token.

## Testing

Testing includes backend API verification through Swagger UI and frontend integration testing.

### Phase 1 Testing

- User registration and authentication.
- Workout CRUD operations.
- Daily progress creation and management.
- Fitness goal management.
- Reports and analytics.
- Notification management.
- JWT authentication and user ownership validation.

### Phase 2 Testing

- Workout plan scheduling and management.
- Exercise library search and filtering.
- Progress comparison.
- Streak calculation and updates.
- Achievement badge awarding.
- Duplicate badge prevention.
- Personalized dashboard data aggregation.

### Phase 3 Testing

- Nutrition and meal entry management.
- Daily calorie summaries.
- Water intake logging and goal tracking.
- Personalized workout suggestions.
- Workout timer start and stop operations.
- Workout session history.
- Fitness provider registration and disconnection.
- External activity import and duplicate prevention.
- Advanced analytics endpoints and dashboard visualizations.
- Reminder creation, editing, activation, and deletion.
- Scheduled in-app notification generation.

## Project Completion Status

### Phase 1: Fitness Tracking Platform

| Module | Status |
|---|---|
| Module 1 – User Authentication | Completed |
| Module 2 – Workout Management | Completed |
| Module 3 – Daily Progress Tracking | Completed |
| Module 4 – Fitness Goal Management | Completed |
| Module 5 – Reports & Analytics | Completed |
| Module 6 – Notifications System | Completed |

### Phase 2: Advanced Tracking & User Engagement

| Module | Status |
|---|---|
| Module 7 – Workout Plans & Scheduling | Completed |
| Module 8 – Exercise Library | Completed |
| Module 9 – Progress Comparison | Completed |
| Module 10 – Streak Tracking System | Completed |
| Module 11 – Achievement Badges | Completed |
| Module 12 – Personalized Dashboard | Completed |

### Phase 3: Smart Fitness, Health Integration & Automation

| Module | Status |
|---|---|
| Module 13 – Nutrition & Meal Tracking | Implemented |
| Module 14 – Water Intake Tracker | Implemented |
| Module 15 – AI Workout Suggestions | Implemented |
| Module 16 – Workout Timer & Live Tracking | Implemented |
| Module 17 – Third-Party Fitness Integration | Implemented |
| Module 18 – Advanced Analytics Dashboard | Implemented |
| Module 19 – In-App Reminders & Alerts | Final testing |

**Backend Phase 1:** Completed and tested.

**Backend Phase 2:** Completed and tested.

**Backend Phase 3:** Implemented and backend testing completed.

**Frontend:** Phase 3 frontend integration is implemented. Final end-to-end verification and repository preparation are in progress.

## Future Enhancements

- Direct Android Health Connect synchronization.
- Apple HealthKit mobile application integration.
- Wearable fitness device integration.
- Mobile push notifications.
- Cloud deployment.
- Interactive workout calendar.
- Additional fitness visualizations.
- Enhanced recommendation algorithms.
- Exportable monthly fitness reports.

## Conclusion

FitTrack is a full-stack fitness and workout management platform developed using FastAPI, React, and SQLite.

Phase 1 established the core fitness tracking functionality, including authentication, workout management, daily progress tracking, goal management, reports, and notifications.

Phase 2 expanded the platform with workout scheduling, an exercise library, progress comparisons, streak tracking, achievement badges, and personalized dashboard functionality.

Phase 3 introduced nutrition tracking, water intake monitoring, personalized workout suggestions, workout timer sessions, third-party fitness activity integration, advanced analytics, and automated in-app reminders.

The project demonstrates practical experience in backend API development, frontend integration, database management, authentication, analytics, background scheduling, and real-world full-stack application development.

**Project:** FitTrack – Fitness & Workout Management Platform  
**Backend:** FastAPI  
**Frontend:** React + Vite  
**Database:** SQLite  
**Phase 1:** Completed  
**Phase 2:** Completed  
**Phase 3:** Implementation completed; final verification in progress
