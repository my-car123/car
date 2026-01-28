import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const historyRef = collection(db, "transfers");

let currentCarId = null;

const toEn = (n) => String(n).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

// 1. التنقل بين التبويبات الرئيسية
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

// 2. التبديل بين القائمة والأرشيف (التبويبات الداخلية للسائقين)
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
        await addDoc(driversRef, {
            name: name,
            phone: phone,
            createdAt: serverTimestamp()
        });
        document.getElementById('driverName').value = "";
        document.getElementById('driverPhone').value = "";
        alert("تمت إضافة السائق بنجاح");
    } catch (e) { alert("خطأ في الحفظ"); }
};

// 4. عرض السائقين (بطاقات مطوية مع أرشيف شخصي)
window.loadDrivers = () => {
    const q = query(driversRef, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('driversList');
        if(!list) return;
        list.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const id = docSnap.id;
            const card = `
                <div class="bg-white rounded-xl card-shadow border-r-4 border-blue-600 overflow-hidden mb-3">
                    <div onclick="toggleDrAccordion('${id}', '${d.name}')" class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-blue-900">${d.name}</h3>
                        <span class="text-blue-500 font-mono text-xs">عرض الملف ▾</span>
                    </div>
                    <div id="dr-content-${id}" class="hidden p-4 border-t bg-gray-50 transition-all">
                        <div class="mb-4 text-center">
                            <p class="text-gray-600 font-mono font-bold">${toEn(d.phone)}</p>
                        </div>
                        
                        <div id="dr-history-${id}" class="mb-4 p-3 bg-white rounded-lg border border-blue-100 max-h-32 overflow-y-auto">
                            <p class="text-[10px] text-gray-400 italic">جاري تحميل سجل العهد...</p>
                        </div>

                        <div class="flex gap-2 mb-4">
                            <button onclick="window.location.href='tel:${d.phone}'" class="btn btn-blue flex-1 !py-2 text-xs">📞 اتصال</button>
                            <button onclick="window.location.href='https://wa.me/${d.phone.replace(/\+/g,'')}'" class="btn bg-green-600 text-white flex-1 !py-2 text-xs">📱 واتساب</button>
                        </div>
                        <div class="flex justify-around border-t pt-2">
                            <button onclick="editDriver('${id}', '${d.name}', '${d.phone}')" class="text-blue-600 font-bold text-xs">تعديل</button>
                            <button onclick="deleteDriver('${id}')" class="text-red-600 font-bold text-xs">حذف</button>
                        </div>
                    </div>
                </div>`;
            list.innerHTML += card;
        });
    });
};

// تحميل سجل السائق الشخصي عند فتح البطاقة
window.toggleDrAccordion = async (id, driverName) => {
    const el = document.getElementById(`dr-content-${id}`);
    if(!el) return;
    el.classList.toggle('hidden');

    if(!el.classList.contains('hidden')){
        const historyDiv = document.getElementById(`dr-history-${id}`);
        const q = query(historyRef, where("driverName", "==", driverName), orderBy("actionDate", "desc"));
        const snap = await getDocs(q);
        
        if(snap.empty) {
            historyDiv.innerHTML = "<p class='text-[10px] text-gray-400 text-center'>لا يوجد سجل عهد سابقة</p>";
            return;
        }

        historyDiv.innerHTML = "<p class='text-[10px] font-bold text-blue-700 mb-1 border-b'>سجل العهد المستلمة:</p>";
        snap.forEach(doc => {
            const h = doc.data();
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleDateString('en-GB') : '...';
            historyDiv.innerHTML += `
                <div class="flex justify-between text-[10px] py-1 border-b border-gray-50">
                    <span class="font-bold text-gray-700">${h.carPlate}</span>
                    <span class="text-gray-400">${toEn(date)}</span>
                </div>`;
        });
    }
};

// 5. تحميل سجل المركبة (يستدعى من index.html عند فتح بطاقة السيارة)
window.loadCarHistory = async (carId) => {
    const historyDiv = document.getElementById(`car-history-${carId}`);
    if(!historyDiv) return;

    const q = query(historyRef, where("carId", "==", carId), orderBy("actionDate", "desc"));
    const snap = await getDocs(q);

    if(snap.empty) {
        historyDiv.innerHTML = "<p class='text-xs text-gray-400 text-center'>لا يوجد مستخدمين سابقين مسجلين</p>";
        return;
    }

    historyDiv.innerHTML = "<p class='text-xs font-bold text-orange-700 mb-2 border-b'>سجل مستخدمي المركبة:</p>";
    snap.forEach(doc => {
        const h = doc.data();
        const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleDateString('en-GB', {hour:'2-digit', minute:'2-digit', hour12:true}) : '...';
        historyDiv.innerHTML += `
            <div class="flex justify-between items-center text-xs py-1 border-b border-orange-50">
                <span class="font-bold text-blue-900">${h.driverName}</span>
                <span class="text-[10px] text-gray-500 font-mono">${toEn(date)}</span>
            </div>`;
    });
};

// 6. سجل الأرشفة العام (بطاقات مطوية)
window.loadTransferHistory = () => {
    const q = query(historyRef, orderBy("actionDate", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('historyCardsContainer');
        if(!container) return;
        container.innerHTML = "";
        
        if (snapshot.empty) {
            container.innerHTML = "<p class='text-center text-gray-400'>لا توجد بيانات في الأرشيف حالياً</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const h = docSnap.data();
            const id = docSnap.id;
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB', {hour12:true}) : '...';
            const parts = h.carPlate ? h.carPlate.split(' ') : ['-','-'];

            const card = `
                <div class="bg-white rounded-xl border border-gray-200 card-shadow overflow-hidden mb-2">
                    <div onclick="toggleHistoryAccordion('${id}')" class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center bg-white">
                        <div class="text-right">
                             <p class="font-bold text-blue-900 text-sm">المستلم: ${h.driverName}</p>
                             <p class="text-[10px] text-gray-400 font-mono">${toEn(date)}</p>
                        </div>
                        <span class="text-orange-500 text-xs font-bold">عرض اللوحة ▾</span>
                    </div>
                    <div id="hist-content-${id}" class="hidden p-4 bg-orange-50/30 flex justify-center border-t">
                        <div class="uae-plate">
                            <div class="plate-code">${parts[1] || ''}</div>
                            <div class="plate-number font-mono">${toEn(parts[0] || '')}</div>
                        </div>
                    </div>
                </div>`;
            container.innerHTML += card;
        });
    });
};

window.toggleHistoryAccordion = (id) => {
    const el = document.getElementById(`hist-content-${id}`);
    if(el) el.classList.toggle('hidden');
};

window.editDriver = async (id, oldName, oldPhone) => {
    const newName = prompt("تعديل الاسم:", oldName);
    const newPhone = prompt("تعديل الهاتف:", oldPhone);
    if (newName && newPhone) {
        await updateDoc(doc(db, "drivers", id), { name: newName, phone: toEn(newPhone) });
    }
};

window.deleteDriver = async (id) => {
    if (confirm("هل أنت متأكد من حذف السائق؟")) await deleteDoc(doc(db, "drivers", id));
};

window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
    select.innerHTML = '<option value="">-- اختر السائق المستلم --</option>';
    snapshot.forEach(doc => { select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
};

window.closeAssignModal = () => { document.getElementById('driverAssignModal').classList.add('hidden'); currentCarId = null; };

// التحقق من المتعهد الحالي وتسجيل الحركة
window.confirmAssignDriver = async () => {
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");
    
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        const carData = carSnap.data();

        if (carData.user === selectedDriver) {
            alert(`خطأ: السائق (${selectedDriver}) هو المتعهد الحالي لهذه السيارة بالفعل. لا يمكن التعهد مرتين لنفس المركبة.`);
            return;
        }

        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: (carData.plateNumber + " " + carData.plateCode),
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        alert("تم نقل العهدة بنجاح وتوثيق الحركة بالسجلات");
        window.closeAssignModal();
    } catch (e) { alert("حدث خطأ أثناء نقل العهدة"); }
};
