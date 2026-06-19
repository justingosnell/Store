# Category Management - User Guide

## Quick Start

### Accessing Category Management

There are two ways to manage categories:

1. **Admin Dashboard** (Recommended)
   - Navigate to `/admin`
   - Click the "Categories" tab
   - Manage categories alongside locations and media

2. **Standalone Page**
   - Navigate to `/categories`
   - Full-page category management interface

## Managing Categories

### Creating a New Category

1. Click the **"Add Category"** button
2. Fill in the category details:
   - **Name**: Display name (e.g., "Roadside Diners")
   - **Slug**: URL-friendly identifier (e.g., "roadside-diners")
     - Must be unique
     - Only lowercase letters, numbers, and hyphens
     - Auto-generated from name if left empty
   - **Icon**: Emoji to represent the category (e.g., 🍔)
   - **Color**: Hex color code for map markers (e.g., #ff6b6b)
     - Click the color swatch to open color picker
   - **Description**: Brief description of the category (optional)
   - **Display Order**: Number to control sort order (lower = first)
3. Click **"Create Category"**
4. Category appears immediately in all filters and dropdowns

### Editing a Category

1. Find the category card you want to edit
2. Click the **pencil icon** (Edit) in the top-right corner
3. Modify any fields in the dialog
4. Click **"Save Changes"**
5. Updates appear immediately throughout the app

### Deleting a Category

1. Find the category card you want to delete
2. Click the **trash icon** (Delete) in the top-right corner
3. Confirm deletion in the dialog
4. **Note**: You cannot delete categories that have locations assigned to them
   - The system will show an error with the count of affected locations
   - Reassign or delete those locations first

## Category Display

### Where Categories Appear

Categories are displayed throughout the application:

1. **Home Page**
   - "Quirky Collections" section shows all categories
   - Each card displays icon, name, description, and location count
   - Dynamically updates when categories change

2. **Map Page**
   - Category filter sidebar on the left
   - Click any category to filter map markers
   - Map markers use category colors

3. **Admin Dashboard**
   - Location table shows category badges
   - Category colors applied to badges
   - Filter locations by category

4. **Location Dialog**
   - Category dropdown when creating/editing locations
   - Shows category icon and name
   - Sorted by display order

## Best Practices

### Naming Categories
- Use clear, descriptive names
- Keep names concise (2-3 words ideal)
- Use title case (e.g., "Historic Landmarks")

### Choosing Slugs
- Use lowercase with hyphens
- Match the category name when possible
- Keep it short and memorable
- Examples:
  - "Roadside Diners" → `roadside-diners`
  - "Giant Statues" → `giant-statues`
  - "Neon Signs" → `neon-signs`

### Selecting Icons
- Use relevant emoji that represent the category
- Common choices:
  - 🍔 Food/Diners
  - 🏛️ Historic Buildings
  - 🎨 Art Installations
  - 🚗 Automotive
  - 🌳 Natural Wonders
  - 🎪 Entertainment
  - 🏪 Shops/Stores

### Picking Colors
- Choose distinct colors for each category
- Ensure good contrast on map backgrounds
- Consider color psychology:
  - Red/Orange: Exciting, attention-grabbing
  - Blue: Calm, trustworthy
  - Green: Natural, peaceful
  - Yellow: Cheerful, optimistic
  - Purple: Creative, unique
- Avoid very light colors (hard to see on map)

### Display Order
- Lower numbers appear first
- Use increments of 10 (10, 20, 30...) to allow easy reordering
- Most important/popular categories should be first
- Example ordering:
  - 10: Muffler Men (most popular)
  - 20: World's Largest
  - 30: Unique Finds
  - 40: New Category

## Examples

### Example 1: Adding "Roadside Diners"

```
Name: Roadside Diners
Slug: roadside-diners
Icon: 🍔
Color: #ff6b6b (red)
Description: Classic American diners and drive-ins
Display Order: 40
```

### Example 2: Adding "Neon Signs"

```
Name: Neon Signs
Slug: neon-signs
Icon: 💡
Color: #ff00ff (magenta)
Description: Vintage neon signage and light displays
Display Order: 50
```

### Example 3: Adding "Quirky Museums"

```
Name: Quirky Museums
Slug: quirky-museums
Icon: 🏛️
Color: #9b59b6 (purple)
Description: Unusual and offbeat museum collections
Display Order: 60
```

## Troubleshooting

### "Slug already exists" Error
- Each slug must be unique
- Try adding a number or modifier: `diners-2`, `classic-diners`
- Check existing categories for conflicts

### Cannot Delete Category
- Category has locations assigned to it
- Options:
  1. Reassign locations to different category
  2. Delete the locations first
  3. Keep the category

### Category Not Appearing
- Refresh the page (React Query cache)
- Check browser console for errors
- Verify you're logged in as admin

### Colors Not Showing
- Ensure color is valid hex format: `#rrggbb`
- Include the `#` symbol
- Use 6-digit hex codes (not 3-digit)

## Tips & Tricks

### Quick Color Selection
Popular color choices for categories:
- `#f97316` - Orange (warm, inviting)
- `#10b981` - Green (natural, fresh)
- `#eab308` - Yellow (bright, cheerful)
- `#3b82f6` - Blue (calm, trustworthy)
- `#a855f7` - Purple (creative, unique)
- `#ef4444` - Red (exciting, bold)
- `#06b6d4` - Cyan (modern, cool)
- `#f59e0b` - Amber (vintage, classic)

### Emoji Selection
Find emojis at:
- [Emojipedia](https://emojipedia.org/)
- [Get Emoji](https://getemoji.com/)
- Use your OS emoji picker:
  - Mac: Cmd + Ctrl + Space
  - Windows: Win + .
  - Linux: Ctrl + .

### Organizing Categories
Consider grouping by theme:
- **Size**: Giant, Large, Small
- **Type**: Food, Art, Nature, Historic
- **Era**: Vintage, Modern, Retro
- **Region**: Route 66, Southwest, East Coast

## API Reference

For developers integrating with the category system:

### Get All Categories
```
GET /api/categories
Response: Category[]
```

### Create Category
```
POST /api/categories
Body: { name, slug, icon, color, description, displayOrder }
Response: Category
```

### Update Category
```
PATCH /api/categories/:id
Body: { name?, slug?, icon?, color?, description?, displayOrder? }
Response: Category
```

### Delete Category
```
DELETE /api/categories/:id
Response: { success: boolean }
```

## Support

If you encounter issues:
1. Check this guide for common solutions
2. Review the browser console for errors
3. Verify your admin permissions
4. Check the server logs for backend errors

---

**Last Updated**: 2025
**Version**: 1.0