import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const carsRef = collection(db, "cars");
const historyRef = collection(db, "transfers"); // الكولكشن الخاص بالسجلات التاريخية

let currentCarId = null;

// 1. التنقل بين التبويبات
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
        window.loadDrivers();
        window.loadTransferHistory(); // تحميل سجل العهدة عند فتح التبويب
    }
};

// 2. إضافة سائق جديد
window.addNewDriver = async () => {
    const name = document.getElementById('driverName').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();

    if (!name || !phone) return alert("يرجى إدخال اسم السائق ورقم التواصل");

    try {
        await addDoc(driversRef, {
            name: name,
            phone: phone,
            createdAt: serverTimestamp(),
            status: "active"
        });
        document.getElementById('driverName').value = "";
        document.getElementById('driverPhone').value = "";
        alert("تم إضافة السائق بنجاح إلى أسطول المسعود");
    } catch (error) {
        console.error("Error:", error);
        alert("حدث خطأ أثناء حفظ بيانات السائق");
    }
};

// 3. عرض قائمة السائقين مع أزرار الإدارة (تعديل وحذف)
window.loadDrivers = () => {
    const q = query(driversRef, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('driversList');
        if(!list) return;
        list.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const driver = docSnap.data();
            const id = docSnap.id;
            const card = `
                <div class="bg-white p-5 rounded-xl card-shadow border-r-4 border-blue-600 transition-all hover:scale-[1.02]">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-bold text-xl text-blue-900">${driver.name}</h3>
                        <span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">سائق نشط</span>
                    </div>
                    <p class="text-gray-600 mb-2 font-medium">📞 ${driver.phone}</p>
                    <div class="flex gap-4 mt-3 border-t pt-2">
                        <button onclick="editDriver('${id}', '${driver.name}', '${driver.phone}')" class="text-blue-600 font-bold text-sm hover:underline">تعديل</button>
                        <button onclick="deleteDriver('${id}')" class="text-red-600 font-bold text-sm hover:underline">حذف</button>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span class="text-xs text-gray-400">تاريخ الانضمام: ${driver.createdAt ? new Date(driver.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : '..'}</span>
                        <button onclick="window.location.href='tel:${driver.phone}'" class="text-blue-600 font-bold text-sm">اتصال سريع</button>
                    </div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// 4. وظيفة تعديل بيانات السائق
window.editDriver = async (id, oldName, oldPhone) => {
    const newName = prompt("تعديل اسم السائق:", oldName);
    const newPhone = prompt("تعديل رقم الهاتف:", oldPhone);
    
    if (newName && newPhone) {
        try {
            const driverDocRef = doc(db, "drivers", id);
            await updateDoc(driverDocRef, {
                name: newName,
                phone: newPhone
            });
            alert("تم تحديث بيانات السائق بنجاح");
        } catch (error) {
            alert("حدث خطأ أثناء التحديث");
        }
    }
};

// 5. وظيفة حذف السائق
window.deleteDriver = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا السائق من الأسطول؟")) {
        try {
            await deleteDoc(doc(db, "drivers", id));
            alert("تم حذف السائق بنجاح");
        } catch (error) {
            alert("حدث خطأ أثناء الحذف");
        }
    }
};

// 6. عرض سجل حركة العهدة (الأرشفة)
window.loadTransferHistory = () => {
    const q = query(historyRef, orderBy("actionDate", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('transferHistoryList');
        if(!list) return;
        list.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const h = docSnap.data();
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('ar-EG') : '...';
            const row = `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-3 text-sm text-gray-600">${date}</td>
                    <td class="p-3 font-bold text-blue-700">${h.carPlate}</td>
                    <td class="p-3 text-gray-800">${h.driverName}</td>
                </tr>`;
            list.innerHTML += row;
        });
    });
};

// 7. فتح نافذة تبديل العهدة
window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    
    document.getElementById('driverAssignModal').classList.remove('hidden');

    try {
        const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
        select.innerHTML = '<option value="">-- اختر السائق المستلم --</option>';
        snapshot.forEach(doc => {
            select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`;
        });
    } catch (error) {
        alert("فشل تحميل السائقين");
    }
};

// 8. إغلاق نافذة تبديل العهدة
window.closeAssignModal = () => {
    document.getElementById('driverAssignModal').classList.add('hidden');
    currentCarId = null;
};

// 9. العملية الكبرى: تحديث السيارة + إنشاء سجل تاريخي
window.confirmAssignDriver = async () => {
    const select = document.getElementById('driverSelect');
    const selectedDriver = select.value;

    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");

    try {
        // أ. جلب بيانات السيارة الحالية للحصول على رقم اللوحة للسجل
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        if (!carSnap.exists()) return alert("السيارة غير موجودة");
        const carData = carSnap.data();

        // ب. تحديث السيارة الحالية
        const carDocRef = doc(db, "cars", currentCarId);
        await updateDoc(carDocRef, {
            user: selectedDriver,
            lastTransferDate: serverTimestamp()
        });

        // ج. إضافة السجل في كولكشن transfers (السجل التاريخي)
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: (carData.plateNumber + " " + carData.plateCode),
            driverName: selectedDriver,
            actionDate: serverTimestamp(),
            actionType: "استلام عهدة"
        });

        alert(`تم تحديث العهدة بنجاح للسائق: ${selectedDriver}. وتم تدوين العملية في السجل التاريخي.`);
        window.closeAssignModal();
    } catch (error) {
        console.error("Error in transfer:", error);
        alert("حدث خطأ أثناء نقل العهدة");
    }
};
