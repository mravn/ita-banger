const players = new Map();

export function play(partyId, trackId, duration, started, callbackWhenDone) {
    players.set(partyId, {
        trackId,
        duration,
        started,
        callbackWhenDone,
    });
}

function trackElapsedTimes() {
    const now = Date.now();
    for (const play of players.values()) {
        const elapsed = now - play.started;
        if (play.duration < elapsed) {
            play.callbackWhenDone();
        }
    }
    setTimeout(() => trackElapsedTimes(), 100);
}

trackElapsedTimes();