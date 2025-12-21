export const TABS = {
    FEED: 'feed',
    GROUPS: 'groups',
    PLAN: 'plan',
    PROFILE: 'profile'
};

export const MOCK_USER = { uid: 'mock-user-123', email: 'guest@roadrunners.app', displayName: 'Guest Runner' };

export const MOCK_DATA = {
    runs: [
        { id: 'r1', userId: 'u2', username: 'Sarah Run', distanceKm: 5.2, durationMinutes: 28, paceMinPerKm: 5.38, date: '2024-05-20', kudosCount: 12, shoeName: 'Pegasus 40' },
        { id: 'r2', userId: 'u3', username: 'Mike Track', distanceKm: 10.0, durationMinutes: 45, paceMinPerKm: 4.50, date: '2024-05-19', kudosCount: 8, shoeName: null },
        { id: 'r3', userId: 'mock-user-123', username: 'Guest Runner', distanceKm: 3.1, durationMinutes: 18, paceMinPerKm: 5.80, date: '2024-05-18', kudosCount: 3, shoeName: 'Ghost 15' },
    ],
    groups: [
        {
            id: 'g1',
            groupName: 'Morning Milers',
            members: ['mock-user-123', 'u2', 'u3'],
            leaderboard: [
                { username: 'Sarah Run', distance: 25.4 },
                { username: 'Guest Runner', distance: 15.2 },
                { username: 'Mike Track', distance: 10.0 }
            ],
            raceLength: '5k',
            pace: '5:00/km',
            longRunDay: 'Saturday',
            runTerrain: 'Road',
            raceTerrain: 'Road',
            shoeBrand: 'Nike',
            startTime: '06:00'
        },
        {
            id: 'g2',
            groupName: 'Marathon Training',
            members: ['u2'],
            leaderboard: [],
            raceLength: 'Marathon',
            pace: '5:30/km',
            longRunDay: 'Sunday',
            runTerrain: 'Mixed',
            raceTerrain: 'Road',
            shoeBrand: 'Brooks',
            startTime: '07:00'
        }
    ],
    messages: [
        { id: 'm1', userId: 'u2', username: 'Sarah Run', text: 'Great run everyone!', timestamp: new Date(Date.now() - 86400000) },
        { id: 'm2', userId: 'mock-user-123', username: 'Guest Runner', text: 'Thanks! Felt good today.', timestamp: new Date() }
    ],
    profile: {
        userId: 'mock-user-123',
        username: 'Guest Runner',
        age: 28,
        weightKg: 70,
        trainingGoal: 'General Fitness',
        shoeTracker: [
            { id: 's1', name: 'Ghost 15', startMileage: 50, targetMileage: 800 }
        ],
        musicAnthem: 'Eye of the Tiger - Survivor'
    }
};
