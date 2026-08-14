# Hayya Entry Permit Portal

A complete web application for managing Qatar Hayya Entry Permits with admin and user portals.

## 🌟 Features

- **Admin Portal**: Issue, manage, and verify entry permits
- **User Portal**: Check permit status by reference number
- **Authentication**: Secure admin login
- **QR Code**: Generate QR codes for each permit
- **Print/PDF**: Save permits as PDF
- **Fullscreen View**: View permits in fullscreen mode

## 🔐 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📁 Project Structure

- `login.html` - Main landing page with login options
- `index.html` - Admin portal (requires login)
- `user-portal.html` - User portal (no login required)
- `app.js` - Admin portal JavaScript
- `user-portal.js` - User portal JavaScript
- `styles.css` - Admin portal styles
- `user-portal.css` - User portal styles

## 🚀 How to Use

1. **Start Here**: Open `login.html`
2. **For Users**: Click "Check Permit" to search by reference number
3. **For Admins**: Click "Admin Login" and enter credentials

## 💾 Storage

Data is stored locally in browser localStorage. Each user's browser has its own data.

## 🎨 Technologies

- HTML5
- CSS3
- JavaScript (Vanilla)
- QRCode.js
- html2pdf.js
- Font Awesome Icons

## 📝 License

Free to use for personal and educational purposes.

---

Made with ❤️ for Qatar Entry Permit Management
