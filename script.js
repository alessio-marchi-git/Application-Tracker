(function () {
    const SCHEMA_VERSION = 1;
    const STORAGE_KEY = 'application-tracker-data';
    const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
    const DEBOUNCE_MS = 300;
    const UNDO_LIMIT = 50;
    const STATUS_OPTIONS = ['', 'In attesa', 'Colloquio', 'Offerta', 'Rifiutato', 'Ritirato'];

    const tableBody = document.querySelector('#application-table tbody');
    const rowTemplate = document.getElementById('row-template');
    const addRowButton = document.getElementById('add-row');
    const clearButton = document.getElementById('clear-data');
    const exportButton = document.getElementById('export-data');
    const importButton = document.getElementById('import-data');
    const fileInput = document.getElementById('file-input');
    const emptyState = document.getElementById('empty-state');
    const toast = document.getElementById('toast');

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
    let undoStack = [];
    const saveTimeouts = new Map();

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

    function normalizeRow(row = {}) {
        return {
            ...defaultRowData(),
            ...row,
            id: row.id || generateRowId()
        };
    }

    function normalizeRows(data) {
        const normalized = data.map(normalizeRow);
        return normalized.length ? normalized : [defaultRowData()];
    }

    function sanitizeText(input) {
        return input.replace(/<[^>]*>/g, '');
    }

    function loadData() {
        if (!canPersist) {
            rows = [defaultRowData()];
            return;
        }

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === 'object') {
                const data = Array.isArray(parsed) ? parsed : (parsed.rows || []);
                rows = normalizeRows(data);
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
            const payload = JSON.stringify({ version: SCHEMA_VERSION, rows });
            window.localStorage.setItem(STORAGE_KEY, payload);
            showToast();
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                window.alert('Spazio di archiviazione esaurito. Esporta i dati e svuota il tracker.');
            }
            console.warn('Impossibile salvare i dati:', error);
        }
    }

    function showToast() {
        if (!toast) {
            return;
        }
        toast.classList.add('toast--visible');
        window.setTimeout(() => toast.classList.remove('toast--visible'), 1500);
    }

    function updateEmptyState() {
        if (!emptyState) {
            return;
        }
        const isEmpty = rows.length <= 1 && COLUMN_KEYS.every((key) => !rows[0]?.[key]);
        emptyState.hidden = !isEmpty;
    }

    function createStatusSelect(value) {
        const select = document.createElement('select');
        select.className = 'status-select';
        select.dataset.key = 'status';
        STATUS_OPTIONS.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt || '\u2014 Seleziona \u2014';
            if (opt === value) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        return select;
    }

    function createRowElement(rowData) {
        const fragment = rowTemplate.content.cloneNode(true);
        const rowEl = fragment.querySelector('tr');
        rowEl.dataset.id = rowData.id;

        rowEl.querySelectorAll('[data-key]').forEach((cell) => {
            const key = cell.getAttribute('data-key');
            const value = rowData[key] ?? '';
            if (key === 'status') {
                cell.removeAttribute('contenteditable');
                cell.appendChild(createStatusSelect(value));
            } else {
                cell.textContent = value;
            }
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
        updateEmptyState();
    }

    function appendRowToDOM(rowData) {
        tableBody.appendChild(createRowElement(rowData));
        updateEmptyState();
    }

    function removeRowFromDOM(rowId) {
        const rowEl = tableBody.querySelector(`tr[data-id="${rowId}"]`);
        if (rowEl) {
            rowEl.remove();
        }
        updateEmptyState();
    }

    function pushUndo(entry) {
        undoStack.push(entry);
        if (undoStack.length > UNDO_LIMIT) {
            undoStack.shift();
        }
    }

    function addRow(data) {
        const newRow = normalizeRow(data);
        rows.push(newRow);
        appendRowToDOM(newRow);
        saveData();
    }

    function deleteRow(rowId) {
        const index = rows.findIndex((row) => row.id === rowId);
        if (index === -1) {
            return;
        }
        pushUndo({ action: 'delete', data: rows[index], index });
        rows.splice(index, 1);
        if (!rows.length) {
            rows.push(defaultRowData());
            renderRows();
        } else {
            removeRowFromDOM(rowId);
        }
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

    function undoLast() {
        const last = undoStack.pop();
        if (!last) {
            return;
        }
        if (last.action === 'delete') {
            if (rows.length === 1 && COLUMN_KEYS.every((k) => !rows[0][k])) {
                rows = [];
            }
            rows.splice(last.index, 0, last.data);
        } else if (last.action === 'clear') {
            rows = last.data;
        }
        renderRows();
        saveData();
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
        if (file.size > MAX_IMPORT_SIZE) {
            window.alert('File troppo grande (max 5 MB).');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result || '[]');
                const data = Array.isArray(parsed) ? parsed : (parsed.rows || []);
                if (!Array.isArray(data)) {
                    throw new Error('Formato non valido');
                }
                rows = normalizeRows(data);
                renderRows();
                saveData();
            } catch (error) {
                window.alert('Impossibile importare i dati: usa un file JSON esportato da questa applicazione.');
                console.error('Errore importazione dati', error);
            }
        };
        reader.onerror = () => {
            window.alert('Errore nella lettura del file.');
        };
        reader.readAsText(file);
    }

    addRowButton.addEventListener('click', () => addRow());

    clearButton.addEventListener('click', () => {
        const confirmed = window.confirm('Vuoi davvero cancellare tutte le righe? L\'operazione non può essere annullata.');
        if (!confirmed) {
            return;
        }
        pushUndo({ action: 'clear', data: [...rows] });
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
        const button = target instanceof HTMLElement ? target.closest('[data-action]') : null;
        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const rowEl = button.closest('tr');
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

    tableBody.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement) || !target.dataset.key) {
            return;
        }
        const rowEl = target.closest('tr');
        const rowId = rowEl?.dataset.id;
        if (!rowId) {
            return;
        }
        updateRowValue(rowId, target.dataset.key, target.value);
    });

    tableBody.addEventListener('paste', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.matches('[contenteditable="true"]')) {
            return;
        }
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
        }
    });

    tableBody.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('[contenteditable="true"]')) {
            event.preventDefault();
        }
    });

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
        const existingTimeout = saveTimeouts.get(rowId);
        if (existingTimeout) {
            window.clearTimeout(existingTimeout);
        }
        saveTimeouts.set(rowId, window.setTimeout(() => {
            updateRowValue(rowId, key, sanitizedValue.trim());
            saveTimeouts.delete(rowId);
        }, DEBOUNCE_MS));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            saveData();
        }
        if (event.key === 'z' && (event.ctrlKey || event.metaKey) && !event.target.matches?.('[contenteditable="true"]')) {
            event.preventDefault();
            undoLast();
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            loadData();
            renderRows();
        }
    });

    loadData();
    renderRows();
})();
