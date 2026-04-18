// IndexedDB Configuration
const DB_NAME = 'ExamMarksDB';
const DB_VERSION = 1;
const STORE_NAME = 'studentMarks';

let db;

// Initialize Database
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            showStatus('Database connection failed!', 'error');
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            loadRecords();
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Using indexNumber as the primary key
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'indexNumber' });
                store.createIndex('name', 'name', { unique: false });
            }
        };
    });
};

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
const saveRecord = (record, isUpdate = false) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Check if index already exists when adding new
    if (!isUpdate) {
        const checkRequest = store.get(record.indexNumber);
        checkRequest.onsuccess = () => {
            if (checkRequest.result) {
                showStatus('Index Number already exists!', 'error');
                return;
            }
            performSave(store, record, 'Student record saved successfully!');
        };
    } else {
        performSave(store, record, 'Student record updated successfully!');
    }
};

const performSave = (store, record, successMsg) => {
    const request = store.put(record);
    
    request.onsuccess = () => {
        showStatus(successMsg, 'success');
        if (form.contains(document.activeElement)) form.reset();
        loadRecords();
        if (editModal.classList.contains('show')) closeModal();
    };
    
    request.onerror = () => {
        showStatus('Error saving record.', 'error');
    };
};

// Delete Record
const deleteRecord = (indexNumber) => {
    if (confirm(`Are you sure you want to delete the record for Index: ${indexNumber}?`)) {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(indexNumber);
        
        request.onsuccess = () => {
            showStatus('Record deleted successfully!', 'success');
            loadRecords();
        };
    }
};

// Load and Display Records
const loadRecords = (searchQuery = '') => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
        const records = request.result;
        renderTable(records, searchQuery);
    };
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

window.openEditModal = (indexNumber) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(indexNumber);
    
    request.onsuccess = () => {
        const record = request.result;
        if (record) {
            document.getElementById('editId').value = record.indexNumber;
            document.getElementById('editIndex').value = record.indexNumber;
            document.getElementById('editIndex').readOnly = true; // Index cannot be changed
            document.getElementById('editName').value = record.name;
            document.getElementById('editMaths').value = record.maths;
            document.getElementById('editScience').value = record.science;
            document.getElementById('editEnglish').value = record.english;
            document.getElementById('editTamil').value = record.tamil;
            
            editModal.classList.add('show');
        }
    };
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
        indexNumber: document.getElementById('editIndex').value.trim(), // keeping existing
        maths: parseInt(document.getElementById('editMaths').value),
        science: parseInt(document.getElementById('editScience').value),
        english: parseInt(document.getElementById('editEnglish').value),
        tamil: parseInt(document.getElementById('editTamil').value),
    };
    
    saveRecord(record, true);
});

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    initDB();
});

// --- Export Logic ---

// Export All to Excel
document.getElementById('exportAllExcelBtn').addEventListener('click', () => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
        const records = request.result;
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
    };
});

// Export All to PDF
document.getElementById('exportAllPdfBtn').addEventListener('click', () => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
        const records = request.result;
        if (records.length === 0) {
            showStatus('No records to export.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Exam Marks Report", 14, 22);
        doc.setFontSize(11);
        doc.text("Generated on: " + new Date().toLocaleDateString(), 14, 30);

        const tableColumn = ["Index No", "Name", "Maths", "Science", "English", "Tamil", "Total", "Avg"];
        const tableRows = [];

        records.forEach(r => {
            const total = r.maths + r.science + r.english + r.tamil;
            const avg = (total / 4).toFixed(2);
            tableRows.push([r.indexNumber, r.name, r.maths, r.science, r.english, r.tamil, total, avg]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });

        doc.save("Exam_Marks_Report.pdf");
    };
});

// Export Individual Excel
window.exportIndividualExcel = (indexNumber) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(indexNumber);
    
    request.onsuccess = () => {
        const r = request.result;
        if (!r) return;

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
    };
};

// Export Individual PDF
window.exportIndividualPdf = (indexNumber) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(indexNumber);
    
    request.onsuccess = () => {
        const r = request.result;
        if (!r) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const total = r.maths + r.science + r.english + r.tamil;
        const avg = (total / 4).toFixed(2);

        doc.setFontSize(22);
        doc.setTextColor(99, 102, 241);
        doc.text("Student Performance Report", 105, 30, null, null, "center");

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Name: ${r.name}`, 20, 50);
        doc.text(`Index Number: ${r.indexNumber}`, 20, 60);

        doc.autoTable({
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

        doc.save(`Report_${r.indexNumber}.pdf`);
    };
};

// --- Backup & Restore Logic ---

// Backup Data
document.getElementById('backupBtn').addEventListener('click', () => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
        const records = request.result;
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
    };
});

// Restore Data
document.getElementById('restoreInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const records = JSON.parse(event.target.result);
            if (!Array.isArray(records)) throw new Error("Invalid format");
            
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            let addedCount = 0;
            
            records.forEach(record => {
                if (record.indexNumber && record.name) {
                    store.put(record); // put will update existing or add new
                    addedCount++;
                }
            });

            transaction.oncomplete = () => {
                showStatus(`Successfully restored ${addedCount} records.`, 'success');
                loadRecords();
            };
            
            transaction.onerror = () => {
                showStatus('Error occurred during restore.', 'error');
            };

        } catch (err) {
            showStatus('Invalid backup file. Please select a valid JSON backup.', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input so the same file can be selected again
});
