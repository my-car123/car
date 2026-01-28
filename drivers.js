import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const driversRef = collection(db, "drivers");
const historyRef = collection(db, "transfers"); // تأكد أن هذا هو اسم الكولكشن عندك

let currentCarId = null;

// تحويل الأرقام للإنجليزية
const toEn = (n) => String(n).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

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

// 2. إضافة سائق
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
        alert("تمت الإضافة");
    } catch (e) { alert("خطأ في الحفظ"); }
};

// 3. عرض السائقين (الأكورديون)
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
                        <span class="text-blue-500 font-mono text-sm">${toEn(d.phone)}</span>
                    </div>
                    <div id="dr-content-${id}" class="hidden p-4 border-t bg-gray-50 transition-all">
                        <div class="flex gap-2 mb-4">
                            <button onclick="window.location.href='tel:${d.phone}'" class="btn btn-blue flex-1 !py-2 text-sm">📞 اتصال</button>
                            <button onclick="window.location.href='https://wa.me/${d.phone.replace(/\+/g,'')}'" class="btn bg-green-600 text-white flex-1 !py-2 text-sm">📱 واتساب</button>
                        </div>
                        <div class="flex gap-4">
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

// 4. سجل الأرشفة (البطاقات)
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
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB', {hour12:true}) : '...';
            const parts = h.carPlate ? h.carPlate.split(' ') : ['-','-'];

            const card = `
                <div class="bg-white p-4 rounded-xl border border-gray-200 card-shadow flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                    <div class="text-right">
                        <p class="text-[10px] text-gray-400 font-mono">${toEn(date)}</p>
                        <p class="font-bold text-blue-900">المستلم: ${h.driverName}</p>
                        <p class="text-xs text-orange-600 font-bold">نقل عهدة</p>
                    </div>
                    <div class="uae-plate scale-75">
                        <div class="plate-code">${parts[1] || ''}</div>
                        <div class="plate-number font-mono">${toEn(parts[0] || '')}</div>
                    </div>
                </div>`;
            container.innerHTML += card;
        });
    });
};

window.editDriver = async (id, oldName, oldPhone) => {
    const newName = prompt("تعديل الاسم:", oldName);
    const newPhone = prompt("تعديل الهاتف:", oldPhone);
    if (newName && newPhone) {
        await updateDoc(doc(db, "drivers", id), { name: newName, phone: toEn(newPhone) });
    }
};

window.deleteDriver = async (id) => {
    if (confirm("هل أنت متأكد؟")) await deleteDoc(doc(db, "drivers", id));
};

window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    const snapshot = await getDocs(query(driversRef, orderBy("name", "asc")));
    select.innerHTML = '<option value="">-- اختر السائق --</option>';
    snapshot.forEach(doc => { select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`; });
};

window.closeAssignModal = () => { document.getElementById('driverAssignModal').classList.add('hidden'); currentCarId = null; };

window.confirmAssignDriver = async () => {
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("يرجى اختيار السائق");
    try {
        const carSnap = await getDoc(doc(db, "cars", currentCarId));
        const carData = carSnap.data();
        await updateDoc(doc(db, "cars", currentCarId), { user: selectedDriver });
        await addDoc(historyRef, {
            carId: currentCarId,
            carPlate: (carData.plateNumber + " " + carData.plateCode),
            driverName: selectedDriver,
            actionDate: serverTimestamp()
        });
        alert("تم نقل العهدة بنجاح");
        window.closeAssignModal();
    } catch (e) { alert("حدث خطأ"); }
};
