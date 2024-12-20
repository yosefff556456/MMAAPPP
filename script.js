// تهيئة الخريطة
const map = L.map('map', {
    zoomControl: false
}).setView([30.5, 30.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// إضافة أزرار التحكم بالتكبير في الجانب الأيمن
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// متغيرات عامة
let locations = [];
let currentLocationIndex = -1;
let currentClusterIndex = -1;
let locationClusters = [];
const DISTANCE_THRESHOLD = 0.0001;

// تهيئة عناصر واجهة المستخدم
const popupOverlay = document.getElementById('popupOverlay');
const closePopupBtn = document.getElementById('closePopup');
const prevButton = document.getElementById('prevLocation');
const nextButton = document.getElementById('nextLocation');
const searchInput = document.getElementById('searchInput');
const sampleTitle = document.getElementById('sampleTitle');
const sampleDetails = document.getElementById('sampleDetails');
const locationCounter = document.getElementById('locationCounter');

// أيقونة مخصصة للعلامات
const skullIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// دالة لتحميل البيانات من Google Sheets
async function loadGoogleSheetsData() {
    try {
        const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRRNraLdm25mb_I8vhtA9FdJ-wBmFAI9NROpmnkwCk1mNz0mDFgRb0iOhRgHDCvn-coXBdXzKeEKNMr/pub?output=csv';
        const response = await fetch(SHEETS_URL);
        const csvText = await response.text();
        
        // تحويل CSV إلى مصفوفة من الكائنات
        const rows = csvText.split('\n').slice(1); // تخطي الصف الأول (العناوين)
        locations = rows.map(row => {
            const [name, lat, lng, dis] = row.split('\t');
            return {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                title: name,
                description: dis
            };
        });

        processLocations();
        addMarkersToMap();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        alert('حدث خطأ في تحميل البيانات');
    }
}

// معالجة المواقع وتجميع المتقاربة
function processLocations() {
    locationClusters = [];
    let processedIndices = new Set();

    locations.forEach((location, index) => {
        if (processedIndices.has(index)) return;

        let cluster = [index];
        processedIndices.add(index);

        locations.forEach((compareLocation, compareIndex) => {
            if (index !== compareIndex && !processedIndices.has(compareIndex)) {
                if (Math.abs(location.lat - compareLocation.lat) < DISTANCE_THRESHOLD &&
                    Math.abs(location.lng - compareLocation.lng) < DISTANCE_THRESHOLD) {
                    cluster.push(compareIndex);
                    processedIndices.add(compareIndex);
                }
            }
        });

        locationClusters.push(cluster);
    });
}

// إضافة العلامات على الخريطة
function addMarkersToMap() {
    locationClusters.forEach((cluster, clusterIndex) => {
        const mainLocation = locations[cluster[0]];
        const marker = L.marker([mainLocation.lat, mainLocation.lng], { icon: skullIcon })
            .addTo(map)
            .on('click', () => {
                currentClusterIndex = clusterIndex;
                currentLocationIndex = 0;
                showLocationDetails(cluster[0]);
                updateNavigationButtons();
                popupOverlay.style.display = 'block';
            });
    });
}

// عرض تفاصيل الموقع
function showLocationDetails(locationIndex) {
    const location = locations[locationIndex];
    const currentCluster = locationClusters[currentClusterIndex];
    
    sampleTitle.textContent = location.title;
    sampleDetails.innerHTML = `
        <div class="sample-info">
            <p><strong>الوصف:</strong> ${location.description}</p>
            <p><strong>الإحداثيات:</strong> ${location.lat}, ${location.lng}</p>
        </div>
    `;
    
    locationCounter.textContent = `${currentLocationIndex + 1} من ${currentCluster.length}`;
    
    map.setView([location.lat, location.lng], 15);
}

// تحديث أزرار التنقل
function updateNavigationButtons() {
    const currentCluster = locationClusters[currentClusterIndex];
    prevButton.disabled = currentLocationIndex <= 0;
    nextButton.disabled = currentLocationIndex >= currentCluster.length - 1;
}

// وظائف التنقل
prevButton.addEventListener('click', () => {
    if (currentLocationIndex > 0) {
        currentLocationIndex--;
        const currentCluster = locationClusters[currentClusterIndex];
        showLocationDetails(currentCluster[currentLocationIndex]);
        updateNavigationButtons();
    }
});

nextButton.addEventListener('click', () => {
    const currentCluster = locationClusters[currentClusterIndex];
    if (currentLocationIndex < currentCluster.length - 1) {
        currentLocationIndex++;
        showLocationDetails(currentCluster[currentLocationIndex]);
        updateNavigationButtons();
    }
});

// إغلاق النافذة المنبثقة
closePopupBtn.addEventListener('click', () => {
    popupOverlay.style.display = 'none';
});

// إغلاق النافذة المنبثقة عند النقر خارجها
popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) {
        popupOverlay.style.display = 'none';
    }
});

// وظيفة البحث
function searchLocations(query) {
    query = query.toLowerCase();
    for (let i = 0; i < locationClusters.length; i++) {
        const cluster = locationClusters[i];
        for (let j = 0; j < cluster.length; j++) {
            const location = locations[cluster[j]];
            if (location.title.toLowerCase().includes(query) ||
                location.description.toLowerCase().includes(query)) {
                currentClusterIndex = i;
                currentLocationIndex = j;
                showLocationDetails(cluster[j]);
                updateNavigationButtons();
                popupOverlay.style.display = 'block';
                return;
            }
        }
    }
    alert('لم يتم العثور على نتائج');
}

// البحث عند الكتابة
searchInput.addEventListener('input', (e) => {
    if (e.target.value.length >= 2) {
        searchLocations(e.target.value);
    }
});

// تحميل البيانات عند بدء التطبيق
loadGoogleSheetsData();
