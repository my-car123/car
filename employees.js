import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const employeesRef = collection(db, "employees");

// وظيفة إغلاق المودال مع مسح الحقول
window.closeEmpModal = () => {
    document.getElementById('employeeModal').classList.add('hidden');
    document.getElementById('employeeForm').reset();
    document.getElementById('empEditDocId').value = "";
    document.getElementById('empModalTitle').innerText = "إضافة موظف جديد";
};

// 1. وظيفة حفظ أو تعديل موظف
document.getElementById('employeeForm').onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('empEditDocId').value;
    
    const empData = {
        fileNumber: document.getElementById('empFileNumber').value.trim(),
        name: document.getElementById('empName').value.trim(),
        nationality: document.getElementById('empNationality').value.trim(),
        sponsor: document.getElementById('empSponsor').value.trim(),
        workLocation: document.getElementById('empWorkLocation').value.trim(),
        residencyEnd: document.getElementById('residencyEnd').value,
        workCardEnd: document.getElementById('workCardEnd').value,
        medicalEnd: document.getElementById('medicalEnd').value,
        updatedAt: serverTimestamp()
    };

    try {
        if (editId) {
            await updateDoc(doc(db, "employees", editId), empData);
        } else {
            empData.createdAt = serverTimestamp();
            await addDoc(employeesRef, empData);
        }
        window.closeEmpModal();
    } catch (error) {
        alert("حدث خطأ أثناء الحفظ");
    }
};

// 2. تحميل وعرض الموظفين
function loadEmployees() {
    onSnapshot(query(employeesRef, orderBy("createdAt", "desc")), (snapshot) => {
        const list = document.getElementById('employeesList');
        const empNotifyBox = document.getElementById('empNotificationsBox');
        const empNotifyList = document.getElementById('empNotificationsList');
        
        if(!list) return;
        
        // مسح القوائم قبل إعادة الملء لمنع التكرار
        list.innerHTML = "";
        empNotifyList.innerHTML = "";
        
        let total = 0;
        let alertsCount = 0;

        snapshot.forEach((docSnap) => {
            const emp = docSnap.data();
            const id = docSnap.id;
            total++;

            const statusRes = window.checkExpiry(emp.residencyEnd);
            const statusWork = window.checkExpiry(emp.workCardEnd);
            const statusMed = window.checkExpiry(emp.medicalEnd);

            const isExpired = (statusRes === "expired" || statusWork === "expired" || statusMed === "expired");
            const isExpiring = (statusRes === "expiring" || statusWork === "expiring" || statusMed === "expiring");

            let borderStyle = "border: 2px solid #7c3aed !important;";
            if (isExpired) {
                alertsCount++;
                borderStyle = "border: 4px solid #dc2626 !important;";
                empNotifyList.innerHTML += `<li class="text-red-700 font-bold">• انتهى: (${emp.name}) - ملف: ${emp.fileNumber || 'بدون'}</li>`;
            } else if (isExpiring) {
                alertsCount++;
                borderStyle = "border: 4px solid #eab308 !important;";
                empNotifyList.innerHTML += `<li class="text-yellow-700 font-bold">• قريباً: (${emp.name}) - إقامة/بطاقة/تأمين</li>`;
            }

            list.innerHTML += `
                <div class="emp-card card-shadow bg-white rounded-xl overflow-hidden mb-4" style="${borderStyle}" data-search-emp="${emp.name} ${emp.fileNumber} ${emp.workLocation}">
                    <div onclick="window.toggleAccordion('emp-${id}')" class="p-5 flex flex-col items-center cursor-pointer hover:bg-gray-50 border-b">
                        <span class="text-purple-600 font-bold mb-1 text-sm font-mono">FILE: ${emp.fileNumber || 'N/A'}</span>
                        <div class="text-2xl font-bold text-gray-800">${emp.name}</div>
                        <div class="text-sm text-gray-600 font-bold">${emp.sponsor || 'بدون كفيل'} - ${emp.workLocation || 'بدون مكان'}</div>
                    </div>
                    
                    <div id="content-emp-${id}" class="accordion-content hidden p-6 bg-purple-50/30">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 text-right">
                            <div><p class="text-xs text-gray-400">رقم الملف</p><strong>${emp.fileNumber || '-'}</strong></div>
                            <div><p class="text-xs text-gray-400">الجنسية</p><strong>${emp.nationality || '-'}</strong></div>
                            <div><p class="text-xs text-gray-400">الكفيل</p><strong>${emp.sponsor || '-'}</strong></div>
                            
                            <div class="p-2 rounded ${statusRes === 'expired' ? 'bg-red-100 text-red-700' : (statusRes === 'expiring' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-50')}">
                                <p class="text-xs font-bold">انتهاء الإقامة</p>
                                <strong class="font-mono">${emp.residencyEnd}</strong>
                            </div>
                            
                            <div class="p-2 rounded ${statusWork === 'expired' ? 'bg-red-100 text-red-700' : (statusWork === 'expiring' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-50')}">
                                <p class="text-xs font-bold">انتهاء بطاقة العمل</p>
                                <strong class="font-mono">${emp.workCardEnd}</strong>
                            </div>
                            
                            <div class="p-2 rounded ${statusMed === 'expired' ? 'bg-red-100 text-red-700' : (statusMed === 'expiring' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-50')}">
                                <p class="text-xs font-bold">انتهاء التأمين الطبي</p>
                                <strong class="font-mono">${emp.medicalEnd}</strong>
                            </div>
                        </div>
                        
                        <div class="flex gap-2 border-t pt-4">
                            <button onclick="editEmployee('${id}')" class="btn btn-purple flex-1 text-sm">تعديل البيانات</button>
                            <button onclick="deleteEmployee('${id}')" class="btn btn-red flex-1 text-sm">حذف الموظف</button>
                        </div>
                    </div>
                </div>`;
        });
        
        document.getElementById('totalEmployees').innerText = total;
        document.getElementById('empExpiryAlerts').innerText = alertsCount;
        
        // إظهار أو إخفاء صندوق التنبيهات بناءً على وجودها
        if (alertsCount > 0) empNotifyBox.classList.remove('hidden');
        else empNotifyBox.classList.add('hidden');
    });
}

window.editEmployee = async (id) => {
    const docSnap = await getDoc(doc(db, "employees", id));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('empEditDocId').value = id;
        document.getElementById('empFileNumber').value = d.fileNumber || "";
        document.getElementById('empName').value = d.name;
        document.getElementById('empNationality').value = d.nationality;
        document.getElementById('empSponsor').value = d.sponsor;
        document.getElementById('empWorkLocation').value = d.workLocation;
        document.getElementById('residencyEnd').value = d.residencyEnd;
        document.getElementById('workCardEnd').value = d.workCardEnd;
        document.getElementById('medicalEnd').value = d.medicalEnd;
        
        document.getElementById('empModalTitle').innerText = "تعديل بيانات الموظف";
        document.getElementById('employeeModal').classList.remove('hidden');
    }
};

window.deleteEmployee = async (id) => {
    if (confirm("هل أنت متأكد من حذف الموظف نهائياً؟")) {
        await deleteDoc(doc(db, "employees", id));
    }
};

window.filterEmployees = () => {
    const term = document.getElementById('empSearchInput').value.toLowerCase();
    document.querySelectorAll('[data-search-emp]').forEach(card => {
        card.style.display = card.getAttribute('data-search-emp').toLowerCase().includes(term) ? 'block' : 'none';
    });
};

loadEmployees();
