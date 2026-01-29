import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const historyRef = collection(db, "transfers");

let currentCarId = null;

// دالة تحويل الأرقام العربية إلى إنجليزية لضمان البحث
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

// 2. التبديل بين قائمة الأعضاء والأرشيف العميق
window.switchDriverSubTab = (sub) => {
    const listDiv = document.getElementById('driverListContent');
    const historyDiv = document.getElementById('driverHistoryContent');
    const listBtn = document.getElementById('subTabListBtn');
    const historyBtn = document.getElementById('subTabHistoryBtn');

    if(sub === 'list') {
        listDiv.classList.remove('hidden');
        historyDiv.classList.add('hidden');
        listBtn.className = 'btn btn-blue flex-1 max-w-[200px]';
        historyBtn.className = 'btn btn-gray flex-1 max-w-[200px]';
        loadDrivers();
    } else {
        listDiv.classList.add('hidden');
        historyDiv.classList.remove('hidden');
        listBtn.className = 'btn btn-gray flex-1 max-w-[200px]';
        historyBtn.className = 'btn btn-blue flex-1 max-w-[200px]';
        loadFullHistory();
    }
};

// 3. إدارة الأعضاء (إضافة، عرض، حذف)
window.addNewDriver = async () => {
    const name = document.getElementById('driverName').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();
    if(!name) return alert("يرجى إدخال اسم العضو");
    try {
        await addDoc(driversRef, { name, phone, createdAt: serverTimestamp() });
        document.getElementById('driverName').value = "";
        document.getElementById('driverPhone').value = "";
    } catch(e) { alert("خطأ في حفظ العضو"); }
};

function loadDrivers() {
    onSnapshot(query(driversRef, orderBy("createdAt", "desc")), (snap) => {
        const container = document.getElementById('driversList');
        if(!container) return;
        container.innerHTML = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            container.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow border-r-4 border-blue-500 flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-lg text-blue-900">${d.name}</h4>
                        <p class="text-sm text-gray-500 font-mono">${d.phone || '-'}</p>
                    </div>
                    <button onclick="deleteDriver('${docSnap.id}')" class="text-red-500 hover:bg-red-50 p-2 rounded-full">🗑️</button>
                </div>`;
        });
    });
}

window.deleteDriver = async (id) => { if(confirm("هل أنت متأكد من حذف العضو؟")) await deleteDoc(doc(db, "drivers", id)); };

// 4. نظام الأرشيف المطور (Deep Archive)
function loadFullHistory() {
    onSnapshot(query(historyRef, orderBy("actionDate", "desc")), (snap) => {
        const container = document.getElementById('historyCardsContainer');
        if(!container) return;
        container.innerHTML = "";
        snap.forEach(docSnap => {
            const h = docSnap.data();
            const dateStr = h.actionDate ? h.actionDate.toDate().toLocaleString('ar-AE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '...';
            container.innerHTML += `
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 history-item" data-search="${h.driverName} ${h.carPlate}">
                    <div class="flex justify-between items-start">
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">${h.carPlate}</span>
                        <span class="text-[10px] text-gray-400 font-mono">${dateStr}</span>
                    </div>
                    <div class="mt-2 text-gray-700">
                        استلمها العضو: <span class="font-bold text-orange-600">${h.driverName}</span>
                    </div>
                </div>`;
        });
    });
}

// 5. محرك البحث في الأرشيف
window.filterHistory = () => {
    const term = document.getElementById('historySearchInput').value.toLowerCase();
    document.querySelectorAll('.history-item').forEach(item => {
        const text = item.getAttribute('data-search').toLowerCase();
        item.style.display = text.includes(term) ? 'block' : 'none';
    });
};

// 6. عرض سجل "سيارة محددة" فقط
window.showCarHistory = async (carId) => {
    currentCarId = carId;
    const modal = document.getElementById('carHistoryModal');
    const content = document.getElementById('carHistoryContent');
    content.innerHTML = '<p class="text-center p-4">جاري تحميل السجل...</p>';
    modal.classList.remove('hidden');

    const q = query(historyRef, where("carId", "==", carId), orderBy("actionDate", "desc"));
    const snap = await getDocs(q);
    
    if(snap.empty) {
        content.innerHTML = '<p class="text-center p-4 text-gray-500 text-sm italic">لا توجد حركات سابقة مسجلة لهذه السيارة</p>';
        return;
    }

    content.innerHTML = "";
    snap.forEach(docSnap => {
        const h = docSnap.data();
        const dateStr = h.actionDate ? h.actionDate.toDate().toLocaleString('ar-AE') : '...';
        content.innerHTML += `
            <div class="inner-history-item bg-green-50 p-3 rounded-lg border-r-4 border-green-500 text-sm" data-search="${dateStr} ${h.driverName}">
                <div class="flex justify-between font-bold text-green-800 mb-1">
                    <span>${h.driverName}</span>
                    <span class="text-[10px] font-mono">${dateStr}</span>
                </div>
                <div class="text-xs text-gray-600 italic">تم نقل العهدة بنجاح</div>
            </div>`;
    });
};

window.filterInnerHistory = () => {
    const term = document.getElementById('innerHistorySearch').value.toLowerCase();
    document.querySelectorAll('.inner-history-item').forEach(item => {
        item.style.display = item.getAttribute('data-search').toLowerCase().includes(term) ? 'block' : 'none';
    });
};

window.closeCarHistoryModal = () => document.getElementById('carHistoryModal').classList.add('hidden');

// 7. تبديل العهدة
window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
    select.innerHTML = '<option value="">-- اختر العضــو --</option>';
    snapshot.forEach(doc => { select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
};

window.closeAssignModal = () => { 
    document.getElementById('driverAssignModal').classList.add('hidden'); 
    currentCarId = null; 
};

window.confirmAssignDriver = async () => {
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار العضــو");
    
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        const carData = carSnap.data();

        if (carData.user === selectedDriver) {
            alert(`خطأ: العضــو (${selectedDriver}) هو المتعهد الحالي بالفعل.`);
            return;
        }

        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: (carData.plateNumber + " " + carData.plateCode),
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        
        alert("تم نقل العهدة وتسجيل الحركة بنجاح");
        closeAssignModal();
    } catch (e) { alert("حدث خطأ أثناء نقل العهدة"); }
};
