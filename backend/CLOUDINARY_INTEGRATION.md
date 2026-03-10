# Cloudinary PDF Storage Integration

This document explains the implementation of Cloudinary integration for PDF invoice storage in the Express backend.

## 📁 Folder Structure

```
backend/
├── config/
│   ├── cloudinary.js          # Cloudinary configuration
│   ├── express.js
│   ├── mongoose.js
│   └── msg91.js
├── controllers/
│   ├── fileUploadController.js # File upload controller
│   ├── invoiceController.js    # Enhanced with Cloudinary
│   └── ...
├── middleware/
│   ├── auth.js
│   ├── upload.js              # Multer configuration
│   └── ...
├── models/
│   ├── Invoice.js
│   └── ...
├── routes/
│   ├── fileUpload.js          # File upload routes
│   ├── invoice.js
│   └── ...
├── services/
│   ├── cloudinaryUpload.js    # Cloudinary upload service
│   ├── invoicePDFService.js
│   └── ...
├── uploads/
│   └── temp/                  # Temporary file storage
├── .env                       # Environment variables
└── index.js                   # Main application file
```

## 🔧 Environment Variables

Add these variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## 🚀 API Endpoints

### File Upload Endpoints

| Method | Endpoint                             | Description                              | Auth Required |
| ------ | ------------------------------------ | ---------------------------------------- | ------------- |
| POST   | `/v1/files/upload-invoice`           | Upload PDF to Cloudinary (disk storage)  | ✅            |
| POST   | `/v1/files/upload-invoice-buffer`    | Upload PDF to Cloudinary (memory buffer) | ✅            |
| DELETE | `/v1/files/delete-invoice/:publicId` | Delete PDF from Cloudinary               | ✅ Admin      |
| GET    | `/v1/files/secure-url/:publicId`     | Generate secure download URL             | ✅            |

### Enhanced PDF Generation

| Method | Endpoint                   | Description             | New Feature               |
| ------ | -------------------------- | ----------------------- | ------------------------- |
| GET    | `/v1/invoices/:id/pdf`     | Generate & download PDF | Auto-upload to Cloudinary |
| GET    | `/v1/invoices/:id/preview` | Preview PDF in browser  | -                         |

## 📋 Usage Examples

### 1. Upload PDF File

```javascript
const formData = new FormData();
formData.append("invoice", pdfFile);

const response = await fetch("/v1/files/upload-invoice", {
  method: "POST",
  body: formData,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const result = await response.json();
console.log("PDF URL:", result.data.file_url);
```

### 2. Upload from Buffer/Memory

```javascript
const formData = new FormData();
formData.append("invoice", pdfBlob);

const response = await fetch("/v1/files/upload-invoice-buffer", {
  method: "POST",
  body: formData,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 3. Generate Secure Download URL

```javascript
const response = await fetch(
  `/v1/files/secure-url/${publicId}?expiresIn=7200`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);

const result = await response.json();
console.log("Secure URL:", result.data.secure_url);
```

### 4. Delete PDF

```javascript
const response = await fetch(`/v1/files/delete-invoice/${publicId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## 🔒 Security Features

- **Authentication Required**: All endpoints require valid JWT tokens
- **Role-based Access**: Admin-only endpoints for deletion
- **File Type Validation**: Only PDF files accepted
- **File Size Limits**: 10MB maximum file size
- **Secure URLs**: Time-limited download URLs
- **Folder Organization**: Files stored in organized folders
- **Error Handling**: Comprehensive error handling and cleanup

## 🎯 Key Features

### Cloudinary Upload Service

- **Multiple Upload Methods**: File path or buffer upload
- **Automatic Cleanup**: Temporary file cleanup
- **Metadata Tagging**: Organized file tagging
- **Error Handling**: Robust error handling
- **Secure URLs**: Generate expiring download links

### Multer Configuration

- **File Validation**: PDF-only filter
- **Size Limits**: Configurable file size limits
- **Storage Options**: Disk and memory storage
- **Error Handling**: Custom error messages

### Enhanced Invoice PDF

- **Auto Storage**: PDF automatically stored in Cloudinary
- **Fallback**: Continues if cloud storage fails
- **Organized Storage**: Files stored in 'invoices' folder
- **Metadata**: Tagged with user and invoice information

## 🔧 Configuration Options

### Cloudinary Upload Options

```javascript
const uploadOptions = {
  folder: "invoices", // Storage folder
  fileName: "unique_name", // Custom filename
  tags: ["pdf", "invoice"], // File tags
  overwrite: false, // Overwrite existing
  resource_type: "raw", // For non-image files
};
```

### Multer Configuration

```javascript
const multerOptions = {
  fileSize: 10 * 1024 * 1024, // 10MB limit
  files: 1, // Single file upload
  fileFilter: pdfFilter, // PDF-only filter
};
```

## 🚨 Error Handling

The implementation includes comprehensive error handling:

- **File Upload Errors**: Invalid file type, size exceeded
- **Cloudinary Errors**: Upload failures, network issues
- **Authentication Errors**: Invalid tokens, insufficient permissions
- **Validation Errors**: Missing files, invalid parameters

## 📊 File Organization

Files are organized in Cloudinary with:

- **Folder Structure**: `/invoices/filename_timestamp.pdf`
- **Naming Convention**: `invoice_number_timestamp`
- **Tags**: `invoice`, `pdf`, `user_id`, `invoice_id`
- **Metadata**: Upload timestamp, purpose, user info

## 🛠️ Maintenance

### Cleanup Temporary Files

The system automatically cleans up temporary files after upload, but you can manually clean with:

```javascript
await cloudinaryUpload.cleanupTempFile("/path/to/temp/file");
```

### Monitor Storage

Monitor Cloudinary usage through their dashboard for:

- Storage usage
- Bandwidth consumption
- API call limits
- Transformation usage

## 🔄 Future Enhancements

Consider these improvements:

1. **Database Integration**: Store Cloudinary URLs in Invoice model
2. **Batch Operations**: Multiple file uploads
3. **Image Transformations**: PDF thumbnails/previews
4. **Webhook Integration**: Cloudinary upload notifications
5. **CDN Optimization**: Custom domain configuration
6. **Backup Strategy**: Secondary storage options
