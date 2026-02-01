const statsCache = new Map();

export const getStatsFromCache = (userId) => {
    if (statsCache.has(userId)) {
        console.log(`Serving stats from cache for user: ${userId}`);
        return statsCache.get(userId);
    }
    return null;
};

export const setStatsToCache = (userId, data) => {
    console.log(`Caching stats for user: ${userId}`);
    statsCache.set(userId, data);
};

export const invalidateStatsCache = (userId) => {
    if (statsCache.has(userId)) {
        console.log(`Invalidating stats cache for user: ${userId}`);
        statsCache.delete(userId);
    }
};
