import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { play } from './player.js';

dotenv.config();
const pool = new pg.Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await onLaunch();

const port = process.env.PORT || 3000;
const server = express();

server.use(express.static('frontend'));
server.use(express.json());
server.use(onEachRequest);
server.get('/api/party/:partyId/guest/:guestId', onGetParty);
server.delete('/api/party/:partyId/guest/:guestId', onDeleteGuestFromParty);
server.get('/api/party/:partyId/guest/:guestId/suggestion', onGetSuggestion);
server.post('/api/party/:partyId/guest/:guestId/track/:trackId/support', onPostTrackSupport);
server.post('/api/party/:partyId/guest/:guestId/track/:trackId/detraction', onPostTrackDetraction);
server.get(/\/[a-zA-Z0-9-_/]+/, onFallback);
server.listen(port, onServerReady);

async function onLaunch() {
    console.log('Connecting to database', process.env.PG_DATABASE);
    const db = await pool.connect();
    try {
        console.log('Database connection established on', new Date());
        await db.query('begin transaction');
        const dbResult = await db.query(`
            select
                party_id as "partyId",
                track_id as "trackId",
                started,
                duration
            from parties
            join tracks using (track_id)`);
        await db.query('commit');
        for (const row of dbResult.rows) {
            play(row.partyId, row.trackId, row.duration, row.started, () => onTrackFinished(row.partyId));
        }
    } catch (e) {
        await db.query('rollback');
        console.error(e);
    } finally {
        db.release();
    }
}

async function onGetParty(request, response) {
    const partyId = request.params.partyId;
    const guestId = request.params.guestId;
    const db = await pool.connect();
    try {
        await db.query('begin transaction');
        const party = await ensurePartyExists(db, partyId, guestId);
        await db.query('commit');
        response.json({
            partyId,
            guestCount: party.guestCount,
            nowPlaying: {
                trackId: party.trackId,
                title: party.trackTitle,
                artist: party.trackArtist,
                duration: party.trackDuration,
                started: party.trackStarted,
            },
        });
    } catch (e) {
        await db.query('rollback');
        console.error(e);
        response.status(500).end();
    } finally {
        db.release();
    }
}

async function onGetSuggestion(request, response) {
    const partyId = request.params.partyId;
    const guestId = request.params.guestId;
    const db = await pool.connect();
    try {
        await db.query('begin transaction');
        await ensurePartyExists(db, partyId, guestId);
        const trackId = (await pickRandomPopularTrack(db)).trackId;
        const trackWithVotes = await findTrackWithVotes(db, partyId, trackId);
        await db.query('commit');
        response.json(trackWithVotes);
    } catch (e) {
        await db.query('rollback');
        console.error(e);
        response.status(500).end();
    } finally {
        db.release();
    }
}

async function onDeleteGuestFromParty(request, response) {
    const partyId = request.params.partyId;
    const guestId = request.params.guestId;
    const db = await pool.connect();
    try {
        await db.query('begin transaction');
        await pool.query(`
            delete from party_guest
            where partyId = $1 and guest_id = $2`,
            [partyId, guestId]);
        // TODO clean up empty parties and votes
        // TODO clean up guests with no parties
        await db.query('commit');
        response.end();
    } catch (e) {
        await db.query('rollback');
        console.error(e);
        response.status(500).end();
    } finally {
        db.release();
    }
}

async function onPostTrackSupport(request, response) {
    await onPostTrackVote(request, response, +1);
}

async function onPostTrackDetraction(request, response) {
    await onPostTrackVote(request, response, -1);
}

async function onPostTrackVote(request, response, delta) {
    const db = await pool.connect();
    try {
        await db.query('begin transaction');
        // we don't use the guestId -- all guests are equal for now
        const partyId = request.params.partyId;
        const trackId = request.params.trackId;
        await updateVote(db, partyId, trackId, delta);
        await db.query('commit');
        response.end();
    } catch (e) {
        await db.query('rollback');
        console.error(e);
        response.status(500).end();
    } finally {
        db.release();
    }
}

async function onTrackFinished(partyId) {
    const db = await pool.connect();
    try {
        await db.query('begin transaction');
        await selectNextTrack(db, partyId);
        await db.query('commit');
    } catch (e) {
        await db.query('rollback');
        console.error(e);
    } finally {
        db.release();
    }
}

async function ensurePartyExists(db, partyId, guestId) {
    await db.query(`
        insert into parties (party_id)
        values ($1)
        on conflict do nothing`,
        [partyId]);
    await db.query(`
        insert into guests (guest_id)
        values ($1)
        on conflict do nothing`,
        [guestId]);
    await db.query(`
        insert into party_guest (party_id, guest_id)
        values ($1, $2)
        on conflict do nothing`,
        [partyId, guestId]);
    let party = await findParty(db, partyId);
    if (party.trackId === null) {
        await selectNextTrack(db, partyId);
        party = await findParty(db, partyId);
    }
    return party;
}

async function findParty(db, partyId) {
    const dbResult = await db.query(`
        select
            p.party_id as "partyId",
            (select count(*) from party_guest where party_id = p.party_id) as "guestCount",
            p.track_id as "trackId",
            t.title as "trackTitle",
            t.artist as "trackArtist",
            t.duration as "trackDuration",
            p.started as "trackStarted"
        from parties p
        left join tracks t using (track_id)
        where party_id = $1`,
        [partyId]);
    return dbResult.rows[0];
}

async function findTrackWithVotes(db, partyId, trackId) {
    const dbResult = await db.query(`
        select
            track_id as "trackId",
            title,
            artist,
            duration,
            coalesce((select votes from party_votes where party_id = $1 and track_id = $2), 0) as votes
        from tracks
        where track_id = $2`,
        [partyId, trackId]);
    return dbResult.rows[0];
}

async function updateVote(db, partyId, trackId, delta) {
    await db.query(`
        insert into party_votes (party_id, track_id, votes)
        values ($1, $2, $3)
        on conflict (party_id, track_id) do update
        set votes = party_votes.votes + $3`,
        [partyId, trackId, delta]);
}

async function selectNextTrack(db, partyId) {
    const track = await pickRandomPopularTrackAtParty(db, partyId);
    const now = Date.now();
    await db.query(`
        update parties
        set track_id = $2, started = $3
        where party_id = $1`,
        [partyId, track.trackId, now]);
    await db.query(`
        insert into party_votes (party_id, track_id, votes)
        values ($1, $2, -1)
        on conflict (party_id, track_id) do update
        set votes = -1`,
        [partyId, track.trackId]);
    play(partyId, track.trackId, track.duration, now, () => onTrackFinished(partyId));
}

async function pickRandomPopularTrackAtParty(db, partyId) {
    const mostUpvotedAtParty = await db.query(`
        select track_id as "trackId", title, artist, duration
        from party_votes
        join tracks using (track_id)
        where party_id = $1 and votes > 0 and votes = (select max(votes) from party_votes where party_id = $1)
        order by popularity desc
        limit 10`,
        [partyId]);
    if (mostUpvotedAtParty.rows.length > 0) {
        return pickRandom(mostUpvotedAtParty.rows);
    }
    // Nothing is upvoted at party. Select a popular track which is not downvoted.
    const mostPopularNotDownvotedAtParty = await db.query(`
        select track_id as "trackId", title, artist, duration
        from tracks t
        where not exists (select 1 from party_votes where party_id = $1 and track_id = t.track_id)
        order by popularity desc
        limit 10`,
        [partyId]);
    if (mostPopularNotDownvotedAtParty.rows.length > 0) {
        return pickRandom(mostPopularNotDownvotedAtParty.rows);
    }
    // fallback, we have to pick something
    return pickRandomPopularTrack(db);
}

let cache = null;
async function pickRandomPopularTrack(db) {
    if (!cache) {
        const dbResult = await db.query(`
            select track_id as "trackId", title, artist, duration
            from tracks
            order by popularity desc
            limit 1000`);
        cache = dbResult.rows;
    }
    return pickRandom(cache);
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
