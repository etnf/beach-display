(function () {
    "use strict";

    const API = "https://beach.etien.cz/data"
    const root = document.getElementById("root");

    var POLL_INTERVAL = 1000;
    var state = null;
    var polling = null;

    function fetchData() {
        fetch(API)
            .then(function (res) {
                if (!res.ok) throw new Error(res.status);
                return res.json();
                root.innerHTML = systemMessage("error");
            })
            .then(function (data) {
                state = data;
                render(state);
            })
            .catch(function (err) {
                console.error("Poll failed:", err);
                root.innerHTML = systemMessage("error");
            });
    }

    function clearRoot() {
        root.innerHTML = ""
    }

    function courtCard(data) {
        return `<div class="court-card">
                    <div class="court-card-content">
                        <div class="court-card-header">
                            <div class="court-name">${data.name}</div>
                        </div>
                        <div class="court-card-body">
                            <div class="court-name">Na tomto kurtu není žádný zápas.</div>
                        </div>
                    </div>
                </div>`
    }

    function tournamentView(data) {
        console.log(data.courts)
        return courtCard(data.courts[0])
    }

    function systemMessage(type) {
        if(type == "error") {
            return   `<div class="screen-centered"><p class="screen-message">Při načítání dat došlo k chybě. Zkuste to prosím znovu.</p></div>`;
        }
        if(type == "no-data") {
            return   `<div class="screen-centered"><p class="screen-message">Zatím nejsou k zobrazení žádné údaje. Prosím vyčkejte na zahájení turnaje.</p></div>`;
        }
    }

    function render(data) {
        clearRoot()
        if (state == null) {
            root.innerHTML = systemMessage("no-data");
        } else {
            root.innerHTML = tournamentView(data)
        }
    }

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

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stopPolling();
        } else {
            startPolling();
        }
    });

})();