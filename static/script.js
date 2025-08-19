function toggleDrafted(row) {
    row.classList.toggle('drafted');
}

function resetDrafted() {
    const rows = document.querySelectorAll('.player-row');
    rows.forEach(row => row.classList.remove('drafted'));
}
