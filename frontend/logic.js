import * as ui from './ui.js';
import * as http from './http.js';

let partyId = null;
let name = null;
let renderCount = 0;
let updatePartyTimeout = undefined;
let updateSuggestionTimeout = undefined;
let updateElapsedTimeout = undefined;

export async function render(newPartyId, newName) {
    partyId = newPartyId;
    name = newName;
    renderCount += 1
    const contentDiv = ui.contentDiv();
    contentDiv.innerHTML = await http.getHtmlResource('./party.htm');
    ui.name().textContent = name;
    ui.partyCode().textContent = partyId;
    ui.qr().innerHTML = qr.encodeQR(window.location.href, 'svg');
    wireUpParty();
}

function wireUpParty() {
    ui.supportButton().onclick = (event) => supportSuggestion(event.target.getAttribute('data-track'));
    ui.detractButton().onclick = (event) => detractSuggestion(event.target.getAttribute('data-track'));
    ui.joinOtherButton().onclick = (event) => leaveParty();
    clearTimeout(updatePartyTimeout);
    clearTimeout(updateSuggestionTimeout);
    clearTimeout(updateElapsedTimeout);
    pollForPartyUpdates();
    pollForSuggestions();
    trackElapsedTime();
}

async function pollForPartyUpdates() {
    const expectedRenderCount = renderCount;
    const party = await http.getJsonResource(`/api/party/${partyId}/guest/${name}`);
    if (renderCount !== expectedRenderCount) {
        return;
    }
    updateParty(party);
    updatePartyTimeout = setTimeout(async () => await pollForPartyUpdates(), 1000);
}

async function pollForSuggestions() {
    const expectedRenderCount = renderCount;
    const suggestion = await http.getJsonResource(`/api/party/${partyId}/guest/${name}/suggestion`);
    if (renderCount !== expectedRenderCount) {
        return;
    }
    updateSuggestion(suggestion);
    updateSuggestionTimeout = setTimeout(async () => await pollForSuggestions(), 3000);
}

function trackElapsedTime() {
    updateElapsed();
    updateElapsedTimeout = setTimeout(() => trackElapsedTime(), 50);
}

function updateParty(party) {
    ui.guestCount().textContent = party.guestCount.toString();
    const nowPlaying = party.nowPlaying;
    ui.nowPlayingTrack().textContent = nowPlaying.title;
    ui.nowPlayingArtist().textContent = nowPlaying.artist;
    ui.nowPlayingElapsedBar().setAttribute('max', nowPlaying.duration);
    ui.nowPlayingElapsedBar().setAttribute('data-started', nowPlaying.started);
    updateElapsed();
}

function updateSuggestion(suggestion) {
    ui.suggestedTrack().textContent = suggestion.title;
    ui.suggestedArtist().textContent = suggestion.artist;
    ui.suggestionVotes().textContent = suggestion.votes;
    ui.supportButton().setAttribute('data-track', suggestion.trackId);
    ui.detractButton().setAttribute('data-track', suggestion.trackId);
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
    ui.suggestionVotes().textContent = (parseInt(ui.suggestionVotes().textContent) + 1).toString();
    http.postResource(`/api/party/${partyId}/guest/${name}/track/${trackId}/support`);
}

function detractSuggestion(trackId) {
    ui.suggestionVotes().textContent = (parseInt(ui.suggestionVotes().textContent) - 1).toString();
    http.postResource(`/api/party/${partyId}/guest/${name}/track/${trackId}/detraction`);
}

async function leaveParty() {
    await http.deleteResource(`/api/party/${partyId}/guest/${name}`);
    joinOtherParty();
}

function joinOtherParty() {
    do {
        partyId = prompt('Which party now?\nExample code: a3fd').toLowerCase();
    } while (!partyId.match(/^[a-z0-9]{4}$/));
    history.pushState(null, '', `/${partyId}`);
    render(partyId, name);
}
