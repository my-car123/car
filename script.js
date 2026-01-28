import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, getDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- كود الـ API الخاص بك ---
const firebaseConfig = {
  apiKey: "AIzaSyCvrNKiue6lIvJVkgFXWwiYMEY3rWdmj4g",
  authDomain: "my-car123.firebaseapp.com",
  databaseURL: "https://my-car123-default-rtdb.firebaseio.com",
  projectId: "my-car123",
  storageBucket: "my-car123.firebasestorage.app",
  messagingSenderId: "731889650556",
  appId: "1:731889650556:web:9c1fb521647131f48db2f9",
  measurementId: "G-2V1SG587QS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- إصلاح الساعة ---
function updateClock() {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        clockEl.innerText = new Date().toLocaleString('ar-EG', {
            weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- ربط الدوال بـ Window لفك "التجمد" ---
window.toggleModal = (id) => document.getElementById(id).classList.toggle('hidden');

window.openAddModal = () => {
    document.getElementById('carForm').reset();
    document.getElementById('editDocId').value = '';
    document.getElementById('modalTitle').innerText = "إضافة سيارة جديدة";
    window.toggleModal('carModal');
};

window.logout = () => {
    if(confirm("هل تريد تسجيل الخروج؟")) {
        signOut(auth).then(() => window.location.reload());
    }
};

// --- جلب البيانات ---
function startApp() {
    onSnapshot(collection(db, "cars"), (snapshot) => {
        const list = document.getElementById('carList');
        let html = '';
        let total = 0;
        let alerts = 0;

        snapshot.forEach((docSnap) => {
            const car = docSnap.data();
            const id = docSnap.id;
            total++;
            if (isExpiring(car.expiryLicense) || isExpiring(car.expiryInsurance)) alerts++;
            html += `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" data-search="${car.ownerName} ${car.plateNumber}">
                <div class="p-4 flex items-center justify-between cursor-pointer" onclick="window.toggleAccordion('${id}')">
                    <div class="flex items-center gap-3">
                        <div class="uae-plate-box">
                            <div class="plate-side-code">${car.plateCode}</div>
                            <div class="plate-side-number">${car.plateNumber}</div>
                        </div>
                        <div>
                            <div class="font-bold">${car.ownerName}</div>
                            <div class="text-[10px] text-gray-400">${car.emirate}</div>
                        </div>
                    </div>
                    <span class="text-gray-300 text-xs">▼</span>
                </div>
                <div id="content-${id}" class="accordion-content bg-blue-50/20">
                    <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div><p class="text-[10px] text-gray-400">المستخدم</p><b>${car.user || '-'}</b></div>
                        <div><p class="text-[10px] text-gray-400">رقم القاعدة</p><b>${car.vin || '-'}</b></div>
                        <div class="${isExpiring(car.expiryLicense) ? 'text-red-600' : ''}"><p class="text-[10px] text-gray-400">انتهاء الترخيص</p><b>${car.expiryLicense}</b></div>
                        <div class="${isExpiring(car.expiryInsurance) ? 'text-red-600' : ''}"><p class="text-[10px] text-gray-400">انتهاء التأمين</p><b>${car.expiryInsurance}</b></div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.editCar('${id}')" class="bg-blue-100 text-blue-600 py-2 rounded-lg flex-1 text-xs font-bold">تعديل</button>
                        <button onclick="window.deleteCar('${id}')" class="bg-red-50 text-red-600 py-2 rounded-lg flex-1 text-xs font-bold">حذف</button>
                    </div>
                </div>
            </div>`;
        });

        list.innerHTML = html || '<p class="text-center p-10 text-gray-400">لا توجد بيانات</p>';
        document.getElementById('totalCars').innerText = total;
        document.getElementById('expiryAlerts').innerText = alerts;
    });
}

// --- الحفظ والتعديل ---
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
        notes: document.getElementById('notes').value
    };
    try {
        if (id) await setDoc(doc(db, "cars", id), data);
        else await addDoc(collection(db, "cars"), data);
        window.toggleModal('carModal');
    } catch (err) { alert(err.message); }
};

window.editCar = async (id) => {
    const snap = await getDoc(doc(db, "cars", id));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('editDocId').value = id;
        document.getElementById('plateNumber').value = d.plateNumber;
        document.getElementById('plateCode').value = d.plateCode;
        document.getElementById('ownerName').value = d.ownerName;
        document.getElementById('expiryLicense').value = d.expiryLicense;
        document.getElementById('expiryInsurance').value = d.expiryInsurance;
        document.getElementById('modalTitle').innerText = "تعديل: " + d.ownerName;
        window.toggleModal('carModal');
    }
};

window.deleteCar = async (id) => {
    if (confirm("حذف نهائي؟")) await deleteDoc(doc(db, "cars", id));
};

window.toggleAccordion = (id) => {
    document.getElementById(`content-${id}`).classList.toggle('open');
};

window.filterCars = () => {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('[data-search]').forEach(el => {
        el.style.display = el.dataset.search.toLowerCase().includes(q) ? 'block' : 'none';
    });
};

function isExpiring(d) {
    if (!d) return false;
    return Math.ceil((new Date(d) - new Date()) / (86400000)) <= 15;
}

startApp();
