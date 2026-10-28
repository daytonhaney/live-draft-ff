let players = [];
let draftedPlayers = new Set(
  JSON.parse(localStorage.getItem("draftedPlayers") || "[]").map(String),
);
let teamAssignments = JSON.parse(
  localStorage.getItem("teamAssignments") || "{}",
);
let teamNames = JSON.parse(localStorage.getItem("teamNames") || "{}");
let draftPick = Number(localStorage.getItem("draftPick") || 0);
let history = [];
let hideDrafted = false;
const teamCount = 12;
const rosterLimit = 15;
const roundCount = 15;

for (let index = 1; index <= teamCount; index++) {
  teamAssignments[`team-${index}`] = teamAssignments[`team-${index}`] || [];
}

document.addEventListener('DOMContentLoaded', () => {
    document
      .getElementById("name-filter")
      .addEventListener("input", filterPlayers);
    document
      .getElementById("position-filter")
      .addEventListener("change", filterPlayers);
    document
      .getElementById("team-filter")
      .addEventListener("change", filterPlayers);
    document
      .getElementById("draft-status-filter")
      .addEventListener("change", filterPlayers);
    document
      .getElementById("hide-drafted")
      .addEventListener("click", toggleHideDrafted);
    document
      .getElementById("undo-action")
      .addEventListener("click", undoAction);
    document
      .getElementById("reset-draft")
      .addEventListener("click", resetDrafted);
    document
      .getElementById("available-players")
      .addEventListener("dragover", (event) => event.preventDefault());
    document
      .getElementById("available-players")
      .addEventListener("drop", dropToPool);

    fetch("/players")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load players");
        return response.json();
      })
      .then((data) => {
        players = data;
        populateFilters();
        renderTeams();
        renderTable(players);
        renderDraftStatus();
        document.getElementById("status").textContent = "";
      })
      .catch(() => {
        document.getElementById("status").textContent =
          "Unable to load players. Please refresh and try again.";
      });
});

function populateFilters() {
    const positionFilter = document.getElementById('position-filter');
    const teamFilter = document.getElementById('team-filter');
    const playerOptions = document.getElementById("player-options");

    const positions = [...new Set(players.map(p => p.position))];
    const teams = [...new Set(players.map(p => p.team))];

    players.forEach((player) => {
      const option = document.createElement("option");
      option.value = player.name;
      playerOptions.appendChild(option);
    });

    positions.sort().forEach(position => {
        const option = document.createElement('option');
        option.value = position;
        option.textContent = position;
        positionFilter.appendChild(option);
    });

    teams.sort().forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

function renderTable(playersToRender) {
  const tableBody = document.querySelector("#player-table tbody");
  tableBody.innerHTML = "";

  playersToRender.forEach((player) => {
    const row = document.createElement("tr");
    row.className = "player-row";
    row.draggable = true;
    row.classList.toggle("drafted", draftedPlayers.has(String(player.rank)));
    row.addEventListener("dblclick", () =>
      draftPlayer(player.rank, getCurrentTeamId()),
    );
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ rank: player.rank, fromTeam: null }),
      );
    });
    [player.rank, player.name, player.position, player.team].forEach(
      (value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      },
    );
    tableBody.appendChild(row);
  });

  updateSummary();
}

function renderTeams() {
  const leftContainer = document.getElementById("left-teams");
  const rightContainer = document.getElementById("right-teams");
  leftContainer.innerHTML = "";
  rightContainer.innerHTML = "";

  for (let index = 1; index <= teamCount; index++) {
    const teamId = `team-${index}`;
    const roster = teamAssignments[teamId];
    const box = document.createElement("article");
    box.className = "team-box";
    box.dataset.team = teamId;
    box.classList.toggle("on-clock", teamId === getCurrentTeamId());
    box.addEventListener("dragover", (event) => event.preventDefault());
    box.addEventListener("drop", (event) => dropPlayer(event, teamId));

    const heading = document.createElement("h3");
    const nameInput = document.createElement("input");
    nameInput.className = "team-name";
    nameInput.type = "text";
    nameInput.maxLength = 30;
    nameInput.value = teamNames[teamId] || `Team ${index}`;
    nameInput.setAttribute("aria-label", `Name for team ${index}`);
    nameInput.addEventListener("input", (event) => {
      teamNames[teamId] = event.target.value;
      localStorage.setItem("teamNames", JSON.stringify(teamNames));
      renderDraftStatus();
    });
    nameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      teamNames[teamId] = nameInput.value;
      localStorage.setItem("teamNames", JSON.stringify(teamNames));
      renderDraftStatus();
      nameInput.blur();
    });
    heading.appendChild(nameInput);
    const count = document.createElement("span");
    count.textContent = `${roster.length}/${rosterLimit}`;
    heading.appendChild(count);
    box.appendChild(heading);

    if (teamId === getCurrentTeamId() && draftPick < teamCount * roundCount) {
      const onClock = document.createElement("div");
      onClock.className = "on-clock-label";
      onClock.textContent = "On the clock";
      box.appendChild(onClock);
    }

    const rosterList = document.createElement("ul");
    rosterList.className = "roster-list";
    roster.forEach((rank, rosterIndex) => {
      const player = players.find((item) => String(item.rank) === String(rank));
      if (!player) return;
      const item = document.createElement("li");
      item.draggable = true;
      item.textContent = `${rosterIndex >= 10 ? "Bench: " : ""}${player.name} (${player.position})`;
      item.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ rank: player.rank, fromTeam: teamId }),
        );
      });
      rosterList.appendChild(item);
    });
    box.appendChild(rosterList);
    (index <= 6 ? leftContainer : rightContainer).appendChild(box);
  }
}

function dropPlayer(event, teamId) {
  event.preventDefault();
  const data = JSON.parse(event.dataTransfer.getData("text/plain"));
  const rank = String(data.rank);
  const currentTeam = data.fromTeam || findTeam(rank);

  if (currentTeam === teamId || teamAssignments[teamId].length >= rosterLimit)
    return;
  if (!currentTeam && teamId !== getCurrentTeamId()) {
    showDraftMessage(
      `${teamNames[getCurrentTeamId()] || getCurrentTeamId()} is on the clock.`,
    );
    return;
  }
  saveHistory();
  if (currentTeam) {
    teamAssignments[currentTeam] = teamAssignments[currentTeam].filter(
      (item) => String(item) !== rank,
    );
  }
  teamAssignments[teamId].push(rank);
  draftedPlayers.add(rank);
  if (!currentTeam) draftPick++;
  saveDraftState();
  renderTeams();
  filterPlayers();
  renderDraftStatus();
}

function dropToPool(event) {
  event.preventDefault();
  const data = JSON.parse(event.dataTransfer.getData("text/plain"));
  const rank = String(data.rank);
  saveHistory();
  removeFromTeam(rank);
  draftedPlayers.delete(rank);
  saveDraftState();
  renderTeams();
  filterPlayers();
  renderDraftStatus();
}

function findTeam(rank) {
  return Object.keys(teamAssignments).find((teamId) =>
    teamAssignments[teamId].some((item) => String(item) === String(rank)),
  );
}

function removeFromTeam(rank) {
  const teamId = findTeam(rank);
  if (!teamId) return;
  teamAssignments[teamId] = teamAssignments[teamId].filter(
    (item) => String(item) !== String(rank),
  );
}

function saveDraftState() {
  localStorage.setItem("draftedPlayers", JSON.stringify([...draftedPlayers]));
  localStorage.setItem("teamAssignments", JSON.stringify(teamAssignments));
  localStorage.setItem("draftPick", String(draftPick));
  document.getElementById("undo-action").disabled = history.length === 0;
}


function filterPlayers() {
    const nameFilter = document.getElementById('name-filter').value.toLowerCase();
    const positionFilter = document.getElementById('position-filter').value;
    const teamFilter = document.getElementById('team-filter').value;
    const draftStatusFilter = document.getElementById(
      "draft-status-filter",
    ).value;

    const filteredPlayers = players.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(nameFilter);
        const positionMatch = !positionFilter || player.position === positionFilter;
        const teamMatch = !teamFilter || player.team === teamFilter;
        const isDrafted = draftedPlayers.has(String(player.rank));
        const statusMatch = hideDrafted
          ? !isDrafted
          : draftStatusFilter === "all" ||
            (draftStatusFilter === "drafted" && isDrafted) ||
            (draftStatusFilter === "available" && !isDrafted);
        return nameMatch && positionMatch && teamMatch && statusMatch;
    });

    renderTable(filteredPlayers);
}

function draftPlayer(rank, teamId) {
  const key = String(rank);
  if (findTeam(key)) {
    saveHistory();
    removeFromTeam(key);
    draftedPlayers.delete(key);
  } else {
    if (draftPick >= teamCount * roundCount) {
      showDraftMessage("The draft is complete.");
      return;
    }
    if (teamAssignments[teamId].length >= rosterLimit) {
      showDraftMessage(
        `${teamNames[teamId] || teamId} already has 15 players.`,
      );
      return;
    }
    saveHistory();
    teamAssignments[teamId].push(key);
    draftedPlayers.add(key);
    draftPick++;
  }
  saveDraftState();
  renderTeams();
  filterPlayers();
  renderDraftStatus();
}

function resetDrafted() {
  if (
    !window.confirm(
      "Reset the entire draft? This will clear all rosters, team names, drafted players, and draft progress.",
    )
  )
    return;
  saveHistory();
  draftedPlayers.clear();
  Object.keys(teamAssignments).forEach((teamId) => {
    teamAssignments[teamId] = [];
  });
  teamNames = {};
  draftPick = 0;
  localStorage.removeItem("draftedPlayers");
  localStorage.removeItem("teamAssignments");
  localStorage.removeItem("teamNames");
  renderTeams();
  filterPlayers();
  renderDraftStatus();
}

function updateSummary() {
  const count = draftedPlayers.size;
  document.getElementById("draft-summary").textContent =
    `${count} drafted of ${players.length}`;
}

function toggleHideDrafted() {
  hideDrafted = !hideDrafted;
  document.getElementById("hide-drafted").textContent = hideDrafted
    ? "Show Drafted"
    : "Hide Drafted";
  filterPlayers();
}

function getCurrentTeamId() {
  const round = Math.floor(draftPick / teamCount);
  const position = draftPick % teamCount;
  const teamIndex = round % 2 === 0 ? position + 1 : teamCount - position;
  return `team-${teamIndex}`;
}

function renderDraftStatus() {
  const status = document.getElementById("draft-status");
  if (draftPick >= teamCount * roundCount) {
    status.textContent = "Draft complete";
    return;
  }
  const round = Math.floor(draftPick / teamCount) + 1;
  const pick = draftPick + 1;
  const teamId = getCurrentTeamId();
  status.textContent = `Round ${round} of ${roundCount} · Pick ${pick} of ${teamCount * roundCount} · ${teamNames[teamId] || teamId.replace("team-", "Team ")} on the clock`;
}

function saveHistory() {
  history.push({
    draftedPlayers: [...draftedPlayers],
    teamAssignments: JSON.parse(JSON.stringify(teamAssignments)),
    teamNames: JSON.parse(JSON.stringify(teamNames)),
    draftPick,
  });
}

function undoAction() {
  const previous = history.pop();
  if (!previous) return;
  draftedPlayers = new Set(previous.draftedPlayers);
  teamAssignments = previous.teamAssignments;
  teamNames = previous.teamNames;
  draftPick = previous.draftPick;
  saveDraftState();
  renderTeams();
  filterPlayers();
  renderDraftStatus();
}

function showDraftMessage(message) {
  const status = document.getElementById("status");
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = "";
  }, 3000);
}
