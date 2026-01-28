import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const carsRef = collection(db, "cars");
const historyRef = collection(db, "transfers");

let currentCarId = null;

// وظيفة لضمان تحويل أي أرقام إلى إنجليزية 123
const enforceEnNumbers = (str) => {
    return String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
};

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
        window.loadTransferHistory();
    }
};

// 2. إضافة سائق جديد
window.addNewDriver = async () => {
    const name = document.getElementById('driverName').value.trim();
    const phone = enforceEnNumbers(document.getElementById('driverPhone').value.trim());

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

// 3. عرض قائمة السائقين (نظام الأكورديون)
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
                <div class="bg-white rounded-xl card-shadow border-r-4 border-blue-600 overflow-hidden mb-2">
                    <div onclick="window.toggleAccordion('dr-${id}')" class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                        <div>
                            <h3 class="font-bold text-lg text-blue-900">${driver.name}</h3>
                            <p class="text-sm text-gray-500 font-mono">${enforceEnNumbers(driver.phone)}</p>
                        </div>
                        <span class="text-blue-300">▼</span>
                    </div>
                    <div id="dr-${id}" class="accordion-content hidden p-4 border-t bg-blue-50/30">
                        <div class="flex flex-wrap gap-2 mb-4">
                            <button onclick="window.location.href='tel:${driver.phone}'" class="btn btn-blue !p-2 flex-1 text-sm">📞 اتصال هاتفي</button>
                            <button onclick="window.location.href='https://wa.me/${driver.phone.replace(/\s+/g, '')}'" class="btn bg-green-600 text-white !p-2 flex-1 text-sm">📱 واتساب</button>
                        </div>
                        <div class="flex gap-4 pt-2 border-t border-gray-200">
                            <button onclick="editDriver('${id}', '${driver.name}', '${driver.phone}')" class="text-blue-600 font-bold text-xs hover:underline">تعديل</button>
                            <button onclick="deleteDriver('${id}')" class="text-red-600 font-bold text-xs hover:underline">حذف السائق</button>
                        </div>
                        <div class="mt-2 text-[10px] text-gray-400 font-mono">
                            انضمام: ${driver.createdAt ? new Date(driver.createdAt.seconds * 1000).toLocaleDateString('en-GB') : '..'}
                        </div>
                    </div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// 4. عرض سجل حركة العهدة (بطاقات + لوحات الإمارات)
window.loadTransferHistory = () => {
    const q = query(historyRef, orderBy("actionDate", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('transferHistoryCards');
        if(!list) return;
        list.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const h = docSnap.data();
            const dateStr = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
            }) : '...';

            const plateParts = h.carPlate ? h.carPlate.split(' ') : ['-','-'];

            const card = `
                <div class="bg-white p-4 rounded-xl border border-gray-200 card-shadow mb-3 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="text-center md:text-right">
                        <div class="text-[11px] text-gray-400 font-mono mb-1">${enforceEnNumbers(dateStr)}</div>
                        <div class="font-bold text-blue-900">${h.driverName}</div>
                        <div class="text-xs text-orange-600 font-bold mt-1">استلام عهدة</div>
                    </div>
                    <div class="uae-plate scale-75 md:scale-90">
                        <div class="plate-code">${plateParts[1] || ''}</div>
                        <div class="plate-number">${enforceEnNumbers(plateParts[0] || '')}</div>
                    </div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// 5. وظائف الإدارة
window.editDriver = async (id, oldName, oldPhone) => {
    const newName = prompt("تعديل اسم السائق:", oldName);
    const newPhone = prompt("تعديل رقم الهاتف:", oldPhone);
    if (newName && newPhone) {
        try {
            await updateDoc(doc(db, "drivers", id), { name: newName, phone: enforceEnNumbers(newPhone) });
            alert("تم التحديث بنجاح");
        } catch (e) { alert("خطأ في التحديث"); }
    }
};

window.deleteDriver = async (id) => {
    if (confirm("هل أنت متأكد من حذف السائق؟")) {
        try { await deleteDoc(doc(db, "drivers", id)); alert("تم الحذف"); } catch (e) { alert("خطأ في الحذف"); }
    }
};

window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    try {
        const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
        select.innerHTML = '<option value="">-- اختر السائق المستلم --</option>';
        snapshot.forEach(doc => { select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
    } catch (e) { alert("فشل تحميل السائقين"); }
};

window.closeAssignModal = () => {
    document.getElementById('driverAssignModal').classList.add('hidden');
    currentCarId = null;
};

window.confirmAssignDriver = async () => {
    const select = document.getElementById('driverSelect');
    const selectedDriver = select.value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        const carData = carSnap.data();
        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver, lastTransferDate: serverTimestamp() });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: `${carData.plateNumber} ${carData.plateCode}`,
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        alert(`تم التحديث بنجاح`);
        window.closeAssignModal();
    } catch (e) { alert("خطأ في النقل"); }
};

window.toggleAccordion = (id) => {
    const el = document.getElementById(id);
    el.classList.toggle('hidden');
};
