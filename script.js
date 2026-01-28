// استيراد مكتبات Firebase (تأكد من استخدام الإصدار Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بك (ضع إعداداتك هنا)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// دالة جلب البيانات وتحديث الواجهة
function loadCars() {
    const list = document.getElementById('carList');
    
    onSnapshot(collection(db, "cars"), (snapshot) => {
        let html = '';
        let total = 0;
        let alerts = 0;

        snapshot.forEach((docSnap) => {
            const car = docSnap.data();
            const id = docSnap.id;
            total++;

            if (checkExpiry(car.expiryLicense) || checkExpiry(car.expiryInsurance)) {
                alerts++;
            }

            html += createCarCard(id, car);
        });

        list.innerHTML = html;
        document.getElementById('totalCars').innerText = total;
        document.getElementById('expiryAlerts').innerText = alerts;
    });
}

// دالة بناء كارت السيارة
function createCarCard(id, car) {
    const isLicenseExpired = checkExpiry(car.expiryLicense);
    const isInsuranceExpired = checkExpiry(car.expiryInsurance);

    return `
        <div class="car-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-search="${car.ownerName} ${car.plateNumber} ${car.user}">
            <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onclick="toggleAccordion('${id}')">
                <div class="flex items-center gap-4">
                    <div class="uae-plate">
                        <div class="plate-code">${car.plateCode}</div>
                        <div class="plate-number">${car.plateNumber}</div>
                    </div>
                    <div>
                        <div class="text-lg font-bold text-gray-800">${car.ownerName}</div>
                        <div class="text-xs text-gray-500">ID: ${car.customId || id}</div>
                    </div>
                </div>
                <div class="text-gray-400">▼</div>
            </div>
            
            <div id="content-${id}" class="accordion-content bg-blue-50/30">
                <div class="p-6">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-right">
                        <div><p class="text-xs text-gray-400">الإمارة</p><strong>${car.emirate}</strong></div>
                        <div><p class="text-xs text-gray-400">النوع</p><strong>${car.type}</strong></div>
                        <div><p class="text-xs text-gray-400">رقم القاعدة</p><strong>${car.vin || '-'}</strong></div>
                        <div><p class="text-xs text-gray-400">سنة الصنع</p><strong>${car.year || '-'}</strong></div>
                        <div><p class="text-xs text-gray-400">المستخدم</p><strong>${car.user || '-'}</strong></div>
                        <div class="${isLicenseExpired ? 'text-red-600' : ''}">
                            <p class="text-xs text-gray-400">انتهاء الترخيص</p><strong>${car.expiryLicense}</strong>
                        </div>
                        <div class="${isInsuranceExpired ? 'text-red-600' : ''}">
                            <p class="text-xs text-gray-400">انتهاء التأمين</p><strong>${car.expiryInsurance}</strong>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs text-gray-400">ملاحظات</p><p class="text-sm text-gray-700">${car.notes || 'لا يوجد'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editCar('${id}')" class="btn btn-blue flex-1">تعديل</button>
                        <button onclick='instantPrint(${JSON.stringify(car)})' class="btn btn-gray flex-1">طباعة</button>
                        <button onclick="deleteCar('${id}')" class="btn btn-red flex-1">حذف</button>
                    </div>
                </div>
            </div>
        </div>`;
}

// دالة فحص انتهاء الصلاحية (أقل من 15 يوم)
window.checkExpiry = (dateStr) => {
    if (!dateStr) return false;
    const diffDays = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diffDays <= 15;
};

// البحث والفلترة
window.filterCars = () => {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.car-card').forEach(card => {
        const text = card.getAttribute('data-search').toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
};

// التحكم في الأكورديون
window.toggleAccordion = (id) => {
    const content = document.getElementById(`content-${id}`);
    content.classList.toggle('open');
};

// حذف سيارة
window.deleteCar = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذه السيارة نهائياً؟")) {
        try {
            await deleteDoc(doc(db, "cars", id));
        } catch (e) {
            alert("خطأ في الحذف: " + e.message);
        }
    }
};

// الطباعة الفورية
window.instantPrint = (car) => {
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div style="padding: 30px; border: 5px solid #2563eb; border-radius: 20px; direction: rtl; font-family: 'Tajawal', sans-serif; background: white; text-align: center;">
            <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 15px;">بيانات المركبة الرسمية</h1>
            <div class="uae-plate" style="transform: scale(1.4); margin: 20px auto;">
                <div class="plate-code">${car.plateCode}</div>
                <div class="plate-number">${car.plateNumber}</div>
            </div>
            <h2 style="font-size: 22px; margin-top: 15px; color: #333;">${car.ownerName}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 18px; text-align: right; margin-top:30px;">
                <div style="background: #f0f7ff; padding: 10px;"><b>الرقم التسلسلي:</b> ${car.customId || '-'}</div>
                <div style="border-bottom: 1px solid #eee; padding: 10px;"><b>المستخدم:</b> ${car.user || '-'}</div>
                <div style="border-bottom: 1px solid #eee; padding: 10px;"><b>الإمارة:</b> ${car.emirate}</div>
                <div style="border-bottom: 1px solid #eee; padding: 10px;"><b>النوع:</b> ${car.type}</div>
                <div style="border-bottom: 1px solid #eee; padding: 10px;"><b>رقم القاعدة:</b> ${car.vin || '-'}</div>
                <div style="border-bottom: 1px solid #eee; padding: 10px;"><b>سنة الصنع:</b> ${car.year || '-'}</div>
                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px;"><b>انتهاء الترخيص:</b> ${car.expiryLicense}</div>
                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px;"><b>انتهاء التأمين:</b> ${car.expiryInsurance}</div>
            </div>
        </div>
    `;
    window.print();
};

// تعديل سيارة (فتح المودال)
window.editCar = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "cars", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // هنا تفترض وجود Modal في الـ HTML الرئيسي (يمكنك ربطها بحقول الإدخال لديك)
            console.log("تعديل البيانات لـ: ", data.ownerName);
            // ملاحظة: تأكد من وجود الـ HTML الخاص بالمودال لتعبئة البيانات
            alert("تم تحميل بيانات " + data.ownerName + " للتعديل");
        }
    } catch (error) {
        alert("تعذر فتح واجهة التعديل: " + error.message);
    }
};

// بدء تشغيل النظام
loadCars();
