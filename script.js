const map = L.map('map').setView([24, 45], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let locs = [], markers = [];
const search = document.getElementById('search');

async function init() {
    try {
        const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRRNraLdm25mb_I8vhtA9FdJ-wBmFAI9NROpmnkwCk1mNz0mDFgRb0iOhRgHDCvn-coXBdXzKeEKNMr/pub?output=csv');
        const rows = (await res.text()).split('\n').slice(1);
        locs = rows.map(r => {
            const [name, lat, lng, desc] = r.split(',').map(s => s.trim());
            return { name, lat: +lat, lng: +lng, desc };
        }).filter(l => !isNaN(l.lat) && !isNaN(l.lng));
        showMarkers();
    } catch (e) {
        console.error(e);
    }
}

function showMarkers(filter = '') {
    markers.forEach(m => m.remove());
    markers = [];
    
    const filtered = filter ? 
        locs.filter(l => l.name.includes(filter) || l.desc.includes(filter)) : 
        locs;
    
    const groups = {};
    filtered.forEach(l => {
        const k = `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`;
        (groups[k] = groups[k] || []).push(l);
    });

    Object.values(groups).forEach(g => {
        const m = L.marker([g[0].lat, g[0].lng])
            .bindPopup(createPopup(g))
            .addTo(map);
        markers.push(m);
    });
}

function createPopup(locs) {
    if (locs.length === 1) {
        return `<div class="popup"><h3>${locs[0].name}</h3><p>${locs[0].desc}</p></div>`;
    }
    
    return `
        <div class="popup" data-index="0">
            <h3>${locs[0].name}</h3>
            <p>${locs[0].desc}</p>
            <div class="nav">
                <button onclick="nav(this,-1)" disabled>السابق</button>
                <span>1/${locs.length}</span>
                <button onclick="nav(this,1)" ${locs.length === 1 ? 'disabled' : ''}>التالي</button>
            </div>
            <span hidden>${JSON.stringify(locs)}</span>
        </div>
    `;
}

function nav(btn, dir) {
    const popup = btn.closest('.popup');
    const locs = JSON.parse(popup.querySelector('span[hidden]').textContent);
    let idx = +popup.dataset.index + dir;
    const loc = locs[idx];
    
    popup.querySelector('h3').textContent = loc.name;
    popup.querySelector('p').textContent = loc.desc;
    popup.querySelector('.nav span').textContent = `${idx + 1}/${locs.length}`;
    popup.dataset.index = idx;
    popup.querySelectorAll('button')[0].disabled = idx === 0;
    popup.querySelectorAll('button')[1].disabled = idx === locs.length - 1;
}

search.addEventListener('input', e => showMarkers(e.target.value.toLowerCase()));
init();
