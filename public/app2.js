(function () {
    "use strict";

    var API = "https://beach.etien.cz/data";
    var root = document.getElementById("root");
    var POLL_INTERVAL = 7000;
    var TIMER_INTERVAL = 1000;
    var state = null;
    var polling = null;
    var timers = null;
    var lastUpdated = null;

    // ── Fetch ───────────────────────────────────

    function fetchData() {
        fetch(API)
            .then(function (res) {
                if (!res.ok) throw new Error(res.status);
                return res.json();
            })
            .then(function (data) {
                state = data;
                lastUpdated = new Date();
                render(state);
            })
            .catch(function (err) {
                console.error("Poll failed:", err);
                if (!state) {
                    root.innerHTML = systemMessage("error");
                }
            });
    }

    // ── Utilities ───────────────────────────────

    function esc(str) {
        if (!str) return "";
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function formatElapsed(startTime) {
        var diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
        var h = Math.floor(diff / 3600);
        var m = Math.floor((diff % 3600) / 60);
        var s = diff % 60;
        var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
        return h > 0
            ? h + ":" + pad(m) + ":" + pad(s)
            : pad(m) + ":" + pad(s);
    }

    // ── Timers ──────────────────────────────────

    function startTimers() {
        stopTimers();
        updateTimers();
        timers = setInterval(updateTimers, TIMER_INTERVAL);
    }

    function stopTimers() {
        if (timers) {
            clearInterval(timers);
            timers = null;
        }
    }

    // Updates all timer elements without re-rendering the page
    function updateTimers() {
        var els = document.querySelectorAll("[data-start-time]");
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = formatElapsed(els[i].getAttribute("data-start-time"));
        }
    }

    // ── Components ──────────────────────────────

    // Renders the last updated timestamp
    function lastUpdatedIndicator() {
        if (!lastUpdated) return "";
        var hh = lastUpdated.getHours();
        var mm = lastUpdated.getMinutes();
        var ss = lastUpdated.getSeconds();
        var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
return '<div class="last-updated"><div class="last-updated-content"><div class="live pulse"></div> Naposledy aktualizováno: ' + pad(hh) + ':' + pad(mm) + ':' + pad(ss) + 
        
                '</div></div>';
    }

    function systemMessage(type) {
        if (type === "error") {
            return '<div class="screen-centered">' +
                '<p class="screen-message">Při načítání dat došlo k chybě. Zkuste to prosím znovu.</p>' +
                '</div>';
        }
        if (type === "no-data") {
            return '<div class="screen-centered">' +
                '<p class="screen-message">Zatím nejsou k zobrazení žádné údaje. Prosím vyčkejte na zahájení turnaje.</p>' +
                '</div>';
        }
        return "";
    }

    // Renders a single court card — active match or empty
    function courtCard(court) {
        var hasMatch = court.match !== null;

        var header = '<div class="court-name">' + esc(court.name) + '</div>';
        var body = "";

        if (hasMatch) {
            var m = court.match;
            header +=
                (m.group
                    ? '<div class="group-label">Skupina ' + esc(m.group) + '</div>'
                    : '') +
                // Some matches arrive without a start time — no timer then
                (m.startTime
                    ? '<div class="court-timer" data-start-time="' + esc(m.startTime) + '">' +
                          formatElapsed(m.startTime) +
                      '</div>'
                    : '');
            body = '<p class="match-name">' +
                esc(m.teamA) + ' <span class="vs">vs.</span> ' + esc(m.teamB) +
                '</p>';
        } else {
            body = '<p class="empty-court">Na tomto kurtu není žádný zápas</p>';
        }

        return '<div class="court-card' + (hasMatch ? ' active' : '') + '">' +
            '<div class="court-card-content">' +
                '<div class="court-card-header">' + header + '</div>' +
                '<div class="court-card-body">' + body + '</div>' +
            '</div>' +
            '</div>';
    }

    // Renders all court cards in a grid
    function courtsSection(courts) {
        if (!courts || courts.length === 0) return "";

        var cards = "";
        for (var i = 0; i < courts.length; i++) {
            cards += courtCard(courts[i]);
        }
        return '<section class="section">' +
            '<h2 class="section-title">Kurty (aktuální zápasy)</h2>' +
            '<div class="courts-grid">' + cards + '</div>' +
            '</section>';
    }

    // Renders a single upcoming match row
    function upcomingRow(match, index) {
        return '<div class="upcoming-row">' +
            '<span class="upcoming-index">' + (index + 1) + '</span>' +
            (match.group
                ? '<span class="upcoming-group">Sk. ' + esc(match.group) + '</span>'
                : '') +
            '<span class="upcoming-teams">' +
                esc(match.teamA) +
                ' <span class="upcoming-vs">vs</span> ' +
                esc(match.teamB) +
            '</span>' +
            '</div>';
    }

    // Renders the upcoming matches list
    function upcomingSection(matches) {
        if (!matches || matches.length === 0) return "";

        var rows = "";
        for (var i = 0; i < matches.length; i++) {
            rows += upcomingRow(matches[i], i);
        }
        return '<section class="section">' +
            '<h2 class="section-title">Nadcházející zápasy</h2>' +
            '<div class="upcoming-list">' + rows + '</div>' +
            '</section>';
    }

    // Renders the broadcast message banner
    function messageBanner(message) {
        if (!message) return "";
        return '<div class="section"><div class="message-banner"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><div class="alert">' + esc(message) + '</div></div></div>';
    }

    // Renders the tournament header with name and stage
    function tournamentHeader(data) {

        return '<header class="header">' +
            '<h1 class="tournament-name">' + esc(data.display_name) + '</h1>' +
            '<div class="tournament-description"><p>Zobrazte si aktuální a nadcházející zápasy.</p></div>' +
            '</header>';
    }

    // ── Main render ─────────────────────────────

    function tournamentView(data) {
        return lastUpdatedIndicator() +
            tournamentHeader(data) +
            messageBanner(data.display_message) +
            courtsSection(data.courts) +
            upcomingSection(data.upcoming_matches);
    }

    function render(data) {
        if (data === null) {
            root.innerHTML = systemMessage("no-data") + lastUpdatedIndicator();
            stopTimers();
            return;
        }

        root.innerHTML = tournamentView(data);
        startTimers();
    }

    // ── Polling control ─────────────────────────

    function startPolling() {
        fetchData();
        polling = setInterval(fetchData, POLL_INTERVAL);
    }

    function stopPolling() {
        if (polling) {
            clearInterval(polling);
            polling = null;
        }
    }

    // Pause when tab is hidden, resume when visible
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stopPolling();
            stopTimers();
        } else {
            startPolling();
        }
    });

    // ── Init ────────────────────────────────────

    startPolling()

})();