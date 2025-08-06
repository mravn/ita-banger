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
drop table if exists albums;
drop table if exists artists;

create table artists (
	artist_id   integer unique not null,
	nationality char(2),
	stage_name  text not null
);

create table albums (
	album_id         integer unique not null,
	artist_id        integer references artists (artist_id),
	release_date     date not null,
	title            text not null,
    riaa_certificate text
);
`);
console.log('Tables recreated.');

console.log('Copying data from CSV files...');
await upload(db, 'db/artists.csv', `
	copy artists (artist_id, stage_name, nationality)
	from stdin
	with csv`);
await upload(db, 'db/albums.csv', `
	copy albums (album_id, title, artist_id, release_date, riaa_certificate)
	from stdin
	with csv header`);
await db.end();
console.log('Data copied.');
