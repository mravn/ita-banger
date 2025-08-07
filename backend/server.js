import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
console.log('Connecting to database', process.env.PG_DATABASE);
const db = new pg.Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
const dbResult = await db.query('select now()');
console.log('Database connection established on', dbResult.rows[0].now);

const port = process.env.PORT || 3000;
const server = express();

const parties = new Map();
trackElapsedTimes();

server.use(express.static('frontend'));
server.use(express.json());
server.use(onEachRequest);
server.get('/api/party/:partyId/guest/:guest', onGetParty);
server.delete('/api/party/:partyId/guest/:guest', onDeleteParty);
server.post('/api/party/:partyId/guest/:guest/track/:trackId/support', onPostTrackSupport);
server.post('/api/party/:partyId/guest/:guest/track/:trackId/detraction', onPostTrackDetraction);
server.get(/\/[a-zA-Z0-9-_/]+/, onFallback);
server.listen(port, onServerReady);

const tracks = [
  { trackId: 0, name: "Blinding Lights", artist: "The Weeknd", duration: 20004 },
  { trackId: 1, name: "Shape of You", artist: "Ed Sheeran", duration: 23371 },
  { trackId: 2, name: "Rolling in the Deep", artist: "Adele", duration: 22829 },
  { trackId: 3, name: "Bad Guy", artist: "Billie Eilish", duration: 19408 },
  { trackId: 4, name: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: 26929 },
  { trackId: 5, name: "Can't Feel My Face", artist: "The Weeknd", duration: 21394 },
  { trackId: 6, name: "Levitating", artist: "Dua Lipa", duration: 20306 },
  { trackId: 7, name: "Radioactive", artist: "Imagine Dragons", duration: 18600 },
  { trackId: 8, name: "Happy", artist: "Pharrell Williams", duration: 23394 },
  { trackId: 9, name: "Old Town Road", artist: "Lil Nas X", duration: 15700 },
];

function trackElapsedTimes() {
    const now = Date.now();
    parties.forEach((party) => {
        const track = tracks[party.nowPlaying.trackId];
        const started = party.nowPlaying.started;
        const elapsed = now - started;
        if (track.duration < elapsed) {
            selectNextTrack(party);
        }
    });
    setTimeout(() => trackElapsedTimes(), 100);
}

function ensurePartyExists(partyId, guest) {
    const party = parties.get(partyId) || createNewParty(partyId);
    party.guests.add(guest);
    return party;
}

function createNewParty(partyId) {
    const party = {
        guests: new Set(),
        nowPlaying: null,
        supported: new Set(),
        detracted: new Set(),
        alreadyPlayed: new Set(),
        pool: new Set(tracks.map((track) => track.trackId)),
    };
    selectNextTrack(party);
    parties.set(partyId, party);
    return party;
}

async function onDeleteParty(request, response) {
    const partyId = request.params.partyId;
    const guest = request.params.guest;
    const party = parties.get(partyId)
    if (party) {
       party.guests.delete(guest);
    }
    response.end();
}

async function onGetParty(request, response) {
    const partyId = request.params.partyId;
    const guest = request.params.guest;
    const party = ensurePartyExists(partyId, guest);
    const track = tracks[party.nowPlaying.trackId];
    const started = party.nowPlaying.started;
    const recommendation = pickRandomFromPrioritized([party.pool.union(party.supported).union(party.detracted), party.alreadyPlayed]);
    response.json({
        partyId,
        guestCount: party.guests.size,
        nowPlaying: {
            started,
            ...track,
        },
        recommendation: tracks[recommendation],
    });
}

async function onPostTrackSupport(request, response) {
    const partyId = request.params.partyId;
    const guest = request.params.guest;
    const trackId = request.params.trackId;
    const party = ensurePartyExists(partyId, guest);
    if (party.detracted.has(trackId)) {
        party.detracted.delete(trackId);
        party.pool.add(trackId);
    } else if (party.pool.has(trackId)) {
        party.pool.delete(trackId);
        party.supported.add(trackId);
    }
    response.end();
}

async function onPostTrackDetraction(request, response) {
    const partyId = request.params.partyId;
    const guest = request.params.guest;
    const trackId = request.params.trackId;
    const party = ensurePartyExists(partyId, guest);
    if (party.supported.has(trackId)) {
        party.supported.delete(trackId);
        party.pool.add(trackId);
    } else if (party.pool.has(trackId)) {
        party.pool.delete(trackId);
        party.detracted.add(trackId);
    }
    response.end();
}

function selectNextTrack(party) {
    if (party.alreadyPlayed.size === tracks.length) {
        party.alreadyPlayed.clear();
        party.pool = new Set(tracks.map((track) => track.trackId));
    }
    const trackId = pickRandomFromPrioritized([party.supported, party.pool, party.alreadyPlayed, party.detracted]);
    party.pool.delete(trackId);
    party.supported.delete(trackId);
    party.detracted.delete(trackId);
    party.alreadyPlayed.add(trackId);
    party.nowPlaying = { trackId, started: Date.now() };
}

function pickRandomFromPrioritized(trackIdSets) {
    for (const trackIdSet of trackIdSets) {
        if (trackIdSet.size > 0) {
            return pickRandom(trackIdSet);
        }
    }
    throw new Error('Cannot pick random from', trackIdSets);
}

function pickRandom(iterable) {
    const a = Array.isArray(iterable) ? iterable : [...iterable];
    return a[Math.floor(Math.random() * a.length)];
}

async function onFallback(request, response) {
    response.sendFile(path.join(import.meta.dirname, '..', 'frontend', 'index.html'));
}

function onEachRequest(request, response, next) {
    console.log(new Date(), request.method, request.url);
    next();
}

function onServerReady() {
    console.log('Webserver running on port', port);
}
