RoadRunners: High-Performance Social Running App

RoadRunners is a single-page, full-stack application designed to track and enhance the running experience through community, personalized training, and competitive features. It focuses exclusively on the needs of runners, providing tools for both individual progress and group motivation.

🚀 Core Features

RoadRunners goes beyond simple mileage logging by incorporating deep social integration and personalized coaching elements.

1. Social & Community

Activity Feed: A real-time feed showcasing runs logged by group members and the wider community.

Groups & Leaderboards: Create or join running groups, view simplified weekly distance leaderboards, and engage in real-time chat with teammates.

Kudos System: Encourage fellow runners by giving "Kudos" (high-fives) on their logged runs.

2. Personalized Training

Structured Workout Planner: Based on a user's self-selected training goal (e.g., Short Distance, Long Distance, General Fitness), the app generates a balanced weekly schedule incorporating Endurance, Speed, Strength, and Recovery sessions.

Personal Profile: Track your overall running metrics, personal bests, and manage your training goals.

3. Practical Utilities

Shoe Mileage Tracker: Track the total kilometers run in each pair of running shoes. Receive alerts or visual indicators when a pair is nearing its recommended retirement mileage (default 800km) to help prevent injury.

Manual Run Logging: Easily log your runs with distance, duration, and date.

4. External Integration (Planned)

The application is designed to support integration with major external tracking services (e.g., Garmin, Apple Health, Strava, Nike Run Club, Adidas Running) to automatically sync run data.

🎨 Design & Branding

The application follows a high-contrast, performance-focused aesthetic:

Palette: High-contrast Dark Mode with a core palette of near-black backgrounds (#0D0D0D), dark surfaces (#1A1A1A), white text (#FFFFFF), and a vibrant RoadRunner Blue (#1E90FF) accent color for all calls-to-action and key data points.

Aesthetics: Modern, minimalist design utilizing clean typography (Inter), rounded corners, and Lucide icons for clarity.

⚙️ Technology Stack

This application is built as a single-page React component for simplicity and fast development, utilizing powerful modern tools for a full-stack experience.

Frontend: React (Functional Components and Hooks)

Styling: Tailwind CSS

Backend/Database: Firebase Firestore (Real-time data synchronization)

Authentication: Firebase Custom Token/Anonymous Sign-in for user management and secure data access.

🛠️ Data Structure Overview

Data persistence is managed via Firestore, with strict separation between user-private and public/community data:

Data Type

Firestore Path Type

Example Fields

User Profiles

Private (.../users/{userId}/profiles/{userId})

username, trainingGoal, shoeTracker[]

Runs

Public (.../public/data/runs/{runId})

userId, distanceKm, paceMinPerKm, kudosCount

Groups

Public (.../public/data/groups/{groupId})

groupName, members[], messages[] (subcollection)