let players = [];

document.addEventListener('DOMContentLoaded', () => {
    fetch('/players')
        .then(response => response.json())
        .then(data => {
            players = data;
            populateFilters();
            renderTable(players);
        });
});

function populateFilters() {
    const positionFilter = document.getElementById('position-filter');
    const teamFilter = document.getElementById('team-filter');

    const positions = [...new Set(players.map(p => p.position))];
    const teams = [...new Set(players.map(p => p.team))];

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
    const tableBody = document.querySelector('#player-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    playersToRender.forEach(player => {
        const row = document.createElement('tr');
        row.className = 'player-row';
        row.setAttribute('ondblclick', 'toggleDrafted(this)');
        row.innerHTML = `
            <td>${player.rank}</td>
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td>${player.team}</td>
        `;
        tableBody.appendChild(row);
    });
}


function filterPlayers() {
    const nameFilter = document.getElementById('name-filter').value.toLowerCase();
    const positionFilter = document.getElementById('position-filter').value;
    const teamFilter = document.getElementById('team-filter').value;

    const filteredPlayers = players.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(nameFilter);
        const positionMatch = !positionFilter || player.position === positionFilter;
        const teamMatch = !teamFilter || player.team === teamFilter;
        return nameMatch && positionMatch && teamMatch;
    });

    renderTable(filteredPlayers);
}

function toggleDrafted(row) {
    row.classList.toggle('drafted');
}

function resetDrafted() {
    const rows = document.querySelectorAll('.player-row');
    rows.forEach(row => row.classList.remove('drafted'));
    // Re-apply filters after resetting draft
    filterPlayers();
}
