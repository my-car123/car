// استيراد مكتبات Firebase (تأكد من استخدام الإimport { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, getDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- إعدادات Firebase (استخدم بياناتك هنا) ---
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 1. الساعة الحية ---
function updateClock() {
    const now = new Date();
    document.getElementById('liveClock').innerText = now.toLocaleString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
setInterval(updateClock, 1000);
updateClock();

// --- 2. جلب البيانات (Real-time) ---
function loadCars() {
    onSnapshot(collection(db, "cars"), (snapshot) => {
        const list = document.getElementById('carList');
        let html = '';
        let total = 0;
        let alerts = 0;

        snapshot.forEach((docSnap) => {
            const car = docSnap.data();
            const id = docSnap.id;
            total++;
            if (checkExpiry(car.expiryLicense) || checkExpiry(car.expiryInsurance)) alerts++;
            html += createCarCard(id, car);
        });

        list.innerHTML = html || '<p class="text-center text-gray-400 py-10">لا توجد مركبات مسجلة حالياً</p>';
        document.getElementById('totalCars').innerText = total;
        document.getElementById('expiryAlerts').innerText = alerts;
    });
}

// --- 3. بناء كارت السيارة ---
function createCarCard(id, car) {
    return `
        <div class="car-card bg-white rounded-xl shadow-sm overflow-hidden" data-search="${car.ownerName} ${car.plateNumber} ${car.user}">
            <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition" onclick="toggleAccordion('${id}')">
                <div class="flex items-center gap-4">
                    <div class="uae-plate">
                        <div class="plate-code">${car.plateCode}</div>
                        <div class="plate-number">${car.plateNumber}</div>
                    </div>
                    <div>
                        <div class="font-bold text-gray-800">${car.ownerName}</div>
                        <div class="text-xs text-gray-400">${car.emirate} - ${car.type}</div>
                    </div>
                </div>
                <span class="text-gray-300">▼</span>
            </div>
            <div id="content-${id}" class="accordion-content bg-blue-50/20">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><p class="text-[10px] text-gray-400">رقم القاعدة</p><strong>${car.vin || '-'}</strong></div>
                    <div><p class="text-[10px] text-gray-400">المستخدم</p><strong>${car.user || '-'}</strong></div>
                    <div class="${checkExpiry(car.expiryLicense) ? 'text-red-600' : ''}"><p class="text-[10px] text-gray-400">انتهاء الترخيص</p><strong>${car.expiryLicense}</strong></div>
                    <div class="${checkExpiry(car.expiryInsurance) ? 'text-red-600' : ''}"><p class="text-[10px] text-gray-400">انتهاء التأمين</p><strong>${car.expiryInsurance}</strong></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editCar('${id}')" class="btn btn-blue py-2 text-sm flex-1">تعديل</button>
                    <button onclick='instantPrint(${JSON.stringify(car)})' class="btn btn-gray py-2 text-sm flex-1">طباعة</button>
                    <button onclick="deleteCar('${id}')" class="btn btn-red py-2 text-sm flex-1">حذف</button>
                </div>
            </div>
        </div>`;
}

// --- 4. التحكم في المودال والفورم ---
window.toggleModal = (modalId) => document.getElementById(modalId).classList.toggle('hidden');

window.openAddModal = () => {
    document.getElementById('carForm').reset();
    document.getElementById('editDocId').value = '';
    document.getElementById('modalTitle').innerText = "إضافة سيارة جديدة";
    toggleModal('carModal');
};

document.getElementById('carForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editDocId').value;
    const data = {
        plateNumber: document.getElementById('plateNumber').value,
        plateCode: document.getElementById('plateCode').value,
        emirate: document.getElementById('emirate').value,
        ownerName: document.getElementById('ownerName').value,
        user: document.getElementById('userField').value,
        type: document.getElementById('type').value,
        vin: document.getElementById('vin').value,
        year: document.getElementById('year').value,
        expiryLicense: document.getElementById('expiryLicense').value,
        expiryInsurance: document.getElementById('expiryInsurance').value,
        notes: document.getElementById('notes').value,
        updatedAt: new Date()
    };

    try {
        if (id) await setDoc(doc(db, "cars", id), data, { merge: true });
        else await addDoc(collection(db, "cars"), { ...data, createdAt: new Date() });
        toggleModal('carModal');
    } catch (err) { alert("خطأ في الحفظ: " + err.message); }
};

// --- 5. بقية الوظائف (تعديل، حذف، طباعة) ---
window.editCar = async (id) => {
    const docSnap = await getDoc(doc(db, "cars", id));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('editDocId').value = id;
        document.getElementById('plateNumber').value = d.plateNumber;
        document.getElementById('plateCode').value = d.plateCode;
        document.getElementById('ownerName').value = d.ownerName;
        // ... (أكمل تعبئة بقية الحقول هنا بنفس الطريقة) ...
        document.getElementById('modalTitle').innerText = "تعديل بيانات: " + d.ownerName;
        toggleModal('carModal');
    }
};

window.deleteCar = async (id) => {
    if (confirm("حذف نهائي؟")) await deleteDoc(doc(db, "cars", id));
};

window.toggleAccordion = (id) => {
    document.querySelectorAll('.accordion-content').forEach(el => {
        if (el.id !== `content-${id}`) el.classList.remove('open');
    });
    document.getElementById(`content-${id}`).classList.toggle('open');
};

window.checkExpiry = (date) => {
    if (!date) return false;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff <= 15;
};

window.filterCars = () => {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.car-card').forEach(card => {
        card.style.display = card.dataset.search.toLowerCase().includes(term) ? 'block' : 'none';
    });
};

window.instantPrint = (car) => {
    const area = document.getElementById('printArea');
    area.innerHTML = `<div style="direction:rtl; padding:40px; border:10px solid #2563eb; font-family:Tajawal;">
        <h1>تقرير مركبة: ${car.ownerName}</h1>
        <p>اللوحة: ${car.plateCode} ${car.plateNumber}</p>
        <p>انتهاء الترخيص: ${car.expiryLicense}</p>
    </div>`;
    window.print();
};

loadCars();
loadCars();
