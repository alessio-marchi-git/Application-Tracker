(function () {
    const STORAGE_KEY = 'application-tracker-data';
    const tableBody = document.querySelector('#application-table tbody');
    const rowTemplate = document.getElementById('row-template');
    const addRowButton = document.getElementById('add-row');
    const clearButton = document.getElementById('clear-data');
    const exportButton = document.getElementById('export-data');
    const importButton = document.getElementById('import-data');
    const fileInput = document.getElementById('file-input');

    const COLUMN_KEYS = [
        'company',
        'position',
        'jobLink',
        'status',
        'applicationDate',
        'hrContact',
        'contractType',
        'salary',
        'followUp',
        'cvSent',
        'coverLetter',
        'referral',
        'notes'
    ];

    let rows = [];

    function supportsLocalStorage() {
        try {
            const testKey = '__tracker_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('LocalStorage non disponibile:', error);
            return false;
        }
    }

    const canPersist = supportsLocalStorage();

    function generateRowId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function defaultRowData() {
        return COLUMN_KEYS.reduce((acc, key) => {
            acc[key] = '';
            return acc;
        }, { id: generateRowId() });
    }

    function loadData() {
        if (!canPersist) {
            rows = [defaultRowData()];
            return;
        }

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed)) {
                rows = parsed.map((row) => ({
                    ...defaultRowData(),
                    ...row,
                    id: row.id || generateRowId()
                }));
                if (!rows.length) {
                    rows = [defaultRowData()];
                }
                return;
            }
        } catch (error) {
            console.warn('Impossibile leggere i dati salvati:', error);
        }

        rows = [defaultRowData()];
    }

    function saveData() {
        if (!canPersist) {
            return;
        }
        try {
            const payload = JSON.stringify(rows);
            window.localStorage.setItem(STORAGE_KEY, payload);
        } catch (error) {
            console.warn('Impossibile salvare i dati:', error);
        }
    }

    function createRowElement(rowData) {
        const fragment = rowTemplate.content.cloneNode(true);
        const rowEl = fragment.querySelector('tr');
        rowEl.dataset.id = rowData.id;

        rowEl.querySelectorAll('[data-key]').forEach((cell) => {
            const key = cell.getAttribute('data-key');
            const value = rowData[key] ?? '';
            cell.textContent = value;
        });

        return rowEl;
    }

    function renderRows() {
        tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        rows.forEach((row) => {
            fragment.appendChild(createRowElement(row));
        });
        tableBody.appendChild(fragment);
    }

    function addRow(data) {
        const newRow = {
            ...defaultRowData(),
            ...data,
            id: generateRowId()
        };
        rows.push(newRow);
        renderRows();
        saveData();
    }

    function deleteRow(rowId) {
        const index = rows.findIndex((row) => row.id === rowId);
        if (index === -1) {
            return;
        }
        rows.splice(index, 1);
        if (!rows.length) {
            rows.push(defaultRowData());
        }
        renderRows();
        saveData();
    }

    function duplicateRow(rowId) {
        const sourceRow = rows.find((row) => row.id === rowId);
        if (!sourceRow) {
            return;
        }
        const { id: _omit, ...rest } = sourceRow;
        addRow(rest);
    }

    function updateRowValue(rowId, key, value) {
        const rowIndex = rows.findIndex((row) => row.id === rowId);
        if (rowIndex === -1) {
            return;
        }
        rows[rowIndex] = {
            ...rows[rowIndex],
            [key]: value
        };
        saveData();
    }

    function sanitizeText(input) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = input;
        return tempDiv.textContent || '';
    }

    function exportData() {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const formatter = new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' });
        anchor.download = `application-tracker-${formatter.format(new Date()).replace(/[\\/:]/g, '-')}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result || '[]');
                if (!Array.isArray(parsed)) {
                    throw new Error('Formato non valido');
                }
                rows = parsed.map((row) => ({
                    ...defaultRowData(),
                    ...row,
                    id: row.id || generateRowId()
                }));
                if (!rows.length) {
                    rows = [defaultRowData()];
                }
                renderRows();
                saveData();
            } catch (error) {
                window.alert('Impossibile importare i dati: usa un file JSON esportato da questa applicazione.');
                console.error('Errore importazione dati', error);
            }
        };
        reader.readAsText(file);
    }

    addRowButton.addEventListener('click', () => addRow());

    clearButton.addEventListener('click', () => {
        const confirmed = window.confirm('Vuoi davvero cancellare tutte le righe? L\'operazione non può essere annullata.');
        if (!confirmed) {
            return;
        }
        rows = [defaultRowData()];
        renderRows();
        saveData();
    });

    exportButton.addEventListener('click', exportData);

    importButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        importData(file);
        fileInput.value = '';
    });

    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const action = target.dataset.action;
        if (!action) {
            return;
        }

        const rowEl = target.closest('tr');
        const rowId = rowEl?.dataset.id;
        if (!rowId) {
            return;
        }

        if (action === 'delete') {
            deleteRow(rowId);
        } else if (action === 'duplicate') {
            duplicateRow(rowId);
        }
    });

    tableBody.addEventListener('paste', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.matches('[contenteditable="true"]')) {
            return;
        }
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, text);
    });

    let saveTimeout;
    tableBody.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.matches('[contenteditable="true"]')) {
            return;
        }
        const rowEl = target.closest('tr');
        const rowId = rowEl?.dataset.id;
        const key = target.getAttribute('data-key');
        if (!rowId || !key) {
            return;
        }
        const sanitizedValue = sanitizeText(target.innerHTML);
        if (target.textContent !== sanitizedValue) {
            target.textContent = sanitizedValue;
        }
        window.clearTimeout(saveTimeout);
        saveTimeout = window.setTimeout(() => {
            updateRowValue(rowId, key, sanitizedValue.trim());
        }, 300);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            saveData();
        }
    });

    loadData();
    renderRows();
})();
