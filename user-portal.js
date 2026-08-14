// ============================================================
// DATA ACCESS
// ============================================================
const STORAGE_KEY = 'hayya_permits';

function getVisas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// ============================================================
// TOAST
// ============================================================
let toastTimeout;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 4000);
}

// ============================================================
// SEARCH PERMIT
// ============================================================
function searchPermit() {
  const ref = document.getElementById('permitSearch').value.trim().toUpperCase();
  
  if (!ref) {
    showToast('Please enter a permit reference number', 'error');
    return;
  }

  const visas = getVisas();
  const permit = visas.find(v => v.referenceNo === ref);

  if (!permit) {
    showNotFound(ref);
    return;
  }

  displayPermit(permit);
}

// ============================================================
// SHOW NOT FOUND
// ============================================================
function showNotFound(ref) {
  const section = document.getElementById('resultSection');
  const result = document.getElementById('permitResult');
  
  result.innerHTML = `
    <div style="text-align:center;padding:4rem 2rem;">
      <i class="fas fa-exclamation-circle" style="font-size:5rem;color:#dc3545;margin-bottom:1.5rem;"></i>
      <h2 style="font-size:2rem;color:#1a1a2e;margin-bottom:1rem;">Permit Not Found</h2>
      <p style="font-size:1.1rem;color:#7a7a8a;margin-bottom:2rem;">
        No entry permit found with reference: <strong>${ref}</strong>
      </p>
      <button class="btn btn-primary" onclick="resetSearch()">
        <i class="fas fa-search"></i> Search Again
      </button>
    </div>
  `;
  
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth' });
  showToast('Permit not found', 'error');
}

// ============================================================
// DISPLAY PERMIT
// ============================================================
function displayPermit(permit) {
  const section = document.getElementById('resultSection');
  const result = document.getElementById('permitResult');
  
  const isExpired = permit.status === 'EXPIRED' || new Date(permit.lastEntryDate) < new Date();
  const statusClass = isExpired ? 'expired' : 'active';
  const statusText = isExpired ? 'EXPIRED' : 'ACTIVE';
  
  result.innerHTML = `
    <div class="permit-card">
      <div class="permit-header-bar">
        <div>
          <h2 style="font-size:1.5rem;margin-bottom:0.3rem;">Hayya Entry Permit</h2>
          <p style="font-size:0.9rem;opacity:0.9;">Reference: ${permit.referenceNo}</p>
        </div>
        <div class="permit-status-badge ${statusClass}">${statusText}</div>
      </div>
      
      ${buildPermitHTML(permit, 'user-qr')}
      
      <div class="action-buttons">
        <button class="btn btn-primary" onclick="openFullscreen()">
          <i class="fas fa-expand"></i> View Fullscreen
        </button>
        <button class="btn btn-success" onclick="printPermit()">
          <i class="fas fa-print"></i> Print / Save as PDF
        </button>
        <button class="btn btn-primary" onclick="resetSearch()">
          <i class="fas fa-search"></i> Search Another
        </button>
      </div>
    </div>
  `;
  
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth' });
  
  // Render QR code
  setTimeout(() => renderQR('user-qr', permit.referenceNo), 200);
  
  showToast('Permit found!', 'success');
}

// ============================================================
// BUILD PERMIT HTML
// ============================================================
function buildPermitHTML(data, qrId) {
  const photoHTML = data.photo
    ? `<img src="${data.photo}" alt="Applicant" />`
    : `<i class="fas fa-user" style="color:rgba(255,255,255,0.3);font-size:4rem;"></i>`;
  
  const isExpired = data.status === 'EXPIRED' || (data.lastEntryDate && new Date(data.lastEntryDate) < new Date());
  const expiredOverlay = isExpired ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);font-size:3rem;font-weight:900;color:rgba(255,0,0,0.6);text-shadow:0 0 20px rgba(255,0,0,0.8);letter-spacing:3px;pointer-events:none;">EXPIRED</div>` : '';

  return `
    <div class="permit-document">
      <div style="display:grid;grid-template-columns:260px 1fr;gap:20px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.15);">
        <div style="background:rgba(109,141,150,0.3);border-radius:8px;padding:20px;display:flex;flex-direction:column;align-items:center;text-align:center;border:1px solid rgba(255,255,255,0.08);">
          <img src="qatar-emblem.jpg" alt="Qatar Emblem" style="width:100%;max-width:150px;height:150px;object-fit:contain;margin-bottom:16px;" onerror="this.style.display='none'" />
          <div style="font-size:1.05rem;font-weight:700;color:white;line-height:1.3;">Hayya Entry Visa<br/>for State of Qatar</div>
        </div>
        <div style="background:rgba(109,141,150,0.25);border-radius:8px;padding:16px 20px;border:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);margin-bottom:14px;font-weight:600;">HAYYA ENTRY VISA</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;">Issuing Date</div>
              <div style="font-size:0.92rem;font-weight:700;color:white;margin-top:4px;">${data.issuingDate}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;">Entry Reference No.</div>
              <div style="font-size:0.92rem;font-weight:700;color:white;margin-top:4px;">${data.referenceNo}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;">Duration</div>
              <div style="font-size:1.1rem;font-weight:700;color:white;margin-top:4px;">${data.duration}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;">Last Entry Date</div>
              <div style="font-size:0.92rem;font-weight:700;color:white;margin-top:4px;">${data.lastEntryDate}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;">Application Status</div>
              <div style="font-size:0.92rem;font-weight:700;color:${isExpired ? '#ff6b6b' : 'white'};margin-top:4px;">${data.status}</div>
            </div>
            <div>
              <div style="font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;">Visa Category</div>
              <div style="font-size:0.92rem;font-weight:700;color:white;margin-top:4px;">${data.visaCategory}</div>
            </div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:320px 1fr 200px;gap:16px;">
        <div style="background:rgba(109,141,150,0.3);border-radius:8px;padding:16px;border:1px solid rgba(255,255,255,0.08);">
          <div style="width:100%;height:340px;border:2px solid rgba(255,255,255,0.3);border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:14px;">
            ${photoHTML}
            ${expiredOverlay}
          </div>
          <div style="font-size:0.7rem;text-transform:uppercase;color:rgba(255,255,255,0.5);letter-spacing:0.5px;margin-bottom:6px;">FULL NAME</div>
          <div style="font-size:1.25rem;font-weight:800;color:white;letter-spacing:0.5px;line-height:1.2;">${data.fullName}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:rgba(109,141,150,0.25);border-radius:8px;padding:14px 16px;border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);margin-bottom:12px;font-weight:600;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">PERSONAL INFORMATION</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <div style="font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);">Nationality</div>
                <div style="font-size:0.88rem;font-weight:600;color:white;margin-top:4px;">${data.nationality}</div>
              </div>
              <div>
                <div style="font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);">Gender</div>
                <div style="font-size:0.88rem;font-weight:600;color:white;margin-top:4px;">${data.gender}</div>
              </div>
              <div style="grid-column:1/-1;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);">Date of Birth</div>
                <div style="font-size:0.88rem;font-weight:600;color:white;margin-top:4px;">${data.dateOfBirth}</div>
              </div>
            </div>
          </div>
          <div style="background:rgba(109,141,150,0.25);border-radius:8px;padding:14px 16px;border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);margin-bottom:12px;font-weight:600;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">PASSPORT</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <div style="font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);">Passport Number</div>
                <div style="font-size:0.88rem;font-weight:600;color:white;margin-top:4px;">${data.passportNumber}</div>
              </div>
              <div>
                <div style="font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);">Passport Type</div>
                <div style="font-size:0.88rem;font-weight:600;color:white;margin-top:4px;">${data.passportType}</div>
              </div>
              <div style="grid-column:1/-1;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);">Passport Expiry Date</div>
                <div style="font-size:0.88rem;font-weight:600;color:white;margin-top:4px;">${data.passportExpiry}</div>
              </div>
            </div>
          </div>
        </div>
        <div style="background:rgba(109,141,150,0.3);border-radius:8px;padding:16px;display:flex;flex-direction:column;align-items:center;border:1px solid rgba(255,255,255,0.08);">
          <div style="background:white;padding:12px;border-radius:8px;margin-bottom:16px;">
            <div id="${qrId}"></div>
          </div>
          <div style="font-family:monospace;font-size:0.85rem;font-weight:700;color:white;text-align:center;margin-bottom:40px;letter-spacing:0.5px;">${data.referenceNo}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:auto;">
            <span style="font-size:1.4rem;font-weight:700;color:white;letter-spacing:1px;">Hayya</span>
            <span style="font-size:1.4rem;font-weight:700;color:#ffd700;letter-spacing:1px;">هَيّا</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// RENDER QR CODE
// ============================================================
function renderQR(elementId, text) {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    
    // Get the current domain and create full URL to user portal
    const baseUrl = window.location.origin + window.location.pathname;
    const permitUrl = baseUrl + '?ref=' + encodeURIComponent(text || 'HAYYA');
    
    new QRCode(el, {
      text: permitUrl,
      width: 140,
      height: 140,
      colorDark: '#1a1a2e',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }, 100);
}

// ============================================================
// FULLSCREEN
// ============================================================
function openFullscreen() {
  const permitContent = document.querySelector('.permit-document').cloneNode(true);
  document.getElementById('fullscreenContent').innerHTML = '';
  document.getElementById('fullscreenContent').appendChild(permitContent);
  document.getElementById('fullscreenModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => {
    const qrEl = permitContent.querySelector('[id^="user-qr"]');
    if (qrEl) {
      const ref = qrEl.closest('.permit-document').querySelector('[style*="monospace"]').textContent.trim();
      renderQR(qrEl.id, ref);
    }
  }, 100);
}

function closeFullscreen(event) {
  if (event) event.stopPropagation();
  document.getElementById('fullscreenModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================================
// PRINT
// ============================================================
function printPermit() {
  window.print();
}

// ============================================================
// RESET SEARCH
// ============================================================
function resetSearch() {
  document.getElementById('permitSearch').value = '';
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('permitSearch').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('permitSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPermit();
  });
  
  // Check if URL has a permit reference (for QR code scanning)
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  
  if (ref) {
    // Auto-fill and search if reference is in URL
    document.getElementById('permitSearch').value = ref;
    searchPermit();
  }
});
