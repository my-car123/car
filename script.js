import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, getDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// --- بيانات Firebase الخاصة بك (تم إدراجها بناءً على طلبك) ---
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

// تهيئة النظام
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// --- وظيفة الساعة الحية (إصلاح كامل) ---
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        clockEl.innerText = now.toLocaleString('ar-EG', {
            weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- نظام تسجيل الخروج ---
window.logout = () => {
    if(confirm("هل أنت متأكد من تسجيل الخروج؟")) {
        signOut(auth).then(() => window.location.reload())
        .catch(err => alert("حدث خطأ: " + err.message));
    }
};

// --- إدارة المودال ---
window.toggleModal = (id) => {
    document.getElementById(id).classList.toggle('hidden');
};

window.openAddModal = () => {
    document.getElementById('carForm').reset();
    document.getElementById('editDocId').value = '';
    document.getElementById('modalTitle').innerText = "إضافة سيارة جديدة";
    window.toggleModal('carModal');
};

// --- جلب البيانات وتحديث الواجهة فورياً ---
function initDataListener() {
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
            html += renderCarCard(id, car);
        });

        list.innerHTML = html || '<div class="text-center p-20 text-gray-400">لا توجد مركبات مسجلة.. ابدأ بالإظافة الآن!</div>';
        document.getElementById('totalCars').innerText = total;
        document.getElementById('expiryAlerts').innerText = alerts;
    });
}

// --- إنشاء بطاقة السيارة ---
function renderCarCard(id, car) {
    const isLicenseRed = isExpiring(car.expiryLicense);
    const isInsuranceRed = isExpiring(car.expiryInsurance);

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-2">
        <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-blue-50/30 transition" onclick="window.toggleAccordion('${id}')">
            <div class="flex items-center gap-4">
                <div class="uae-plate-box">
                    <div class="plate-side-code">${car.plateCode}</div>
                    <div class="plate-side-number">${car.plateNumber}</div>
                </div>
                <div>
                    <div class="font-bold text-gray-900">${car.ownerName}</div>
                    <div class="text-[11px] text-gray-400 font-bold">${car.emirate} - ${car.type}</div>
                </div>
            </div>
            <span class="text-blue-300">▼</span>
        </div>
        <div id="content-${id}" class="accordion-content bg-gray-50/50">
            <div class="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100">
                <div><p class="label-text">المستخدم</p><b class="text-sm">${car.user || '-'}</b></div>
                <div><p class="label-text">رقم القاعدة</p><b class="text-sm">${car.vin || '-'}</b></div>
                <div class="${isLicenseRed ? 'text-red-600' : ''}"><p class="label-text">انتهاء الترخيص</p><b class="text-sm">${car.expiryLicense}</b></div>
                <div class="${isInsuranceRed ? 'text-red-600' : ''}"><p class="label-text">انتهاء التأمين</p><b class="text-sm">${car.expiryInsurance}</b></div>
                <div class="col-span-2 md:col-span-4 bg-white p-3 rounded-xl border border-gray-100">
                    <p class="label-text text-blue-500">ملاحظات:</p>
                    <p class="text-xs text-gray-600 leading-relaxed">${car.notes || 'لا توجد ملاحظات مسجلة.'}</p>
                </div>
            </div>
            <div class="px-5 pb-5 flex gap-2">
                <button onclick="window.editCar('${id}')" class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-xl font-bold text-xs hover:bg-blue-200 transition">تعديل</button>
                <button onclick='window.printCar(${JSON.stringify(car)})' class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-bold text-xs hover:bg-gray-200 transition">طباعة</button>
                <button onclick="window.deleteCar('${id}')" class="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold text-xs hover:bg-red-100 transition">حذف</button>
            </div>
        </div>
    </div>`;
}

// --- حفظ البيانات (إضافة/تعديل) ---
document.getElementById('carForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editDocId').value;
    const carData = {
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
        if (id) await setDoc(doc(db, "cars", id), carData);
        else await addDoc(collection(db, "cars"), carData);
        window.toggleModal('carModal');
    } catch (err) { alert("فشل الحفظ: " + err.message); }
};

// --- الوظائف العامة ---
window.editCar = async (id) => {
    const snap = await getDoc(doc(db, "cars", id));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('editDocId').value = id;
        document.getElementById('plateNumber').value = d.plateNumber;
        document.getElementById('plateCode').value = d.plateCode;
        document.getElementById('emirate').value = d.emirate;
        document.getElementById('ownerName').value = d.ownerName;
        document.getElementById('userField').value = d.user || '';
        document.getElementById('type').value = d.type || '';
        document.getElementById('vin').value = d.vin || '';
        document.getElementById('year').value = d.year || '';
        document.getElementById('expiryLicense').value = d.expiryLicense;
        document.getElementById('expiryInsurance').value = d.expiryInsurance;
        document.getElementById('notes').value = d.notes || '';
        document.getElementById('modalTitle').innerText = "تعديل بيانات: " + d.ownerName;
        window.toggleModal('carModal');
    }
};

window.deleteCar = async (id) => {
    if (confirm("سيتم حذف المركبة تماماً من السجلات، هل أنت متأكد؟")) {
        await deleteDoc(doc(db, "cars", id));
    }
};

window.toggleAccordion = (id) => {
    const el = document.getElementById(`content-${id}`);
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('open'));
    if (!isOpen) el.classList.add('open');
};

function isExpiring(dateStr) {
    if (!dateStr) return false;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff <= 15;
}

window.filterCars = () => {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.car-card').forEach(card => {
        const text = card.dataset.search.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
};

window.printCar = (car) => {
    const area = document.getElementById('printArea');
    area.innerHTML = `
        <div style="direction:rtl; padding:40px; border:8px solid #2563eb; border-radius:30px; font-family:sans-serif; text-align:center; background:white;">
            <h1 style="color:#2563eb; margin-bottom:10px;">تقرير بيانات المركبة</h1>
            <div style="display:inline-flex; border:3px solid black; margin:20px 0; border-radius:10px; overflow:hidden; background:white; height:60px;">
                <div style="background:#eee; padding:10px 20px; font-weight:bold; font-size:24px; border-left:3px solid black;">${car.plateCode}</div>
                <div style="padding:10px 30px; font-weight:bold; font-size:28px;">${car.plateNumber}</div>
            </div>
            <h2 style="font-size:24px; margin-bottom:30px;">${car.ownerName}</h2>
            <table style="width:100%; text-align:right; border-collapse:collapse; font-size:18px;">
                <tr><td style="padding:10px; border-bottom:1px solid #eee;"><b>الإمارة:</b></td><td>${car.emirate}</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;"><b>المستخدم:</b></td><td>${car.user}</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;"><b>انتهاء الترخيص:</b></td><td>${car.expiryLicense}</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;"><b>انتهاء التأمين:</b></td><td>${car.expiryInsurance}</td></tr>
            </table>
        </div>`;
    window.print();
};

// بدء الاستماع للبيانات
initDataListener();
