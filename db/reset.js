import pg from 'pg';
import dotenv from 'dotenv';
import { upload } from 'pg-upload';

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

console.log('Recreating tables...');
await db.query(`
drop table if exists party_votes;
drop table if exists party_guest;
drop table if exists parties;
drop table if exists tracks;
drop table if exists guests;

create table guests (
    guest_id varchar(32) primary key
);

create table tracks (
    track_id bigint primary key,
	title text not null,
	artist text not null,
	duration int not null,
	popularity int not null
);
create index tracks_popularity on tracks (popularity);

create table parties (
    party_id char(4) primary key,
	track_id bigint references tracks,
	started bigint
);

create table party_guest (
    party_id char(4) references parties,
	guest_id varchar(32) references guests,
	primary key (party_id, guest_id)
);

create table party_votes (
    party_id char(4) references parties,
	track_id bigint references tracks,
	votes int not null,
	primary key (party_id, track_id)
);
`);
console.log('Tables recreated.');

console.log('Importing data from CSV files...');
await upload(db, 'db/short-tracks.csv', `
	copy tracks (track_id, title, artist, duration, popularity)
	from stdin
	with csv header`);
console.log('Data imported.');

await db.end();
console.log('Reset complete.');
