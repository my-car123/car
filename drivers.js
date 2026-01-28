import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const historyRef = collection(db, "transfers");

let currentCarId = null;
const toEn = (n) => String(n).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

// 1. التنقل الرئيسي
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
        switchDriverSubTab('list');
    }
};

// 2. تبويبات السائقين الفرعية
window.switchDriverSubTab = (subTab) => {
    const listContent = document.getElementById('driverListContent');
    const historyContent = document.getElementById('driverHistoryContent');
    const listBtn = document.getElementById('subTabListBtn');
    const historyBtn = document.getElementById('subTabHistoryBtn');
    if (subTab === 'list') {
        listContent.classList.remove('hidden');
        historyContent.classList.add('hidden');
        listBtn.className = 'btn btn-blue flex-1 max-w-[200px]';
        historyBtn.className = 'btn btn-gray flex-1 max-w-[200px]';
        window.loadDrivers();
    } else {
        listContent.classList.add('hidden');
        historyContent.classList.remove('hidden');
        listBtn.className = 'btn btn-gray flex-1 max-w-[200px]';
        historyBtn.className = 'btn btn-blue flex-1 max-w-[200px]';
        window.loadTransferHistory(); 
    }
};

// 3. إضافة سائق
window.addNewDriver = async () => {
    const name = document.getElementById('driverName').value.trim();
    const phone = toEn(document.getElementById('driverPhone').value.trim());
    if (!name || !phone) return alert("يرجى إدخال البيانات");
    try {
        await addDoc(driversRef, { name, phone, createdAt: serverTimestamp() });
        document.getElementById('driverName').value = "";
        document.getElementById('driverPhone').value = "";
        alert("تم الحفظ بنجاح");
    } catch (e) { alert("خطأ في الاتصال"); }
};

// 4. تحميل السائقين مع ربط السجل الشخصي
window.loadDrivers = () => {
    onSnapshot(query(driversRef, orderBy("name", "asc")), (snapshot) => {
        const list = document.getElementById('driversList');
        if(!list) return;
        list.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const id = docSnap.id;
            list.innerHTML += `
                <div class="bg-white rounded-xl card-shadow border-r-4 border-blue-600 overflow-hidden mb-3">
                    <div onclick="toggleDrAccordion('${id}', '${d.name}')" class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-blue-900">${d.name}</h3>
                        <span class="text-blue-500 text-xs">عرض السجل ▾</span>
                    </div>
                    <div id="dr-content-${id}" class="hidden p-4 border-t bg-gray-50">
                        <div class="mb-3 text-gray-600 font-mono text-center font-bold italic">${toEn(d.phone)}</div>
                        <div id="personal-history-${id}" class="space-y-2 mb-4 p-2 bg-white rounded border border-blue-50 max-h-32 overflow-y-auto">
                            <p class="text-[10px] text-center text-gray-400">جاري تحميل سجل السائق...</p>
                        </div>
                        <div class="flex gap-2 border-t pt-4">
                            <button onclick="window.location.href='tel:${d.phone}'" class="btn btn-blue flex-1 !py-1 text-xs">اتصال</button>
                            <button onclick="editDriver('${id}', '${d.name}', '${d.phone}')" class="btn btn-gray flex-1 !py-1 text-xs">تعديل</button>
                            <button onclick="deleteDriver('${id}')" class="btn btn-red flex-1 !py-1 text-xs">حذف</button>
                        </div>
                    </div>
                </div>`;
        });
    });
};

// دالة تحميل أرشيف السائق (داخل بطاقته)
window.toggleDrAccordion = async (id, driverName) => {
    const el = document.getElementById(`dr-content-${id}`);
    const historyBox = document.getElementById(`personal-history-${id}`);
    el.classList.toggle('hidden');
    
    if(!el.classList.contains('hidden')) {
        const q = query(historyRef, where("driverName", "==", driverName), orderBy("actionDate", "desc"));
        const snap = await getDocs(q);
        if(snap.empty) {
            historyBox.innerHTML = "<p class='text-[10px] text-gray-400 text-center'>لا توجد عهد سابقة مسجلة</p>";
        } else {
            historyBox.innerHTML = "";
            snap.forEach(hDoc => {
                const h = hDoc.data();
                const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleDateString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '...';
                historyBox.innerHTML += `
                <div class="flex justify-between items-center text-[10px] py-1 border-b border-gray-50 last:border-0">
                    <span class="font-bold text-blue-800">${h.carPlate}</span>
                    <span class="text-gray-400 font-mono">${toEn(date)}</span>
                </div>`;
            });
        }
    }
};

// 5. تحميل سجل السيارة (يستدعى تلقائياً عند فتح بطاقة السيارة)
window.loadCarHistory = async (carId) => {
    const historyBox = document.getElementById(`car-history-${carId}`);
    if(!historyBox) return;
    
    try {
        const q = query(historyRef, where("carId", "==", carId), orderBy("actionDate", "desc"));
        const snap = await getDocs(q);
        
        if(snap.empty) {
            historyBox.innerHTML = "<p class='text-[11px] text-gray-400 text-center'>لا يوجد سجل تبديلات لهذه المركبة</p>";
        } else {
            historyBox.innerHTML = "<p class='text-[10px] font-bold text-orange-600 mb-2 border-b'>سجل المستخدمين السابقين:</p>";
            snap.forEach(hDoc => {
                const h = hDoc.data();
                const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '...';
                historyBox.innerHTML += `
                <div class="flex justify-between items-center text-[11px] py-1 border-b border-orange-50 last:border-0">
                    <span class="font-bold text-blue-900">${h.driverName}</span>
                    <span class="text-gray-400 font-mono">${toEn(date)}</span>
                </div>`;
            });
        }
    } catch (err) { historyBox.innerHTML = "خطأ في تحميل البيانات"; }
};

// 6. الحركات والمهام
window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    const snap = await getDocs(query(driversRef, orderBy("name", "asc")));
    select.innerHTML = '<option value="">-- اختر السائق المستلم --</option>';
    snap.forEach(d => { select.innerHTML += `<option value="${d.data().name}">${d.data().name}</option>`; });
};

window.confirmAssignDriver = async () => {
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        const carData = carSnap.data();
        
        if (carData.user === selectedDriver) {
            alert("هذا السائق هو المستخدم الحالي بالفعل");
            return;
        }

        // تحديث بيانات السيارة + إضافة سجل للأرشيف
        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: (carData.plateNumber + " " + carData.plateCode),
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        
        alert("تم نقل العهدة وتوثيق الحركة");
        window.closeAssignModal();
        window.loadCarHistory(currentCarId); // تحديث السجل فوراً
    } catch (e) { alert("حدث خطأ في النظام"); }
};

window.closeAssignModal = () => { 
    document.getElementById('driverAssignModal').classList.add('hidden'); 
    currentCarId = null; 
};

window.loadTransferHistory = () => {
    onSnapshot(query(historyRef, orderBy("actionDate", "desc")), (snap) => {
        const container = document.getElementById('historyCardsContainer');
        if(!container) return;
        container.innerHTML = "";
        if(snap.empty) {
            container.innerHTML = "<p class='text-center text-gray-400'>الأرشيف فارغ</p>";
            return;
        }
        snap.forEach(docSnap => {
            const h = docSnap.data();
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB') : '...';
            container.innerHTML += `
                <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <div><p class="font-bold text-blue-900 text-sm">${h.driverName}</p><p class="text-[10px] text-gray-400">${toEn(date)}</p></div>
                    <div class="text-orange-600 font-bold text-sm">${h.carPlate}</div>
                </div>`;
        });
    });
};

window.editDriver = async (id, oldN, oldP) => {
    const n = prompt("الاسم الجديد:", oldN);
    const p = prompt("الهاتف الجديد:", oldP);
    if(n && p) await updateDoc(doc(db, "drivers", id), { name: n, phone: toEn(p) });
};

window.deleteDriver = async (id) => { if(confirm("حذف السائق نهائياً؟")) await deleteDoc(doc(db, "drivers", id)); };
