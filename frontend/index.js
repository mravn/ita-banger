import { render } from "./logic.js";

const partyIdPattern = /^\/[a-z0-9]{4}$/;
const namePattern = /^.{1,100}$/

function establishName() {
    let name = localStorage.getItem('name') || '';
    while (!name.trim().match(namePattern)) {
        name = prompt('What is your name?') || '';
    }
    localStorage.setItem('name', name);
    return name;
}

function establishPartyId() {
    const pathname = window.location.pathname;
    if (pathname.match(partyIdPattern)) {
        return pathname.substring(1);
    } else {
        return crypto.randomUUID().substring(0, 4);
    }
}

addEventListener("DOMContentLoaded", () => {
    const name = establishName();
    let partyId = establishPartyId();
    history.replaceState(null, '', partyId);
    addEventListener('popstate', () => {
        partyId = establishPartyId();
        render(partyId, name);
    });
    render(partyId, name);
});
