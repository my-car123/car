import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const carsRef = collection(db, "cars");
const historyRef = collection(db, "transfers");

let currentCarId = null;

// تحويل الأرقام إلى إنجليزية لضمان الثبات
const toEnNo = (str) => String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

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
    const phone = toEnNo(document.getElementById('driverPhone').value.trim());

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
        alert("تم إضافة السائق بنجاح");
    } catch (error) {
        alert("حدث خطأ أثناء حفظ بيانات السائق");
    }
};

// 3. عرض قائمة السائقين (نظام بطاقات + أكورديون)
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
                <div class="bg-white rounded-xl card-shadow border-r-4 border-blue-600 overflow-hidden">
                    <div onclick="toggleAccordion('dr-${id}')" class="p-5 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                        <div>
                            <h3 class="font-bold text-lg text-blue-900">${driver.name}</h3>
                            <p class="text-sm text-gray-500 font-mono">${driver.phone}</p>
                        </div>
                        <span class="text-blue-600">▼</span>
                    </div>
                    <div id="dr-${id}" class="accordion-content p-5 border-t bg-gray-50/50">
                        <div class="flex flex-wrap gap-3 mb-4">
                            <button onclick="window.location.href='tel:${driver.phone}'" class="btn btn-blue !py-2 flex-1 text-sm">📞 اتصال</button>
                            <button onclick="window.location.href='https://wa.me/${driver.phone}'" class="btn bg-green-600 text-white !py-2 flex-1 text-sm">📱 واتساب</button>
                        </div>
                        <div class="flex gap-4 pt-3 border-t">
                            <button onclick="editDriver('${id}', '${driver.name}', '${driver.phone}')" class="text-blue-600 font-bold text-xs hover:underline">تعديل البيانات</button>
                            <button onclick="deleteDriver('${id}')" class="text-red-600 font-bold text-xs hover:underline">حذف السائق</button>
                        </div>
                        <p class="text-[10px] text-gray-400 mt-3 font-mono">انضمام: ${driver.createdAt ? new Date(driver.createdAt.seconds * 1000).toLocaleDateString('en-GB') : '..'}</p>
                    </div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// 4. عرض سجل حركة العهدة (بطاقات مع لوحة الإمارات)
window.loadTransferHistory = () => {
    const q = query(historyRef, orderBy("actionDate", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('historyCardsList');
        if(!list) return;
        list.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const h = docSnap.data();
            const dateStr = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
            }) : '...';
            
            // تقسيم رقم اللوحة والرمز للعرض بشكل اللوحة
            const plateParts = h.carPlate ? h.carPlate.split(' ') : ['-','-'];
            const pCode = plateParts[1] || '';
            const pNum = plateParts[0] || '';

            const card = `
                <div class="bg-white p-4 rounded-xl border border-orange-200 card-shadow flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="text-center md:text-right">
                        <p class="text-xs text-gray-400 mb-1 font-mono">${dateStr}</p>
                        <h4 class="font-bold text-blue-900 text-lg">${h.driverName}</h4>
                    </div>
                    <div class="uae-plate scale-90">
                        <div class="plate-code">${pCode}</div>
                        <div class="plate-number">${pNum}</div>
                    </div>
                    <div class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">استلام عهدة</div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// بقية الدوال (تعديل، حذف، تأكيد عهدة) مع ضمان الأرقام الإنجليزية
window.editDriver = async (id, oldName, oldPhone) => {
    const newName = prompt("تعديل اسم السائق:", oldName);
    const newPhone = prompt("تعديل رقم الهاتف:", oldPhone);
    if (newName && newPhone) {
        try {
            await updateDoc(doc(db, "drivers", id), { name: newName, phone: toEnNo(newPhone) });
            alert("تم التحديث");
        } catch (e) { alert("خطأ في التحديث"); }
    }
};

window.deleteDriver = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا السائق؟")) {
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
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        if (!carSnap.exists()) return;
        const carData = carSnap.data();
        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver, lastTransferDate: serverTimestamp() });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: `${carData.plateNumber} ${carData.plateCode}`,
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        alert(`تمت العملية بنجاح`);
        window.closeAssignModal();
    } catch (e) { alert("حدث خطأ"); }
};
