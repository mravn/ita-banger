import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { title } from 'process';

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
  { trackId: 10, title: "Blinding Lights", artist: "The Weeknd", duration: 20004 },
  { trackId: 21, title: "Shape of You", artist: "Ed Sheeran", duration: 23371 },
  { trackId: 12, title: "Rolling in the Deep", artist: "Adele", duration: 22829 },
  { trackId: 43, title: "Bad Guy", artist: "Billie Eilish", duration: 19408 },
  { trackId: 54, title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: 26929 },
  { trackId: 75, title: "Can't Feel My Face", artist: "The Weeknd", duration: 21394 },
  { trackId: 96, title: "Levitating", artist: "Dua Lipa", duration: 20306 },
  { trackId: 37, title: "Radioactive", artist: "Imagine Dragons", duration: 18600 },
  { trackId: 28, title: "Happy", artist: "Pharrell Williams", duration: 23394 },
  { trackId: 49, title: "Old Town Road", artist: "Lil Nas X", duration: 15700 },
];
const trackMap = new Map(tracks.map((t) => [t.trackId, t]));

function trackElapsedTimes() {
    const now = Date.now();
    parties.forEach((party) => {
        const track = trackMap.get(party.nowPlaying.trackId);
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
        partyId,
        guests: new Set(),
        votes: new Map(),
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
    const playingTrack = trackMap.get(party.nowPlaying.trackId);
    const suggestedTrack = pickRandom(tracks);
    response.json({
        partyId,
        guestCount: party.guests.size,
        nowPlaying: {
            started: party.nowPlaying.started,
            ...playingTrack,
        },
        suggestion: {
            votes: party.votes.get(suggestedTrack.trackId) || 0,
            ...suggestedTrack,
        }
    });
}

async function onPostTrackSupport(request, response) {
    return onPostTrackVote(request, response, +1);
}

async function onPostTrackDetraction(request, response) {
    return onPostTrackVote(request, response, -1);
}

async function onPostTrackVote(request, response, vote) {
    const partyId = request.params.partyId;
    const guest = request.params.guest;
    const trackId = parseInt(request.params.trackId);
    const party = ensurePartyExists(partyId, guest);
    const oldVotes = party.votes.get(trackId) || 0;
    const newVotes = oldVotes + vote;
    if (newVotes === 0) {
        party.votes.delete(trackId);
    } else {
        party.votes.set(trackId, newVotes);
    }
    response.end();
}

function selectNextTrack(party) {
    let bestTrackId = null;
    let bestVotes = 0;
    let worstVotes = 0
    for (const [trackId, votes] of party.votes.entries()) {
        if (bestVotes < votes) {
            bestVotes = votes;
            bestTrackId = trackId;
        }
        if (votes < worstVotes) {
            worstVotes = votes;
        }
    }
    const track = (bestVotes === 0) ? pickRandom(tracks) : trackMap.get(bestTrackId);
    party.votes.set(track.trackId, worstVotes - 1);
    party.nowPlaying = { trackId: track.trackId, started: Date.now() };
}

function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
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
