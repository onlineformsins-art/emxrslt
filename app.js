import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABmnVxJckqpMmXJh8OFS5hUOX9sKv9JR8",
  authDomain: "exmrst-f3ec2.firebaseapp.com",
  projectId: "exmrst-f3ec2",
  storageBucket: "exmrst-f3ec2.firebasestorage.app",
  messagingSenderId: "98591691874",
  appId: "1:98591691874:web:f963226aa502a58a04ad3b",
  measurementId: "G-8HB6P24FVX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const STORE_NAME = 'studentMarks';

// Calculate Grade based on marks
const getGrade = (marks) => {
    if (marks >= 75) return 'A';
    if (marks >= 65) return 'B';
    if (marks >= 50) return 'C';
    if (marks >= 35) return 'S';
    return 'W';
};

// UI Elements
const form = document.getElementById('marksForm');
const clearBtn = document.getElementById('clearBtn');
const recordsBody = document.getElementById('recordsBody');
const emptyState = document.getElementById('emptyState');
const statusMessage = document.getElementById('statusMessage');
const searchInput = document.getElementById('searchInput');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Show Status Message
const showStatus = (message, type) => {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
};

// Add or Update Record
const saveRecord = async (record, isUpdate = false) => {
    try {
        const docRef = doc(db, STORE_NAME, record.indexNumber);
        
        if (!isUpdate) {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                showStatus('Index Number already exists!', 'error');
                return;
            }
        }
        
        await setDoc(docRef, record);
        showStatus(isUpdate ? 'Student record updated successfully!' : 'Student record saved successfully!', 'success');
        
        if (form.contains(document.activeElement)) form.reset();
        loadRecords();
        if (editModal.classList.contains('show')) closeModal();
    } catch (error) {
        console.error("Error saving record: ", error);
        showStatus('Error saving record.', 'error');
    }
};

// Delete Record
window.deleteRecord = async (indexNumber) => {
    if (confirm(`Are you sure you want to delete the record for Index: ${indexNumber}?`)) {
        try {
            await deleteDoc(doc(db, STORE_NAME, indexNumber));
            showStatus('Record deleted successfully!', 'success');
            loadRecords();
        } catch (error) {
            console.error("Error deleting record: ", error);
            showStatus('Error deleting record.', 'error');
        }
    }
};

// Load and Display Records
const loadRecords = async (searchQuery = '') => {
    try {
        const querySnapshot = await getDocs(collection(db, STORE_NAME));
        const records = [];
        querySnapshot.forEach((doc) => {
            records.push(doc.data());
        });
        renderTable(records, searchQuery);
    } catch (error) {
        console.error("Error fetching records: ", error);
        showStatus('Error fetching records.', 'error');
    }
};

// Render Table
const renderTable = (records, searchQuery = '') => {
    recordsBody.innerHTML = '';
    
    const filteredRecords = records.filter(record => {
        const query = searchQuery.toLowerCase();
        return record.name.toLowerCase().includes(query) || 
               record.indexNumber.toLowerCase().includes(query);
    });

    if (filteredRecords.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        filteredRecords.forEach(record => {
            const total = parseInt(record.maths) + parseInt(record.science) + parseInt(record.english) + parseInt(record.tamil);
            const avg = (total / 4).toFixed(2);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${record.indexNumber}</strong></td>
                <td>${record.name}</td>
                <td>${record.maths} <span class="grade grade-${getGrade(record.maths)}">${getGrade(record.maths)}</span></td>
                <td>${record.science} <span class="grade grade-${getGrade(record.science)}">${getGrade(record.science)}</span></td>
                <td>${record.english} <span class="grade grade-${getGrade(record.english)}">${getGrade(record.english)}</span></td>
                <td>${record.tamil} <span class="grade grade-${getGrade(record.tamil)}">${getGrade(record.tamil)}</span></td>
                <td><strong>${total}</strong></td>
                <td><strong>${avg}</strong></td>
                <td class="action-buttons">
                    <button class="btn-edit" style="color: #10b981" onclick="exportIndividualExcel('${record.indexNumber}')" title="Export Excel"><i class="fa-solid fa-file-excel"></i></button>
                    <button class="btn-edit" style="color: #ef4444" onclick="exportIndividualPdf('${record.indexNumber}')" title="Export PDF"><i class="fa-solid fa-file-pdf"></i></button>
                    <button class="btn-edit" onclick="openEditModal('${record.indexNumber}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-danger" onclick="deleteRecord('${record.indexNumber}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            recordsBody.appendChild(tr);
        });
    }
};

// Form Submit Handler
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const record = {
        name: document.getElementById('studentName').value.trim(),
        indexNumber: document.getElementById('indexNumber').value.trim(),
        maths: parseInt(document.getElementById('mathsMarks').value),
        science: parseInt(document.getElementById('scienceMarks').value),
        english: parseInt(document.getElementById('englishMarks').value),
        tamil: parseInt(document.getElementById('tamilMarks').value),
    };
    
    saveRecord(record, false);
});

// Clear Button
clearBtn.addEventListener('click', () => {
    form.reset();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    loadRecords(e.target.value);
});

// --- Edit Modal Logic ---

window.openEditModal = async (indexNumber) => {
    try {
        const docRef = doc(db, STORE_NAME, indexNumber);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const record = docSnap.data();
            document.getElementById('editId').value = record.indexNumber;
            document.getElementById('editIndex').value = record.indexNumber;
            document.getElementById('editIndex').readOnly = true;
            document.getElementById('editName').value = record.name;
            document.getElementById('editMaths').value = record.maths;
            document.getElementById('editScience').value = record.science;
            document.getElementById('editEnglish').value = record.english;
            document.getElementById('editTamil').value = record.tamil;
            
            editModal.classList.add('show');
        }
    } catch (error) {
        console.error("Error fetching record for edit: ", error);
    }
};

const closeModal = () => {
    editModal.classList.remove('show');
    editForm.reset();
};

cancelEditBtn.addEventListener('click', closeModal);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const record = {
        name: document.getElementById('editName').value.trim(),
        indexNumber: document.getElementById('editIndex').value.trim(),
        maths: parseInt(document.getElementById('editMaths').value),
        science: parseInt(document.getElementById('editScience').value),
        english: parseInt(document.getElementById('editEnglish').value),
        tamil: parseInt(document.getElementById('editTamil').value),
    };
    
    saveRecord(record, true);
});

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    loadRecords();
});

// --- Export Logic ---

// Export All to Excel
document.getElementById('exportAllExcelBtn').addEventListener('click', async () => {
    try {
        const querySnapshot = await getDocs(collection(db, STORE_NAME));
        const records = [];
        querySnapshot.forEach((doc) => records.push(doc.data()));
        
        if (records.length === 0) {
            showStatus('No records to export.', 'error');
            return;
        }
        
        const data = records.map(r => ({
            'Index Number': r.indexNumber,
            'Name': r.name,
            'Maths': r.maths,
            'Science': r.science,
            'English': r.english,
            'Tamil': r.tamil,
            'Total': r.maths + r.science + r.english + r.tamil,
            'Average': ((r.maths + r.science + r.english + r.tamil) / 4).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, "Exam_Marks_Report.xlsx");
    } catch (error) {
        console.error("Error exporting to Excel: ", error);
        showStatus('Export failed', 'error');
    }
});

// Export All to PDF
document.getElementById('exportAllPdfBtn').addEventListener('click', async () => {
    try {
        const querySnapshot = await getDocs(collection(db, STORE_NAME));
        const records = [];
        querySnapshot.forEach((doc) => records.push(doc.data()));
        
        if (records.length === 0) {
            showStatus('No records to export.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const docReport = new jsPDF();

        docReport.setFontSize(18);
        docReport.text("Exam Marks Report", 14, 22);
        docReport.setFontSize(11);
        docReport.text("Generated on: " + new Date().toLocaleDateString(), 14, 30);

        const tableColumn = ["Index No", "Name", "Maths", "Science", "English", "Tamil", "Total", "Avg"];
        const tableRows = [];

        records.forEach(r => {
            const total = r.maths + r.science + r.english + r.tamil;
            const avg = (total / 4).toFixed(2);
            tableRows.push([r.indexNumber, r.name, r.maths, r.science, r.english, r.tamil, total, avg]);
        });

        docReport.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });

        docReport.save("Exam_Marks_Report.pdf");
    } catch (error) {
        console.error("Error exporting to PDF: ", error);
        showStatus('Export failed', 'error');
    }
});

// Export Individual Excel
window.exportIndividualExcel = async (indexNumber) => {
    try {
        const docRef = doc(db, STORE_NAME, indexNumber);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;
        const r = docSnap.data();

        const total = r.maths + r.science + r.english + r.tamil;
        const avg = (total / 4).toFixed(2);

        const data = [{
            'Index Number': r.indexNumber,
            'Name': r.name,
            'Maths': r.maths,
            'Science': r.science,
            'English': r.english,
            'Tamil': r.tamil,
            'Total': total,
            'Average': avg
        }];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Student Report");
        XLSX.writeFile(wb, `Report_${r.indexNumber}.xlsx`);
    } catch (error) {
        console.error("Error exporting individual Excel: ", error);
    }
};

// Export Individual PDF
window.exportIndividualPdf = async (indexNumber) => {
    try {
        const docRef = doc(db, STORE_NAME, indexNumber);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;
        const r = docSnap.data();

        const { jsPDF } = window.jspdf;
        const docReport = new jsPDF();

        const total = r.maths + r.science + r.english + r.tamil;
        const avg = (total / 4).toFixed(2);

        docReport.setFontSize(22);
        docReport.setTextColor(99, 102, 241);
        docReport.text("Student Performance Report", 105, 30, null, null, "center");

        docReport.setFontSize(14);
        docReport.setTextColor(0, 0, 0);
        docReport.text(`Name: ${r.name}`, 20, 50);
        docReport.text(`Index Number: ${r.indexNumber}`, 20, 60);

        docReport.autoTable({
            startY: 70,
            head: [['Subject', 'Marks', 'Grade']],
            body: [
                ['Maths', r.maths, getGrade(r.maths)],
                ['Science', r.science, getGrade(r.science)],
                ['English', r.english, getGrade(r.english)],
                ['Tamil', r.tamil, getGrade(r.tamil)],
                ['', '', ''],
                ['Total', total, ''],
                ['Average', avg, '']
            ],
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241] }
        });

        docReport.save(`Report_${r.indexNumber}.pdf`);
    } catch (error) {
        console.error("Error exporting individual PDF: ", error);
    }
};

// --- Backup & Restore Logic ---

// Backup Data
document.getElementById('backupBtn').addEventListener('click', async () => {
    try {
        const querySnapshot = await getDocs(collection(db, STORE_NAME));
        const records = [];
        querySnapshot.forEach((doc) => records.push(doc.data()));
        
        if (records.length === 0) {
            showStatus('No records to backup.', 'error');
            return;
        }
        
        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ExamMarks_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error backing up: ", error);
        showStatus('Error creating backup.', 'error');
    }
});

// Restore Data
document.getElementById('restoreInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const records = JSON.parse(event.target.result);
            if (!Array.isArray(records)) throw new Error("Invalid format");
            
            let addedCount = 0;
            showStatus('Restoring data to cloud...', 'success');
            
            for (const record of records) {
                if (record.indexNumber && record.name) {
                    await setDoc(doc(db, STORE_NAME, record.indexNumber), record);
                    addedCount++;
                }
            }
            
            showStatus(`Successfully restored ${addedCount} records to cloud.`, 'success');
            loadRecords();

        } catch (err) {
            console.error("Restore error:", err);
            showStatus('Invalid backup file or network error.', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
});
