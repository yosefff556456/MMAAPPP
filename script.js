// تهيئة الخريطة
const map = L.map('map').setView([24, 45], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// متغيرات عامة
let locations = [];
let markers = [];
const searchInput = document.getElementById('searchInput');

// دالة لتحميل البيانات
async function loadData() {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRRNraLdm25mb_I8vhtA9FdJ-wBmFAI9NROpmnkwCk1mNz0mDFgRb0iOhRgHDCvn-coXBdXzKeEKNMr/pub?output=csv');
        const text = await response.text();
        const rows = text.split('\n').slice(1);
        
        locations = rows.map(row => {
            const [name, lat, lng, desc] = row.split(',').map(s => s.trim());
            return {
                name,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                desc
            };
        }).filter(loc => !isNaN(loc.lat) && !isNaN(loc.lng));

        showLocations();
    } catch (err) {
        console.error('خطأ في تحميل البيانات:', err);
    }
}

// دالة لعرض المواقع على الخريطة
function showLocations(filteredLocs = locations) {
    // إزالة العلامات السابقة
    markers.forEach(m => m.remove());
    markers = [];

    // تجميع المواقع المتقاربة
    const groups = {};
    filteredLocs.forEach(loc => {
        const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(loc);
    });

    // إضافة العلامات للخريطة
    Object.values(groups).forEach(group => {
        const marker = L.marker([group[0].lat, group[0].lng])
            .bindPopup(createPopupContent(group))
            .addTo(map);
        markers.push(marker);
    });
}

// دالة لإنشاء محتوى النافذة المنبثقة
function createPopupContent(locations) {
    let content = '<div class="popup">';
    if (locations.length === 1) {
        const loc = locations[0];
        content += `<h3>${loc.name}</h3><p>${loc.desc}</p>`;
    } else {
        let currentIndex = 0;
        content += `
            <h3>${locations[0].name}</h3>
            <p>${locations[0].desc}</p>
            <div class="nav-buttons">
                <button class="nav-button" onclick="showPrevLocation(this)" disabled>السابق</button>
                <span>${1}/${locations.length}</span>
                <button class="nav-button" onclick="showNextLocation(this)" ${locations.length === 1 ? 'disabled' : ''}>التالي</button>
            </div>
            <span style="display:none;" data-locations='${JSON.stringify(locations)}' data-index="0"></span>
        `;
    }
    content += '</div>';
    return content;
}

// دوال التنقل بين المواقع
function showPrevLocation(btn) {
    const container = btn.closest('.popup');
    const dataSpan = container.querySelector('span[data-locations]');
    const locations = JSON.parse(dataSpan.dataset.locations);
    let index = parseInt(dataSpan.dataset.index) - 1;
    updatePopupContent(container, locations, index);
}

function showNextLocation(btn) {
    const container = btn.closest('.popup');
    const dataSpan = container.querySelector('span[data-locations]');
    const locations = JSON.parse(dataSpan.dataset.locations);
    let index = parseInt(dataSpan.dataset.index) + 1;
    updatePopupContent(container, locations, index);
}

function updatePopupContent(container, locations, index) {
    const loc = locations[index];
    container.querySelector('h3').textContent = loc.name;
    container.querySelector('p').textContent = loc.desc;
    container.querySelector('span:not([data-locations])').textContent = `${index + 1}/${locations.length}`;
    container.querySelector('span[data-locations]').dataset.index = index;
    container.querySelector('button:first-of-type').disabled = index === 0;
    container.querySelector('button:last-of-type').disabled = index === locations.length - 1;
}

// دالة البحث
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = locations.filter(loc => 
        loc.name.toLowerCase().includes(query) || 
        loc.desc.toLowerCase().includes(query)
    );
    showLocations(filtered);
});

// تحميل البيانات عند بدء التطبيق
loadData();
