// ============================================================
// DATA STORE
// ============================================================
const STORAGE_KEY = 'hayya_permits';
let currentVisaRef = null;
let uploadedPhotoBase64 = null;

function getVisas() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveVisas(visas) {
  try {
    // Try to save
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visas));
    updateCounts();
    updateDashboard();
    loadVisas();
  } catch (e) {
    // If localStorage is full, show error
    if (e.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded!', e);
      showToast('Storage limit reached! Consider clearing old permits or using smaller photos.', 'error');
      // Try to save without the last item
      visas.pop();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visas));
      } catch (err) {
        console.error('Still cannot save:', err);
      }
    } else {
      console.error('Error saving visas:', e);
      showToast('Error saving permit data', 'error');
    }
  }
}
function generateRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const cc = (document.getElementById('nationality')?.value || 'QA').substring(0, 2).toUpperCase();
  let rand = '';
  for (let i = 0; i < 10; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return cc + '-' + rand;
}

// ============================================================
// PHOTO UPLOAD WITH COMPRESSION
// ============================================================
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check file size (warn if > 1MB)
  if (file.size > 1024 * 1024) {
    if (!confirm('Image is large (>1MB). This may cause storage issues. Compress it?')) {
      return;
    }
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Compress image to max 400x400
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      const maxSize = 400;
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with 0.7 quality
      uploadedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('photoUrl').value = '';
      refreshLivePreview();
      showToast('Photo uploaded and compressed', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getPhotoSrc() {
  if (uploadedPhotoBase64) return uploadedPhotoBase64;
  const url = document.getElementById('photoUrl')?.value.trim();
  if (url) return url;
  return null;
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
// PAGE NAVIGATION
// ============================================================
function showPage(page) {
  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
  document.getElementById('page-' + page)?.classList.remove('hidden');
  document.querySelectorAll('.sidebar .menu-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.sidebar .menu-item[data-page="${page}"]`)?.classList.add('active');
  if (page === 'dashboard') updateDashboard();
  if (page === 'visas') loadVisas();
}

// ============================================================
// DASHBOARD
// ============================================================
function updateDashboard() {
  const visas = getVisas();
  const today = new Date().toDateString();
  document.getElementById('statTotal').textContent = visas.length;
  document.getElementById('statActive').textContent = visas.filter(v => v.status === 'ACTIVE').length;
  document.getElementById('statExpired').textContent = visas.filter(v => v.status === 'EXPIRED').length;
  document.getElementById('statToday').textContent = visas.filter(v => new Date(v.createdAt).toDateString() === today).length;

  const el = document.getElementById('recentActivity');
  if (visas.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No activity yet</h3><p>Issue your first permit to get started</p></div>`;
  } else {
    el.innerHTML = visas.slice(-6).reverse().map(v => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid #f0f2f5;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${v.photo ? `<img src="${v.photo}" style="width:32px;height:38px;object-fit:cover;border-radius:3px;border:1px solid #e8eaed;" />` : `<div style="width:32px;height:38px;background:#f0f2f5;border-radius:3px;border:1px solid #e8eaed;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:#b0b8c8;font-size:0.8rem;"></i></div>`}
          <div>
            <div style="font-weight:600;font-size:0.85rem;">${v.fullName}</div>
            <div style="font-family:monospace;font-size:0.75rem;color:var(--maroon);">${v.referenceNo}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="status-badge ${v.status.toLowerCase()}">${v.status}</span>
          <span style="color:#9aa0b0;font-size:0.75rem;">${new Date(v.createdAt).toLocaleDateString()}</span>
        </div>
      </div>`).join('');
  }
}
function updateCounts() {
  document.getElementById('visaCount').textContent = getVisas().length;
  
  // Check storage usage
  checkStorageUsage();
}

function checkStorageUsage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || '[]';
    const sizeInBytes = new Blob([data]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const maxSize = 5120; // ~5MB typical localStorage limit
    const percentUsed = ((sizeInBytes / 1024) / maxSize * 100).toFixed(1);
    
    console.log(`Storage: ${sizeInKB}KB used (~${percentUsed}% of ~5MB limit)`);
    
    if (percentUsed > 80) {
      console.warn('Storage is getting full! Consider clearing old permits or using smaller photos.');
    }
  } catch (e) {
    console.error('Error checking storage:', e);
  }
}

// ============================================================
// LIVE PREVIEW
// ============================================================
function refreshLivePreview() {
  const name = document.getElementById('fullName')?.value.trim().toUpperCase() || '';
  const ref = '— PREVIEW —';
  const photo = getPhotoSrc();
  const category = document.getElementById('visaCategory')?.value || '';
  const nationality = document.getElementById('nationality')?.value || '';
  const container = document.getElementById('permitLivePreview');
  if (!container) return;
  if (!name && !photo) {
    container.innerHTML = `<div class="empty-state" style="padding:2rem 0;"><i class="fas fa-id-card" style="font-size:3rem;"></i><h3>Permit preview</h3><p>Fill in the form to see a preview</p></div>`;
    return;
  }
  container.innerHTML = buildPermitHTML({
    referenceNo: ref, fullName: name || 'FULL NAME',
    nationality, gender: document.getElementById('gender')?.value || 'MALE',
    dateOfBirth: document.getElementById('dateOfBirth')?.value || '—',
    passportNumber: document.getElementById('passportNumber')?.value || '—',
    passportType: document.getElementById('passportType')?.value || 'NORMAL',
    passportExpiry: document.getElementById('passportExpiry')?.value || '—',
    visaCategory: category,
    duration: document.getElementById('duration')?.value || '30',
    issuingDate: document.getElementById('issuingDate')?.value || '—',
    lastEntryDate: document.getElementById('lastEntryDate')?.value || '—',
    status: 'ACTIVE', photo
  }, 'preview-qr');
  // Don't render QR for preview (it says "PREVIEW")
}

// ============================================================
// BUILD PERMIT HTML (EXACT CLONE from ep.hayya.qa screenshot)
// ============================================================
function buildPermitHTML(data, qrId = 'qrcode') {
  const photoHTML = data.photo
    ? `<img src="${data.photo}" alt="Applicant" />`
    : `<i class="fas fa-user photo-placeholder"></i>`;
  
  const isExpired = data.status === 'EXPIRED' || (data.lastEntryDate && new Date(data.lastEntryDate) < new Date());
  const expiredOverlay = isExpired ? `<div class="permit-photo-expired-overlay">EXPIRED</div>` : '';

  return `
  <div class="permit-document" id="permit-doc-${qrId}">
    
    <!-- TOP SECTION: Logo + Visa Details -->
    <div class="permit-top-section">
      
      <!-- LEFT: Qatar Emblem + Title -->
      <div class="permit-logo-section">
        <img src="qatar-emblem.jpg" alt="Qatar Emblem" class="permit-qatar-emblem" onerror="this.style.display='none'" />
        <div class="permit-title-text">Hayya Entry Visa<br/>for State of Qatar</div>
      </div>

      <!-- RIGHT: Visa Details Grid -->
      <div class="permit-details-section">
        <div class="permit-details-title">HAYYA ENTRY VISA</div>
        <div class="permit-details-grid">
          <div class="permit-detail-item">
            <div class="permit-detail-label">Issuing Date</div>
            <div class="permit-detail-value">${data.issuingDate}</div>
          </div>
          <div class="permit-detail-item">
            <div class="permit-detail-label">Entry Reference No.</div>
            <div class="permit-detail-value">${data.referenceNo}</div>
          </div>
          <div class="permit-detail-item">
            <div class="permit-detail-label">Duration</div>
            <div class="permit-detail-value large">${data.duration}</div>
          </div>
          <div class="permit-detail-item">
            <div class="permit-detail-label">Last Entry Date</div>
            <div class="permit-detail-value">${data.lastEntryDate}</div>
          </div>
          <div class="permit-detail-item">
            <div class="permit-detail-label">Application Status</div>
            <div class="permit-detail-value ${isExpired ? 'status-expired' : ''}">${data.status}</div>
          </div>
          <div class="permit-detail-item">
            <div class="permit-detail-label">Visa Category</div>
            <div class="permit-detail-value">${data.visaCategory}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM SECTION: Photo + Info Panels + QR -->
    <div class="permit-bottom-row">
      
      <!-- LEFT: Photo + Name -->
      <div class="permit-photo-section">
        <div class="permit-photo-box">
          ${photoHTML}
          ${expiredOverlay}
        </div>
        <div class="permit-name-label">FULL NAME</div>
        <div class="permit-name-value">${data.fullName}</div>
      </div>

      <!-- CENTER: Personal Info + Passport -->
      <div class="permit-info-panels">
        
        <!-- Personal Information -->
        <div class="permit-info-panel">
          <div class="permit-panel-title">PERSONAL INFORMATION</div>
          <div class="permit-panel-grid">
            <div class="permit-panel-item">
              <div class="permit-panel-label">Nationality</div>
              <div class="permit-panel-value">${data.nationality}</div>
            </div>
            <div class="permit-panel-item">
              <div class="permit-panel-label">Gender</div>
              <div class="permit-panel-value">${data.gender}</div>
            </div>
            <div class="permit-panel-item" style="grid-column: 1 / -1;">
              <div class="permit-panel-label">Date of Birth</div>
              <div class="permit-panel-value">${data.dateOfBirth}</div>
            </div>
          </div>
        </div>

        <!-- Passport -->
        <div class="permit-info-panel">
          <div class="permit-panel-title">PASSPORT</div>
          <div class="permit-panel-grid">
            <div class="permit-panel-item">
              <div class="permit-panel-label">Passport Number</div>
              <div class="permit-panel-value">${data.passportNumber}</div>
            </div>
            <div class="permit-panel-item">
              <div class="permit-panel-label">Passport Type</div>
              <div class="permit-panel-value">${data.passportType}</div>
            </div>
            <div class="permit-panel-item" style="grid-column: 1 / -1;">
              <div class="permit-panel-label">Passport Expiry Date</div>
              <div class="permit-panel-value">${data.passportExpiry}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: QR + Hayya Logo -->
      <div class="permit-qr-section">
        <div class="permit-qr-box">
          <div id="${qrId}"></div>
        </div>
        <div class="permit-qr-ref">${data.referenceNo}</div>
        <div class="permit-hayya-logo">
          <span class="permit-hayya-logo-text">Hayya</span>
          <span class="permit-hayya-logo-arabic">هَيّا</span>
        </div>
      </div>

    </div><!-- /permit-bottom-row -->

  </div><!-- /permit-document -->`;
}

// ============================================================
// GENERATE QR CODE into a rendered permit
// ============================================================
function renderQR(elementId, text) {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    
    // Get the current domain and create full URL to user portal
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const permitUrl = baseUrl + 'user-portal.html?ref=' + encodeURIComponent(text || 'HAYYA');
    
    new QRCode(el, {
      text: permitUrl,
      width: 140, height: 140,
      colorDark: '#1a1a2e', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }, 120);
}

// ============================================================
// RESET FORM
// ============================================================
function resetForm() {
  ['fullName', 'nationality', 'dateOfBirth', 'passportNumber', 'passportExpiry', 'photoUrl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'nationality' ? 'Nigerian' : '';
  });
  document.getElementById('gender').value = 'MALE';
  document.getElementById('passportType').value = 'NORMAL';
  document.getElementById('visaCategory').value = 'Tourist Visa (A1)';
  document.getElementById('duration').value = '30';
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(); future.setDate(future.getDate() + 30);
  document.getElementById('issuingDate').value = today;
  document.getElementById('lastEntryDate').value = future.toISOString().split('T')[0];
  uploadedPhotoBase64 = null;
  if (document.getElementById('photoUpload')) document.getElementById('photoUpload').value = '';
  document.getElementById('visaPreviewContainer').classList.add('hidden');
  document.getElementById('saveVisaBtn').disabled = false;
  document.getElementById('saveVisaBtn').innerHTML = '<i class="fas fa-stamp"></i> Issue Entry Permit';
  currentVisaRef = null;
  refreshLivePreview();
  showToast('Form reset', 'success');
}

// ============================================================
// GENERATE & SAVE PERMIT
// ============================================================
function generateAndSaveVisa() {
  const btn = document.getElementById('saveVisaBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner spinner"></i> Processing...';

  try {
    const required = ['fullName', 'nationality', 'dateOfBirth', 'passportNumber', 'passportExpiry', 'issuingDate', 'lastEntryDate'];
    for (let id of required) {
      if (!document.getElementById(id).value.trim()) {
        showToast('Please fill in all required fields', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-stamp"></i> Issue Entry Permit';
        return;
      }
    }

    const passportNumber = document.getElementById('passportNumber').value.trim();

    const visaData = {
      referenceNo: generateRef(),
      fullName: document.getElementById('fullName').value.toUpperCase().trim(),
      nationality: document.getElementById('nationality').value.trim(),
      gender: document.getElementById('gender').value,
      dateOfBirth: document.getElementById('dateOfBirth').value,
      passportNumber,
      passportType: document.getElementById('passportType').value,
      passportExpiry: document.getElementById('passportExpiry').value,
      visaCategory: document.getElementById('visaCategory').value,
      duration: parseInt(document.getElementById('duration').value),
      issuingDate: document.getElementById('issuingDate').value,
      lastEntryDate: document.getElementById('lastEntryDate').value,
      photo: getPhotoSrc(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      entryCount: 0
    };

    const visas = getVisas();
    visas.push(visaData);
    saveVisas(visas);
    currentVisaRef = visaData.referenceNo;

    displayPermitDocument(visaData);
    document.getElementById('visaPreviewContainer').classList.remove('hidden');
    showToast(`Permit ${visaData.referenceNo} issued!`, 'success');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-stamp"></i> Issue Entry Permit';
    setTimeout(() => document.getElementById('visaPreviewContainer').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  } catch(error) {
    console.error('Error creating permit:', error);
    showToast('Error creating permit. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-stamp"></i> Issue Entry Permit';
  }
}

function displayPermitDocument(data) {
  const container = document.getElementById('visaPreview');
  container.innerHTML = buildPermitHTML(data, 'qrcode');
  renderQR('qrcode', data.referenceNo);
}

// ============================================================
// FULLSCREEN VIEW
// ============================================================
function openFullscreen() {
  const permitContent = document.getElementById('visaPreview').cloneNode(true);
  permitContent.id = 'fullscreen-permit-clone';
  document.getElementById('fullscreenContent').innerHTML = '';
  document.getElementById('fullscreenContent').appendChild(permitContent);
  document.getElementById('fullscreenModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Re-render QR in fullscreen
  setTimeout(() => {
    const qrEl = permitContent.querySelector('#qrcode');
    if (qrEl) {
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text: currentVisaRef || 'HAYYA',
        width: 140, height: 140,
        colorDark: '#1a1a2e', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
}

function closeFullscreen(event) {
  if (event) event.stopPropagation();
  document.getElementById('fullscreenModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================================
// DOWNLOAD PDF (FIXED - Wait for images to load)
// ============================================================
async function downloadPDF() {
  const element = document.getElementById('visaPreview');
  if (!element) { showToast('No permit to download', 'error'); return; }

  const btn = document.querySelector('#visaPreviewContainer .btn-success');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner spinner"></i> Generating...';
  btn.disabled = true;

  try {
    // Wait for all images to load
    const images = element.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if image fails
        setTimeout(resolve, 2000); // Timeout after 2 seconds
      });
    }));

    // Wait a bit for QR code to render
    await new Promise(resolve => setTimeout(resolve, 500));

    const opt = {
      margin: 10,
      filename: `HayyaPermit_${currentVisaRef || 'permit'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#264653'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'landscape'
      }
    };

    await html2pdf().set(opt).from(element).save();
    
    btn.innerHTML = orig; 
    btn.disabled = false;
    showToast('PDF downloaded successfully!', 'success');
  } catch (err) {
    console.error('PDF Error:', err); 
    btn.innerHTML = orig; 
    btn.disabled = false;
    showToast('PDF generation failed. Please use the Print button to save as PDF.', 'error');
  }
}

// ============================================================
// PRINT
// ============================================================
function printVisa() {
  const content = document.getElementById('visaPreview').outerHTML;
  const win = window.open('', '_blank', 'width=700,height=900');
  win.document.write(`<!DOCTYPE html><html><head><title>Hayya Entry Permit ${currentVisaRef}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <style>
    body{margin:0;padding:20px;background:white;font-family:'Inter',Arial,sans-serif;}
    ${getPermitPrintStyles()}
  </style></head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 800);
}

function getPermitPrintStyles() {
  return `
    body{margin:0;padding:20px;background:#f0f2f5;font-family:'Inter',Arial,sans-serif;}
    .permit-document{background:#264653;max-width:950px;margin:0 auto;color:white;padding:24px;border-radius:8px;}
    .permit-top-section{display:grid;grid-template-columns:260px 1fr;gap:20px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.15);}
    .permit-logo-section{background:rgba(0,0,0,0.2);border-radius:8px;padding:20px;display:flex;flex-direction:column;align-items:center;text-align:center;border:1px solid rgba(255,255,255,0.1);}
    .permit-qatar-emblem{width:80px;height:80px;margin-bottom:12px;filter:brightness(0) invert(1);opacity:0.95;}
    .permit-arabic-text{font-size:0.95rem;color:white;margin-bottom:8px;letter-spacing:0.5px;}
    .permit-title-text{font-size:1.05rem;font-weight:700;color:white;line-height:1.3;}
    .permit-details-section{background:rgba(0,0,0,0.15);border-radius:8px;padding:16px 20px;border:1px solid rgba(255,255,255,0.1);}
    .permit-details-title{font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);margin-bottom:14px;font-weight:600;}
    .permit-details-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
    .permit-detail-item{display:flex;flex-direction:column;gap:4px;}
    .permit-detail-label{font-size:0.68rem;text-transform:uppercase;color:rgba(255,255,255,0.55);letter-spacing:0.5px;}
    .permit-detail-value{font-size:0.92rem;font-weight:700;color:white;}
    .permit-detail-value.large{font-size:1.1rem;}
    .permit-detail-value.status-expired{color:#ff6b6b;}
    .permit-bottom-row{display:grid;grid-template-columns:320px 1fr 200px;gap:16px;align-items:start;}
    .permit-photo-section{background:rgba(0,0,0,0.2);border-radius:8px;padding:16px;border:1px solid rgba(255,255,255,0.1);}
    .permit-photo-box{width:100%;height:340px;border:2px solid rgba(255,255,255,0.3);border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:14px;}
    .permit-photo-box img{width:100%;height:100%;object-fit:cover;}
    .permit-photo-expired-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);font-size:3rem;font-weight:900;color:rgba(255,0,0,0.6);text-shadow:0 0 20px rgba(255,0,0,0.8);letter-spacing:3px;}
    .permit-name-label{font-size:0.7rem;text-transform:uppercase;color:rgba(255,255,255,0.5);letter-spacing:0.5px;margin-bottom:6px;}
    .permit-name-value{font-size:1.25rem;font-weight:800;color:white;letter-spacing:0.5px;line-height:1.2;}
    .permit-info-panels{display:flex;flex-direction:column;gap:14px;}
    .permit-info-panel{background:rgba(0,0,0,0.2);border-radius:8px;padding:14px 16px;border:1px solid rgba(255,255,255,0.1);}
    .permit-panel-title{font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.6);margin-bottom:12px;font-weight:600;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);}
    .permit-panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .permit-panel-item{display:flex;flex-direction:column;gap:4px;}
    .permit-panel-label{font-size:0.65rem;text-transform:uppercase;color:rgba(255,255,255,0.5);letter-spacing:0.3px;}
    .permit-panel-value{font-size:0.88rem;font-weight:600;color:white;}
    .permit-qr-section{background:rgba(0,0,0,0.2);border-radius:8px;padding:16px;display:flex;flex-direction:column;align-items:center;border:1px solid rgba(255,255,255,0.1);}
    .permit-qr-box{background:white;padding:12px;border-radius:8px;margin-bottom:16px;}
    .permit-qr-box img{max-width:140px;}
    .permit-qr-ref{font-family:monospace;font-size:0.85rem;font-weight:700;color:white;text-align:center;margin-bottom:20px;letter-spacing:0.5px;}
    .permit-hayya-logo{display:flex;align-items:center;gap:6px;}
    .permit-hayya-logo-text{font-size:1.4rem;font-weight:700;color:white;letter-spacing:1px;}
    .permit-hayya-logo-arabic{font-size:1.4rem;font-weight:700;color:#ffd700;letter-spacing:1px;}
  `;
}

// ============================================================
// ALL PERMITS TABLE
// ============================================================
function loadVisas() {
  const visas = getVisas();
  const tbody = document.getElementById('visaTableBody');
  if (!tbody) return;
  if (visas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:2rem;color:#9aa0b0;">
      <i class="fas fa-inbox" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;"></i>No permits issued yet</td></tr>`;
    return;
  }
  tbody.innerHTML = visas.map(v => {
    const photoCell = v.photo
      ? `<img src="${v.photo}" class="table-photo" alt="" />`
      : `<div class="table-photo-placeholder"><i class="fas fa-user" style="color:#b0b8c8;font-size:0.8rem;"></i></div>`;
    return `<tr>
      <td style="font-family:monospace;font-weight:700;color:var(--maroon);font-size:0.78rem;">${v.referenceNo}</td>
      <td>${photoCell}</td>
      <td><strong style="font-size:0.82rem;">${v.fullName}</strong></td>
      <td style="font-size:0.82rem;">${v.passportNumber}</td>
      <td style="font-size:0.82rem;">${v.nationality}</td>
      <td style="font-size:0.75rem;">${v.visaCategory}</td>
      <td style="font-size:0.8rem;">${v.lastEntryDate}</td>
      <td><span class="status-badge ${v.status.toLowerCase()}">${v.status}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-primary btn-sm" onclick="viewVisa('${v.referenceNo}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-success btn-sm" onclick="viewAndDownloadPDF('${v.referenceNo}')"><i class="fas fa-file-pdf"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteVisa('${v.referenceNo}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function viewVisa(ref) {
  const visa = getVisas().find(v => v.referenceNo === ref);
  if (!visa) { showToast('Permit not found', 'error'); return; }
  showPage('create');
  document.getElementById('fullName').value = visa.fullName;
  document.getElementById('nationality').value = visa.nationality;
  document.getElementById('gender').value = visa.gender;
  document.getElementById('dateOfBirth').value = visa.dateOfBirth;
  document.getElementById('passportNumber').value = visa.passportNumber;
  document.getElementById('passportType').value = visa.passportType;
  document.getElementById('passportExpiry').value = visa.passportExpiry;
  document.getElementById('visaCategory').value = visa.visaCategory;
  document.getElementById('duration').value = visa.duration;
  document.getElementById('issuingDate').value = visa.issuingDate;
  document.getElementById('lastEntryDate').value = visa.lastEntryDate;
  document.getElementById('photoUrl').value = visa.photo && !visa.photo.startsWith('data:') ? visa.photo : '';
  uploadedPhotoBase64 = visa.photo?.startsWith('data:') ? visa.photo : null;
  currentVisaRef = visa.referenceNo;
  displayPermitDocument(visa);
  document.getElementById('visaPreviewContainer').classList.remove('hidden');
  showToast(`Viewing ${ref}`, 'success');
}

function viewAndDownloadPDF(ref) {
  const visa = getVisas().find(v => v.referenceNo === ref);
  if (!visa) { showToast('Permit not found', 'error'); return; }
  showPage('create');
  currentVisaRef = ref;
  displayPermitDocument(visa);
  document.getElementById('visaPreviewContainer').classList.remove('hidden');
  setTimeout(() => downloadPDF(), 700);
}

function deleteVisa(ref) {
  if (!confirm(`Delete permit ${ref}?`)) return;
  saveVisas(getVisas().filter(v => v.referenceNo !== ref));
  showToast(`Permit ${ref} deleted`, 'success');
}

function clearAllVisas() {
  if (!confirm('Delete ALL permits? This cannot be undone.')) return;
  saveVisas([]);
  showToast('All permits cleared', 'success');
}

// ============================================================
// VERIFY / SCAN QR
// ============================================================
function lookupVisaByRef() {
  const ref = document.getElementById('scanRefInput').value.trim().toUpperCase();
  if (!ref) { showToast('Enter a permit number', 'error'); return; }
  const visa = getVisas().find(v => v.referenceNo === ref);
  const container = document.getElementById('scanResult');

  if (!visa) {
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem 0;">
        <i class="fas fa-times-circle" style="font-size:3rem;color:#dc3545;display:block;margin-bottom:1rem;"></i>
        <h3 style="color:#dc3545;">Permit Not Found</h3>
        <p style="color:#9aa0b0;margin-top:0.5rem;">No permit found for: <strong>${ref}</strong></p>
      </div>`;
    showToast('Permit not found', 'error'); return;
  }

  const isExpired = visa.status === 'EXPIRED' || new Date(visa.lastEntryDate) < new Date();
  const statusColor = isExpired ? '#dc3545' : '#0b8a4a';
  const statusIcon = isExpired ? 'fa-times-circle' : 'fa-check-circle';

  container.innerHTML = `
    <div style="border:2px solid ${statusColor};border-radius:12px;overflow:hidden;">
      <div style="background:${statusColor};padding:1rem;text-align:center;">
        <i class="fas ${statusIcon}" style="font-size:2rem;color:white;"></i>
        <h3 style="color:white;margin-top:0.5rem;font-size:1rem;">${isExpired ? 'PERMIT EXPIRED' : 'VALID PERMIT'}</h3>
        <p style="color:rgba(255,255,255,0.8);font-size:0.78rem;">Entry #${(visa.entryCount || 0) + 1}</p>
      </div>
      <div style="padding:1.25rem;">
        ${visa.photo ? `<div style="text-align:center;margin-bottom:1rem;"><img src="${visa.photo}" style="width:70px;height:85px;object-fit:cover;border-radius:4px;border:2px solid ${statusColor};" /></div>` : ''}
        <div class="permit-info-grid" style="margin-bottom:0;">
          <div class="info-item"><div class="i-label">Full Name</div><div class="i-value" style="font-size:0.8rem;">${visa.fullName}</div></div>
          <div class="info-item"><div class="i-label">Nationality</div><div class="i-value" style="font-size:0.8rem;">${visa.nationality}</div></div>
          <div class="info-item"><div class="i-label">Passport No.</div><div class="i-value mono" style="font-size:0.8rem;">${visa.passportNumber}</div></div>
          <div class="info-item"><div class="i-label">Category</div><div class="i-value" style="font-size:0.8rem;">${visa.visaCategory}</div></div>
          <div class="info-item"><div class="i-label">Last Entry</div><div class="i-value" style="font-size:0.8rem;color:${statusColor};">${visa.lastEntryDate}</div></div>
          <div class="info-item"><div class="i-label">Status</div><div class="i-value" style="font-size:0.8rem;color:${statusColor};">${visa.status}</div></div>
        </div>
        ${!isExpired ? `<div style="margin-top:1rem;padding:0.6rem 1rem;background:#d4edda;border-radius:8px;text-align:center;font-size:0.8rem;color:#0b7a3a;font-weight:600;">✅ Entry recorded successfully!</div>` : ''}
      </div>
    </div>`;

  // Increment entry count
  const all = getVisas();
  const idx = all.findIndex(v => v.referenceNo === ref);
  if (idx !== -1) { all[idx].entryCount = (all[idx].entryCount || 0) + 1; saveVisas(all); }
  showToast(`Permit ${ref} verified!`, 'success');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Keyboard enter on scan
  document.getElementById('scanRefInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') lookupVisaByRef();
  });

  // Live preview on form changes
  const formFields = ['fullName','nationality','gender','dateOfBirth','passportNumber',
    'passportType','passportExpiry','visaCategory','duration','issuingDate','lastEntryDate','photoUrl'];
  formFields.forEach(id => {
    document.getElementById(id)?.addEventListener('input', refreshLivePreview);
    document.getElementById(id)?.addEventListener('change', refreshLivePreview);
  });

  // Default dates
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(); future.setDate(future.getDate() + 30);
  document.getElementById('issuingDate').value = today;
  document.getElementById('lastEntryDate').value = future.toISOString().split('T')[0];

  updateDashboard();
  updateCounts();
  loadVisas();
  refreshLivePreview();
});
