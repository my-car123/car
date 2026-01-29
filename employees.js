import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();
const employeesRef = collection(db, "employees");

// 1. وظيفة حفظ أو تعديل موظف
document.getElementById('employeeForm').onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('empEditDocId').value;
    
    const empData = {
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
            alert("تم تحديث بيانات الموظف");
        } else {
            empData.createdAt = serverTimestamp();
            await addDoc(employeesRef, empData);
            alert("تم إضافة الموظف بنجاح");
        }
        window.toggleModal('employeeModal');
        document.getElementById('employeeForm').reset();
        document.getElementById('empEditDocId').value = "";
    } catch (error) {
        console.error("Error:", error);
        alert("حدث خطأ أثناء الحفظ");
    }
};

// 2. تحميل وعرض الموظفين بنظام الأكورديون
function loadEmployees() {
    onSnapshot(query(employeesRef, orderBy("createdAt", "desc")), (snapshot) => {
        const list = document.getElementById('employeesList');
        const notifyList = document.getElementById('notificationsList');
        // ملاحظة: لا نمسح notifyList بالكامل حتى لا نحذف تنبيهات السيارات
        
        if(!list) return;
        list.innerHTML = "";
        
        let total = 0;
        let alerts = 0;

        snapshot.forEach((docSnap) => {
            const emp = docSnap.data();
            const id = docSnap.id;
            total++;

            // فحص التواريخ الثلاثة
            const statusRes = window.checkExpiry(emp.residencyEnd);
            const statusWork = window.checkExpiry(emp.workCardEnd);
            const statusMed = window.checkExpiry(emp.medicalEnd);

            const isExpired = (statusRes === "expired" || statusWork === "expired" || statusMed === "expired");
            const isExpiring = (statusRes === "expiring" || statusWork === "expiring" || statusMed === "expiring");

            let borderStyle = "border: 2px solid #7c3aed !important;"; // اللون البنفسجي الافتراضي للموظفين
            if (isExpired) {
                alerts++;
                borderStyle = "border: 4px solid #dc2626 !important;";
                notifyList.innerHTML += `<li class="text-red-700 font-bold">• تنبيه: إقامات/بطاقات الموظف (${emp.name}) منتهية!</li>`;
            } else if (isExpiring) {
                alerts++;
                borderStyle = "border: 4px solid #eab308 !important;";
                notifyList.innerHTML += `<li class="text-yellow-700 font-bold">• تنبيه: مستندات الموظف (${emp.name}) ستنتهي قريباً.</li>`;
            }

            list.innerHTML += `
                <div class="emp-card card-shadow bg-white rounded-xl overflow-hidden mb-4" style="${borderStyle}" data-search-emp="${emp.name} ${emp.nationality} ${emp.sponsor}">
                    <div onclick="window.toggleAccordion('emp-${id}')" class="p-5 flex flex-col items-center cursor-pointer hover:bg-gray-50 border-b">
                        <span class="text-purple-600 font-bold mb-1 text-sm">EMPLOYEE FILE</span>
                        <div class="text-2xl font-bold text-gray-800">${emp.name}</div>
                        <div class="text-sm text-gray-500">${emp.workLocation || 'بدون مكان عمل'}</div>
                    </div>
                    
                    <div id="content-emp-${id}" class="accordion-content hidden p-6 bg-purple-50/30">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 text-right">
                            <div><p class="text-xs text-gray-400">الجنسية</p><strong>${emp.nationality || '-'}</strong></div>
                            <div><p class="text-xs text-gray-400">الكفيل</p><strong>${emp.sponsor || '-'}</strong></div>
                            <div><p class="text-xs text-gray-400">مكان العمل</p><strong>${emp.workLocation || '-'}</strong></div>
                            
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
        document.getElementById('empExpiryAlerts').innerText = alerts;
    });
}

// 3. وظائف إضافية (تعديل، حذف، بحث)
window.editEmployee = async (id) => {
    const docSnap = await getDoc(doc(db, "employees", id));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('empEditDocId').value = id;
        document.getElementById('empName').value = d.name;
        document.getElementById('empNationality').value = d.nationality;
        document.getElementById('empSponsor').value = d.sponsor;
        document.getElementById('empWorkLocation').value = d.workLocation;
        document.getElementById('residencyEnd').value = d.residencyEnd;
        document.getElementById('workCardEnd').value = d.workCardEnd;
        document.getElementById('medicalEnd').value = d.medicalEnd;
        
        document.getElementById('empModalTitle').innerText = "تعديل بيانات الموظف";
        window.toggleModal('employeeModal');
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

// تشغيل التحميل عند فتح الصفحة
loadEmployees();
