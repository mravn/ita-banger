export function renderParty(partyId, name) {
    const content = contentDiv();
    content.innerHTML = '';

    const welcome = document.createElement('p');
    welcome.id = 'welcome';
    const guest = document.createElement('span');
    guest.id = 'guest';
    guest.textContent = name;
    welcome.append(
        document.createTextNode('Hi '),
        guest,
        document.createTextNode(' - Welcome to the party!'),
    );

    const inviteMore = document.createElement('p');
    inviteMore.id = 'invite';
    inviteMore.textContent = 'Invite more guests using the party code ';

    const partyCode = document.createElement('span');
    partyCode.id = 'partyCode';
    partyCode.textContent = partyId;
    inviteMore.appendChild(partyCode);

    const partySize = document.createElement('p');
    partySize.id = 'partySize';
    const guestCount = document.createElement('span');
    guestCount.id = 'guestCount';
    guestCount.textContent = '(awaiting data)';
    partySize.append(
        document.createTextNode('Guest count: '),
        guestCount,
    );

    const nowPlayingTrack = document.createElement('span');
    nowPlayingTrack.id = 'nowPlayingTrack';
    nowPlayingTrack.className = 'track';
    nowPlayingTrack.textContent = '(awaiting data)';
    const nowPlayingTrackLine = document.createElement('p');
    nowPlayingTrackLine.id = 'nowPlayingTrackLine';
    nowPlayingTrackLine.className = 'oneliner';
    nowPlayingTrackLine.append(
        document.createTextNode('Now playing '),
        nowPlayingTrack,
    );
    const nowPlayingArtist = document.createElement('span');
    nowPlayingArtist.id = 'nowPlayingArtist';
    nowPlayingArtist.className = 'artist';
    nowPlayingArtist.textContent = '(awaiting data)';
    const nowPlayingArtistLine = document.createElement('p');
    nowPlayingArtistLine.id = 'nowPlayingArtistLine';
    nowPlayingArtistLine.className = 'oneliner';
    nowPlayingArtistLine.append(
        document.createTextNode('by '),
        nowPlayingArtist,
    );
    const nowPlayingElapsedBar = document.createElement('progress');
    nowPlayingElapsedBar.id = 'nowPlayingElapsedBar';
    const nowPlayingElapsedText = document.createElement('p');
    nowPlayingElapsedText.id = 'nowPlayingElapsedText';
    nowPlayingElapsedText.textContent = '(awaiting data)';
    const nowPlayingContainer = document.createElement('div');
    nowPlayingContainer.id = 'nowPlayingContainer';
    const nowPlayingElapsedContainer = document.createElement('div');
    nowPlayingElapsedContainer.id = 'nowPlayingElapsedContainer';
    nowPlayingElapsedContainer.append(
        nowPlayingElapsedBar,
        nowPlayingElapsedText,
    );
    nowPlayingContainer.append(
        nowPlayingTrackLine,
        nowPlayingArtistLine,
        nowPlayingElapsedContainer,
    );

    const suggestedTrack = document.createElement('span');
    suggestedTrack.id = 'suggestedTrack';
    suggestedTrack.className = 'track';
    suggestedTrack.textContent = '(awaiting data)';
    const suggestedTrackLine = document.createElement('p');
    suggestedTrackLine.id = 'suggestedTrackLine';
    suggestedTrackLine.className = 'oneliner';
    suggestedTrackLine.append(
        document.createTextNode('What about '),
        suggestedTrack,
    );
    const suggestedArtist = document.createElement('span');
    suggestedArtist.id = 'suggestedArtist';
    suggestedArtist.className = 'artist';
    suggestedArtist.textContent = '(awaiting data)';
    const suggestedArtistLine = document.createElement('p');
    suggestedArtistLine.id = 'suggestedArtistLine';
    suggestedArtistLine.className = 'oneliner';
    suggestedArtistLine.append(
        document.createTextNode('by '),
        suggestedArtist,
    );
    const suggestionSuffixLine = document.createElement('p');
    suggestionSuffixLine.id = 'suggestionSuffix';
    suggestionSuffixLine.textContent = 'for the next track?';
    const suggestionLineContainer = document.createElement('div');
    suggestionLineContainer.id = 'suggestionLineContainer';
    suggestionLineContainer.append(
        suggestedTrackLine,
        suggestedArtistLine,
        suggestionSuffixLine,
    );
    const support = document.createElement('button');
    support.id = 'support';
    support.textContent = '👍';
    const detract = document.createElement('button');
    detract.id = 'detract';
    detract.textContent = '👎';
    const reactionContainer = document.createElement('div');
    reactionContainer.id = 'reactionContainer';
    reactionContainer.append(support, detract);
    const suggestionContainer = document.createElement('div');
    suggestionContainer.id = 'suggestionContainer';
    suggestionContainer.append(
        suggestionLineContainer,
        reactionContainer,
    );

    const joinOtherButton = document.createElement('button');
    joinOtherButton.id = 'joinOther';
    joinOtherButton.textContent = 'Join another party';

    content.append(
        welcome,
        partySize,
        inviteMore,
        nowPlayingContainer,
        suggestionContainer,
        joinOtherButton,
    );
}

function contentDiv() {
    return document.getElementById('content');
}

export function guestCount() {
    return document.getElementById('guestCount');
}

export function nowPlayingTrack() {
    return document.getElementById('nowPlayingTrack');
}

export function nowPlayingArtist() {
    return document.getElementById('nowPlayingArtist');
}

export function nowPlayingElapsedBar() {
    return document.getElementById('nowPlayingElapsedBar');
}

export function nowPlayingElapsedText() {
    return document.getElementById('nowPlayingElapsedText');
}

export function suggestedTrack() {
    return document.getElementById('suggestedTrack');
}

export function suggestedArtist() {
    return document.getElementById('suggestedArtist');
}

export function supportButton() {
    return document.getElementById('support');
}

export function detractButton() {
    return document.getElementById('detract');
}

export function joinOtherButton() {
    return document.getElementById('joinOther');
}
