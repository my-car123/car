import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const carsRef = collection(db, "cars");

let currentCarId = null; // متغير لحفظ معرف السيارة المختارة عند تبديل العهدة

// 1. وظيفة التنقل بين التبويبات (Cars vs Drivers)
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    const btnCars = document.getElementById('btnCarsTab');
    const btnDrivers = document.getElementById('btnDriversTab');

    if(tabId === 'carsTab') {
        btnCars.className = 'btn btn-blue px-8 shadow-md';
        btnDrivers.className = 'btn btn-gray px-8 shadow-md';
    } else {
        btnCars.className = 'btn btn-gray px-8 shadow-md';
        btnDrivers.className = 'btn btn-blue px-8 shadow-md';
        window.loadDrivers(); // تحميل السائقين عند فتح التبويب
    }
};

// 2. إضافة سائق جديد لقاعدة البيانات
window.addNewDriver = async () => {
    const name = document.getElementById('driverName').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();

    if (!name || !phone) return alert("يرجى إدخال اسم السائق ورقم التواصل");

    try {
        await addDoc(driversRef, {
            name: name,
            phone: phone,
            createdAt: serverTimestamp(),
            activeCars: [] 
        });
        document.getElementById('driverName').value = "";
        document.getElementById('driverPhone').value = "";
        alert("تم إضافة السائق بنجاح إلى أسطول المسعود");
    } catch (error) {
        console.error("Error adding driver:", error);
        alert("حدث خطأ أثناء حفظ بيانات السائق");
    }
};

// 3. عرض السائقين في قائمة التبويب الخاص بهم
window.loadDrivers = () => {
    const q = query(driversRef, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('driversList');
        if(!list) return;
        list.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const driver = docSnap.data();
            const card = `
                <div class="bg-white p-5 rounded-xl card-shadow border-r-4 border-blue-600 transition-all hover:scale-[1.02]">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-bold text-xl text-blue-900">${driver.name}</h3>
                        <span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">سائق نشط</span>
                    </div>
                    <p class="text-gray-600 mb-2 font-medium">📞 ${driver.phone}</p>
                    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span class="text-xs text-gray-400">تاريخ الانضمام: ${driver.createdAt ? new Date(driver.createdAt.seconds * 1000).toLocaleDateString() : 'قيد المعالجة'}</span>
                        <button onclick="window.location.href='tel:${driver.phone}'" class="text-blue-600 font-bold text-sm">اتصال سريع</button>
                    </div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// 4. فتح نافذة اختيار السائق (Modal) لتبديل العهدة
window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري تحميل قائمة السائقين...</option>';
    
    document.getElementById('driverAssignModal').classList.remove('hidden');

    try {
        const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
        select.innerHTML = '<option value="">-- اختر السائق المستلم --</option>';
        
        snapshot.forEach(docSnap => {
            const driver = docSnap.data();
            select.innerHTML += `<option value="${driver.name}">${driver.name} (${driver.phone})</option>`;
        });
    } catch (error) {
        console.error("Error fetching drivers:", error);
        alert("فشل في تحميل قائمة السائقين");
    }
};

// 5. إغلاق نافذة العهدة
window.closeAssignModal = () => {
    document.getElementById('driverAssignModal').classList.add('hidden');
    currentCarId = null;
};

// 6. تأكيد عملية تبديل العهدة وتحديث السيارة
window.confirmAssignDriver = async () => {
    const select = document.getElementById('driverSelect');
    const selectedDriver = select.value;

    if (!selectedDriver) return alert("يرجى اختيار السائق أولاً");
    if (!currentCarId) return alert("خطأ في تحديد السيارة");

    try {
        const carDocRef = doc(db, "cars", currentCarId);
        
        // تحديث حقل "المستخدم" في بيانات السيارة
        await updateDoc(carDocRef, {
            user: selectedDriver,
            lastTransferDate: serverTimestamp()
        });

        alert(`تم نقل عهدة السيارة بنجاح إلى: ${selectedDriver}`);
        window.closeAssignModal();
    } catch (error) {
        console.error("Error updating car user:", error);
        alert("حدث خطأ أثناء تحديث العهدة");
    }
};
