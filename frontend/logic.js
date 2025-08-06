import * as ui from './ui.js';
import * as http from './http.js';

let partyId = crypto.randomUUID().substring(0, 4);
let name = null;

export function initialize() {
    name = localStorage.getItem('name');
    if (!name) {
        name = prompt('What is your name?');
        localStorage.setItem('name', name);
    }
    const storedPartyId = localStorage.getItem('partyId');
    if (storedPartyId) {
        partyId = storedPartyId;
    } else {
        localStorage.setItem('partyId', partyId);
    }
    ui.renderParty(partyId, name);
    wireUpParty();
}

function wireUpParty() {
    ui.supportButton().onclick = (event) => supportSuggestion(event.target.getAttribute('data-track'));
    ui.detractButton().onclick = (event) => detractSuggestion(event.target.getAttribute('data-track'));
    ui.joinOtherButton().onclick = (event) => leaveParty();
    pollForPartyUpdates();
    trackElapsedTime();
}

async function pollForPartyUpdates() {
    const party = await http.getResource(`/api/party/${partyId}/guest/${name}`);
    updateParty(party);
    setTimeout(async () => await pollForPartyUpdates(partyId), 3000);
}

function trackElapsedTime() {
    updateElapsed();
    setTimeout(() => trackElapsedTime(), 100);
}

function updateParty(party) {
    ui.guestCount().textContent = party.guestCount.toString();
    const nowPlaying = party.nowPlaying;
    ui.nowPlayingTrack().textContent = nowPlaying.name;
    ui.nowPlayingArtist().textContent = nowPlaying.artist;
    ui.nowPlayingElapsedBar().setAttribute('max', nowPlaying.duration);
    ui.nowPlayingElapsedBar().setAttribute('data-started', nowPlaying.started);
    updateElapsed();
    const recommendation = party.recommendation;
    ui.suggestedTrack().textContent = recommendation.name;
    ui.suggestedArtist().textContent = recommendation.artist;
    ui.supportButton().setAttribute('data-track', recommendation.trackId);
    ui.detractButton().setAttribute('data-track', recommendation.trackId);
}

function updateElapsed() {
    const progressBar = ui.nowPlayingElapsedBar();
    const duration = parseInt(progressBar.getAttribute('max'));
    const started = parseInt(progressBar.getAttribute('data-started'));
    const elapsed = Math.min(duration, Date.now() - started);
    ui.nowPlayingElapsedBar().setAttribute('value', elapsed);
    ui.nowPlayingElapsedText().textContent = `${(elapsed / 1000.0).toFixed(1)}/${(duration / 1000.0).toFixed(1)}s`;
}

function supportSuggestion(trackId) {
    http.postResource(`/api/party/${partyId}/guest/${name}/track/${trackId}/support`);
}

function detractSuggestion(trackId) {
    http.postResource(`/api/party/${partyId}/guest/${name}/track/${trackId}/detraction`);
}

function leaveParty() {
    http.deleteResource(`/api/party/${partyId}/guest/${name}`);
    joinOtherParty();
}

function joinOtherParty() {
    partyId = prompt('Which party now?');
    localStorage.setItem('partyId', partyId);
    ui.renderParty(partyId, name);
    wireUpParty();
}
