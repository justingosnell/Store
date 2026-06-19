# Bulk Upload Feature Guide

## Overview
The bulk upload feature allows you to upload multiple locations at once using a `.txt` file, saving time when adding many locations to your database.

## How to Use

### 1. Access the Feature
- Log in to the admin dashboard
- Go to the **Locations** tab
- Click the **"Bulk Upload"** button (next to "Add Location")

### 2. Prepare Your File
Create a `.txt` file with one location per line in this format:

```
City, State, Category, Visit Date, Name
```

**Example:**
```
Chicago, IL, Muffler Men, 01/15/2024, Giant Paul Bunyan
Austin, TX, World's Largest, 02/20/2024, World's Largest Cowboy Boots
Portland, OR, Unique Finds, 03/10/2024, Peculiar Park Sculpture
New York, NY, Unique Finds, 04/05/2024, Strange Roadside Sign
San Francisco, CA, World's Largest, 05/12/2024, Largest Flamingo
```

### 3. File Format Requirements
- **City**: The city name (e.g., "Chicago")
- **State**: Two-letter state code (e.g., "IL")
- **Category**: Must be one of:
  - `Muffler Men` (giant roadside figures)
  - `World's Largest` (oversized claims to fame)
  - `Unique Finds` (one-of-a-kind oddities)
  - *(Accepts any capitalization and spacing, e.g., "muffler-men", "MUFFLER MEN", "Muffler Men")*
- **Visit Date**: Date in MM/DD/YYYY format (e.g., "01/15/2024")
- **Name**: Location name (e.g., "Giant Paul Bunyan")

**Important Notes:**
- Each field must be separated by a comma
- Date must be in MM/DD/YYYY format
- One location per line
- Empty lines are ignored

### 4. Upload Process
1. Click **"Bulk Upload"** button
2. Select your `.txt` file
3. Click **"Upload"**
4. Review the results:
   - ✅ **Success**: Number of locations created
   - ❌ **Failed**: Number of locations that failed (with error details)

### 5. After Upload
The uploaded locations will be created with:
- ✅ Name, City, State, Category, and Visit Date from your file
- ⚠️ **Default values** for:
  - Latitude: 0 (needs manual update)
  - Longitude: 0 (needs manual update)
  - Photo: Empty (needs manual update)
  - Address: Empty (optional)

**Next Steps:**
1. Find the newly created locations in your locations list
2. Edit each location to add:
   - Coordinates (latitude/longitude)
   - Photos
   - Additional details

## Error Handling
If a line fails to import, the system will:
- Skip that line
- Continue with the remaining lines
- Show you which lines failed and why

Common errors:
- **Invalid category**: Make sure you use one of: Muffler Men, World's Largest, or Unique Finds (spacing and capitalization don't matter)
- **Invalid date format**: Must be MM/DD/YYYY (e.g., "01/15/2024")
- **Missing fields**: Need all 5 fields separated by commas
- **Invalid data format**: Check that your file follows the exact format specified above

## Sample File
A sample file (`test-locations.txt`) has been created in the project root for testing.

## Technical Details
- **File Type**: `.txt` only
- **Encoding**: UTF-8
- **Max File Size**: No specific limit (reasonable file sizes recommended)
- **Authentication**: Admin login required
- **API Endpoint**: `/api/locations/bulk-upload`

## Tips
1. Start with a small test file (3-5 locations) to verify the format
2. Keep a backup of your original file
3. Review the upload results carefully
4. Update coordinates and photos as soon as possible after upload
5. Use consistent category names for better organization