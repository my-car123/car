import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();
const driversRef = collection(db, "drivers");
const historyRef = collection(db, "transfers");

let currentCarId = null;

const toEn = (n) => String(n).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

// === دوال التصميم (مضافة هنا للاستخدام داخل الملف) ===
const getPlateStyle = (emirate) => {
    const e = (emirate || "").trim();
    if (e.includes("الشارقة")) return { cls: "plate-sharjah", label: "Sharjah" };
    if (e.includes("رأس الخيمة")) return { cls: "plate-rak", label: "Ras Al Khaimah" };
    if (e.includes("عجمان")) return { cls: "plate-ajman", label: "Ajman" };
    if (e.includes("أبوظبي")) return { cls: "plate-abudhabi", label: "Abu Dhabi" };
    if (e.includes("دبي")) return { cls: "plate-dubai", label: "Dubai" };
    if (e.includes("الفجيرة")) return { cls: "plate-fujairah", label: "Fujairah" };
    if (e.includes("أم القيوين")) return { cls: "plate-uaq", label: "Umm Al Quwain" };
    return { cls: "plate-abudhabi", label: "UAE" };
};

const renderPlateHTML = (plateNumber, plateCode, emirate) => {
    const style = getPlateStyle(emirate);
    return `
    <div class="uae-plate ${style.cls}">
        <div class="plate-code">${plateCode || '-'}</div>
        <div class="plate-number-box">
            <div class="plate-number font-mono">${plateNumber || '-'}</div>
            <div class="plate-emirate-name">${style.label}</div>
        </div>
    </div>`;
};

// === 1. تبديل القائمة والأرشيف ===
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

// === 2. إضافة وتعديل وحذف العضو ===
window.addNewDriver = async () => {
    const name = document.getElementById('driverName').value.trim();
    const phone = toEn(document.getElementById('driverPhone').value.trim());
    if (!name || !phone) return alert("يرجى إدخال البيانات");
    try {
        await addDoc(driversRef, { name, phone, createdAt: serverTimestamp() });
        document.getElementById('driverName').value = "";
        document.getElementById('driverPhone').value = "";
    } catch (e) { alert("خطأ في الحفظ"); }
};

window.loadDrivers = () => {
    onSnapshot(query(driversRef, orderBy("createdAt", "desc")), (snapshot) => {
        const list = document.getElementById('driversList');
        if(!list) return;
        list.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const id = docSnap.id;
            list.innerHTML += `
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
        });
    });
};

window.toggleDrAccordion = (id) => document.getElementById(`dr-content-${id}`)?.classList.toggle('hidden');

// === 3. الأرشيف الكامل (تم تحديث التصميم) ===
window.loadTransferHistory = () => {
    onSnapshot(query(historyRef, orderBy("actionDate", "desc")), (snapshot) => {
        const container = document.getElementById('historyCardsContainer');
        if(!container) return;
        if (snapshot.empty) { container.innerHTML = "<p class='text-center text-gray-400'>الأرشيف فارغ</p>"; return; }

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
            container.innerHTML += `
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
                            const pNum = m.plateNumber || (m.carPlate ? m.carPlate.split(' ')[0] : '-');
                            const pCode = m.plateCode || (m.carPlate ? m.carPlate.split(' ')[1] : '-');
                            const pEmirate = m.emirate || '';
                            
                            return `
                            <div class="flex items-center justify-between border-b py-3 last:border-0">
                                <div class="flex flex-col gap-1">
                                    ${renderPlateHTML(pNum, pCode, pEmirate)}
                                    <div class="text-[9px] text-blue-600 font-bold">${m.adminName || ''}</div>
                                </div>
                                <div class="text-left"><p class="text-[10px] font-bold text-gray-500 font-mono">${toEn(date)}</p></div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        });
    });
};

window.toggleHistoryAccordion = (id) => document.getElementById(`hist-content-${id}`)?.classList.toggle('hidden');

// === 4. سجل حركة المركبة (تم تحديث التصميم) ===
window.showCarHistory = async (carId) => {
    const content = document.getElementById('carHistoryContent');
    const modal = document.getElementById('carHistoryModal');
    if(!content || !modal) return;
    content.innerHTML = '<p class="text-center text-blue-600">جاري جلب السجل...</p>';
    modal.classList.remove('hidden');

    try {
        const carDoc = await getDoc(doc(db, "cars", carId));
        const carData = carDoc.exists() ? carDoc.data() : {};

        const q = query(historyRef, where("carId", "==", carId));
        const snap = await getDocs(q);
        let dataList = [];
        snap.forEach(docSnap => dataList.push(docSnap.data()));
        dataList.sort((a, b) => (b.actionDate?.seconds || 0) - (a.actionDate?.seconds || 0));

        if (dataList.length === 0) { content.innerHTML = '<p class="text-center text-gray-400">لا يوجد سجل</p>'; return; }

        content.innerHTML = dataList.map(h => {
            const date = h.actionDate ? new Date(h.actionDate.seconds * 1000).toLocaleString('en-GB', {hour12:true, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '...';
            const pNum = h.plateNumber || (h.carPlate ? h.carPlate.split(' ')[0] : '-');
            const pCode = h.plateCode || (h.carPlate ? h.carPlate.split(' ')[1] : '-');
            const pEmirate = h.emirate || carData.emirate || '';

            return `
                <div class="bg-gray-50 p-3 rounded-lg border-r-4 border-green-500 flex justify-between items-center shadow-sm mb-2 inner-history-item" data-search="${h.driverName} ${date}">
                    <div>
                        <p class="text-[10px] text-gray-400 mb-1 italic text-right">المستلم:</p>
                        <p class="font-bold text-blue-900">${h.driverName}</p>
                        <p class="text-[9px] text-blue-500 font-bold mt-1">${h.adminName || ''}</p>
                    </div>
                    <div class="text-left">
                        ${renderPlateHTML(pNum, pCode, pEmirate)}
                        <p class="text-[10px] font-mono text-gray-600 bg-white px-2 py-1 rounded border shadow-sm mt-1">${toEn(date)}</p>
                    </div>
                </div>`;
        }).join('');
    } catch (e) { content.innerHTML = '<p class="text-red-500">خطأ في التحميل</p>'; }
};

window.filterInnerHistory = () => {
    const term = document.getElementById('innerHistorySearch').value.toLowerCase();
    document.querySelectorAll('.inner-history-item').forEach(item => {
        item.style.display = item.getAttribute('data-search').toLowerCase().includes(term) ? 'block' : 'none';
    });
};

window.closeCarHistoryModal = () => document.getElementById('carHistoryModal').classList.add('hidden');

// === 5. نقل العهدة (تم تحديثه لحفظ بيانات اللوحة) ===
window.openAssignDriver = async (carId) => {
    currentCarId = carId;
    const select = document.getElementById('driverSelect');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    document.getElementById('driverAssignModal').classList.remove('hidden');
    const snap = await getDocs(query(driversRef, orderBy("name", "asc")));
    select.innerHTML = '<option value="">-- اختر العضــو --</option>';
    snap.forEach(doc => select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`);
};

window.confirmAssignDriver = async () => {
    const selectedDriver = document.getElementById('driverSelect').value;
    if (!selectedDriver || !currentCarId) return alert("اختر العضو");

    const userEmail = auth.currentUser ? auth.currentUser.email : "";
    let adminDisplayName = "";
    if (userEmail === "saad323m@gmail.com") adminDisplayName = "By:MOHAMED SAAD";
    else if (userEmail === "n2.saad113@gmail.com") adminDisplayName = "By:MOHAMED SAAD_2";
    else if (userEmail === "p.my123.car@gmail.com") adminDisplayName = "By:SHADI";
    else adminDisplayName = "By: Unknown Admin";

    try {
        const carRef = doc(db, "cars", currentCarId);
        const carSnap = await getDoc(carRef);
        const carData = carSnap.data();
        if (carData.user === selectedDriver) return alert("العضو مستلم بالفعل");
        
        await updateDoc(carRef, { user: selectedDriver });
        
        // حفظ البيانات الكاملة للوحة هنا
        await addDoc(historyRef, { 
            carId: currentCarId, 
            carPlate: (carData.plateNumber + " " + carData.plateCode), 
            plateNumber: carData.plateNumber, // جديد
            plateCode: carData.plateCode,     // جديد
            emirate: carData.emirate,         // جديد
            driverName: selectedDriver, 
            adminName: adminDisplayName, 
            actionDate: serverTimestamp() 
        });

        alert("تم النقل بواسطة " + adminDisplayName);
        window.closeAssignModal();
    } catch (e) { alert("فشل النقل"); console.error(e); }
};

window.closeAssignModal = () => document.getElementById('driverAssignModal').classList.add('hidden');
window.editDriver = async (id, oldN, oldP) => {
    const n = prompt("الاسم:", oldN); const p = prompt("الهاتف:", oldP);
    if (n && p) await updateDoc(doc(db, "drivers", id), { name: n, phone: toEn(p) });
};
window.deleteDriver = async (id) => { if(confirm("حذف نهائي؟")) await deleteDoc(doc(db, "drivers", id)); };