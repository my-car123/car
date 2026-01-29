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
        if(btnCars) btnCars.className = 'btn btn-blue px-8 shadow-md';
        if(btnDrivers) btnDrivers.className = 'btn btn-gray px-8 shadow-md';
    } else {
        if(btnCars) btnCars.className = 'btn btn-gray px-8 shadow-md';
        if(btnDrivers) btnDrivers.className = 'btn btn-blue px-8 shadow-md';
        window.switchDriverSubTab('list');
    }
};

// 2. التبديل بين القائمة والأرشيف
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
        alert("تمت الإضافة بنجاح");
    } catch (e) { alert("خطأ في الحفظ"); }
};

// 4. عرض السائقين
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
                    <div onclick="toggleDrAccordion('${id}')" class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-blue-900">${d.name}</h3>
                        <span class="text-blue-500 font-mono text-sm">التفاصيل ▾</span>
                    </div>
                    <div id="dr-content-${id}" class="hidden p-4 border-t bg-gray-50 transition-all">
                        <div class="mb-3 text-gray-600 font-mono text-center font-bold">${toEn(d.phone)}</div>
                        <div class="flex gap-2 mb-4">
                            <button onclick="window.location.href='tel:${d.phone}'" class="btn btn-blue flex-1 !py-2 text-sm">📞 اتصال</button>
                            <button onclick="window.location.href='https://wa.me/${d.phone.replace(/\+/g,'')}'" class="btn bg-green-600 text-white flex-1 !py-2 text-sm">📱 واتساب</button>
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

window.toggleDrAccordion = (id) => {
    const el = document.getElementById(`dr-content-${id}`);
    if(el) el.classList.toggle('hidden');
};

// 5. سجل الأرشفة
window.loadTransferHistory = () => {
    const q = query(historyRef, orderBy("actionDate", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('historyCardsContainer');
        if(!container) return;
        
        if (snapshot.empty) {
            container.innerHTML = "<p class='text-center text-gray-400'>لا توجد بيانات في الأرشيف حالياً</p>";
            return;
        }

        const grouped = {};
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (!grouped[data.driverName]) grouped[data.driverName] = [];
            grouped[data.driverName].push({ id: docSnap.id, ...data });
        });

        container.innerHTML = "";
        Object.keys(grouped).forEach(driverName => {
            const driverId = driverName.replace(/\s+/g, '-');
            const moves = grouped[driverName];
            
            const card = `
                <div class="bg-white rounded-xl border border-gray-200 card-shadow overflow-hidden mb-3">
                    <div onclick="toggleHistoryAccordion('${driverId}')" class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center bg-blue-50/30">
                        <div class="text-right">
                             <p class="font-bold text-blue-900">المستلم: ${driverName}</p>
                             <p class="text-xs text-gray-500">عدد الحركات: ${moves.length}</p>
                        </div>
                        <span class="text-orange-500 text-xs font-bold">عرض السجل ▾</span>
                    </div>
                    <div id="hist-content-${driverId}" class="hidden p-4 bg-white border-t">
                        ${moves.map(m => {
                            const date = m.actionDate ? new Date(m.actionDate.seconds * 1000).toLocaleString('en-GB', {hour12:true}) : '...';
                            const parts = m.carPlate ? m.carPlate.split(' ') : ['-','-'];
                            return `
                            <div class="flex items-center justify-between border-b py-3 last:border-0">
                                <div class="uae-plate scale-75 origin-right">
                                    <div class="plate-code">${parts[1] || ''}</div>
                                    <div class="plate-number font-mono">${toEn(parts[0] || '')}</div>
                                </div>
                                <div class="text-left">
                                    <p class="text-[10px] font-bold text-gray-500 font-mono">${toEn(date)}</p>
                                </div>
                            </div>`;
                        }).join('')}
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

// 6. عرض سجل حركات سيارة محددة (تم الإصلاح الجذري لمشكلة الـ Index والخطأ الظاهر بالصورة)
window.showCarHistory = async (carId) => {
    const content = document.getElementById('carHistoryContent');
    const modal = document.getElementById('carHistoryModal');
    
    if(!content || !modal) return;

    content.innerHTML = '<div class="text-center py-4"><span class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span><p class="mt-2 text-blue-600">جاري جلب السجل...</p></div>';
    modal.classList.remove('hidden');

    try {
        // تم استبدال الاستعلام المركب باستعلام بسيط لتجنب خطأ Firebase Index
        const q = query(historyRef, where("carId", "==", carId));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            content.innerHTML = '<div class="text-center py-8"><p class="text-gray-400 font-bold">لا يوجد سجل حركات لهذه المركبة</p></div>';
            return;
        }

        let dataList = [];
        snap.forEach(docSnap => {
            dataList.push(docSnap.data());
        });

        // الترتيب اليدوي لضمان السرعة وعدم الاعتماد على فهارس السيرفر
        dataList.sort((a, b) => {
            const timeA = a.actionDate ? a.actionDate.seconds : 0;
            const timeB = b.actionDate ? b.actionDate.seconds : 0;
            return timeB - timeA;
        });

        let html = "";
        dataList.forEach(h => {
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB', {hour12:true, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '...';
            html += `
                <div class="bg-gray-50 p-3 rounded-lg border-r-4 border-green-500 flex justify-between items-center shadow-sm mb-2">
                    <div>
                        <p class="text-[10px] text-gray-400 mb-1 italic text-right">السائق المستلم:</p>
                        <p class="font-bold text-blue-900">${h.driverName}</p>
                    </div>
                    <div class="text-left">
                        <p class="text-[10px] font-mono text-gray-600 bg-white px-2 py-1 rounded border shadow-sm">${toEn(date)}</p>
                    </div>
                </div>`;
        });
        content.innerHTML = html;
    } catch (e) {
        console.error("Firebase Error Details:", e);
        content.innerHTML = `
            <div class="text-center py-4">
                <p class="text-red-500 font-bold">⚠️ خطأ في جلب البيانات</p>
                <button onclick="showCarHistory('${carId}')" class="mt-2 text-blue-600 underline">إعادة المحاولة</button>
            </div>`;
    }
};

window.closeCarHistoryModal = () => {
    const modal = document.getElementById('carHistoryModal');
    if(modal) modal.classList.add('hidden');
};

window.editDriver = async (id, oldName, oldPhone) => {
    const newName = prompt("تعديل الاسم:", oldName);
    const newPhone = prompt("تعديل الهاتف:", oldPhone);
    if (newName && newPhone) {
        await updateDoc(doc(db, "drivers", id), { name: newName, phone: toEn(newPhone) });
    }
};

window.deleteDriver = async (id) => {
    if (confirm("هل أنت متأكد؟ سيتم حذف السائق نهائياً")) await deleteDoc(doc(db, "drivers", id));
};

window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    if(!select) return;
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
    select.innerHTML = '<option value="">-- اختر السائق --</option>';
    snapshot.forEach(doc => { select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
};

window.closeAssignModal = () => { 
    const modal = document.getElementById('driverAssignModal');
    if(modal) modal.classList.add('hidden'); 
    currentCarId = null; 
};

window.confirmAssignDriver = async () => {
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");
    
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        const carData = carSnap.data();

        if (carData.user === selectedDriver) {
            alert(`خطأ: السائق (${selectedDriver}) هو المتعهد الحالي بالفعل.`);
            return;
        }

        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: (carData.plateNumber + " " + carData.plateCode),
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        alert("تم نقل العهدة وتسجيل الحركة في الأرشيف");
        window.closeAssignModal();
    } catch (e) { alert("حدث خطأ أثناء النقل"); }
};
