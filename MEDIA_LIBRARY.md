# Media Library Feature

## Overview

The Media Library is a WordPress-style image management system that allows administrators to upload, organize, and reuse images across the RoadsideMapper application.

## Features

### 1. **Upload Images**
- Upload images directly to the media library
- Supported formats: JPEG, PNG, GIF, WebP
- Maximum file size: 10MB
- Automatic image dimension detection
- Stores metadata including filename, size, dimensions, and upload date

### 2. **Browse & Search**
- Grid view of all uploaded images
- Search by filename, alt text, or caption
- Thumbnail previews with hover actions
- Displays image metadata (size, dimensions, upload date)

### 3. **Image Selection**
- Select images from the library when creating/editing locations
- Two modes:
  - **Select Mode**: Choose an image for a location
  - **Manage Mode**: Full library management with edit/delete capabilities

### 4. **Edit Metadata**
- Add alt text for accessibility
- Add captions for context
- Update metadata without re-uploading

### 5. **Delete Images**
- Remove images from the library
- Automatically deletes files from disk
- Confirmation dialog to prevent accidental deletion

## Usage

### For Administrators

#### Accessing the Media Library
1. Log in to the admin panel
2. Navigate to the "Media Library" tab
3. Click "Open Media Library" button

#### Uploading Images
1. Open the Media Library
2. Switch to the "Upload New" tab
3. Click "Select Image" or drag and drop
4. Image will be automatically uploaded and added to the library

#### Using Images in Locations
1. When creating or editing a location
2. In the Photo field, click "Choose from Library"
3. Select an image from your library
4. The image URL will be automatically populated

#### Managing Images
1. Open Media Library in "Manage" mode
2. Hover over an image to see actions:
   - **Edit**: Update alt text and caption
   - **Delete**: Remove image from library
3. Use the search bar to find specific images

## API Endpoints

### Media Library Endpoints (Admin Only)

- `GET /api/media` - Get all media items
- `GET /api/media/:id` - Get single media item
- `POST /api/media` - Upload new image
- `PUT /api/media/:id` - Update media metadata (alt, caption)
- `DELETE /api/media/:id` - Delete media item

### Legacy Upload Endpoint (Backward Compatible)

- `POST /api/upload` - Direct upload (returns URL only)

## Database Schema

```typescript
media {
  id: string (UUID)
  filename: string
  originalName: string
  url: string
  mimeType: string
  size: string
  width: string (optional)
  height: string (optional)
  alt: string (default: "")
  caption: string (default: "")
  uploadedAt: timestamp
  uploadedBy: string (user ID reference)
}
```

## Technical Details

### Frontend Components

- **MediaLibrary.tsx**: Main media library component with tabs for browsing and uploading
- **LocationDialog.tsx**: Updated to include "Choose from Library" button

### Backend

- **routes.ts**: Media library API endpoints
- **storage.ts**: In-memory storage implementation for media items
- **schema.ts**: Media table schema and TypeScript types

### Dependencies

- `image-size`: For extracting image dimensions
- `multer`: For handling file uploads

## Benefits

1. **Reusability**: Upload once, use multiple times
2. **Organization**: Centralized image management
3. **Efficiency**: No need to re-upload the same image
4. **Metadata**: Better SEO and accessibility with alt text
5. **User-Friendly**: WordPress-style interface familiar to most users

## Future Enhancements

Potential improvements for the media library:

- [ ] Bulk upload support
- [ ] Image editing (crop, resize, rotate)
- [ ] Folders/categories for organization
- [ ] Image optimization/compression
- [ ] CDN integration
- [ ] Usage tracking (which locations use which images)
- [ ] Pagination for large libraries
- [ ] Drag-and-drop upload
- [ ] Image filters and effects