# Script Deletion Guide for PSScript

This guide explains how to delete scripts in the PSScript application.

## Individual Script Deletion

There are two ways to delete individual scripts:

### Method 1: From the Script Management Page

1. Navigate to the Script Management page by clicking on "Manage Scripts" in the sidebar or by going to `/scripts` in the URL.
2. Find the script you want to delete in the list.
3. Click the "Delete" button in the Actions column for that script.
4. Confirm the deletion when prompted.

### Method 2: From the Script Detail Page

1. Navigate to the Script Detail page by clicking on a script's title from the Dashboard or Script Management page.
2. Look for the Delete button in the actions area.
3. Click the Delete button and confirm the deletion when prompted.

## Bulk Script Deletion

To delete multiple scripts at once:

1. Navigate to the Script Management page by clicking on "Manage Scripts" in the sidebar or by going to `/scripts` in the URL.
2. Select the scripts you want to delete by checking the checkboxes next to them.
3. A bulk actions bar will appear at the bottom of the screen.
4. Click the "Delete Selected" button in the bulk actions bar.
5. Confirm the deletion when prompted.

## Programmatic Deletion

For developers or administrators who need to delete scripts programmatically:

### Using the API

The PSScript API provides endpoints for deleting scripts:

#### Delete a Single Script

```
DELETE /api/scripts/:id
```

Example using curl:
```bash
curl -X DELETE http://localhost:4000/api/scripts/123
```

#### Delete Multiple Scripts

```
POST /api/scripts/delete
```

Example using curl:
```bash
curl -X POST http://localhost:4000/api/scripts/delete \
  -H "Content-Type: application/json" \
  -d '{"ids": [123, 456, 789]}'
```

## Troubleshooting

If you encounter issues when trying to delete scripts:

1. **Permission Errors**: Ensure you have the necessary permissions to delete the script. You can only delete scripts that you created unless you have admin privileges.

2. **Script Not Found**: If you get a "Script not found" error, the script may have already been deleted or may not exist.

3. **Server Errors**: If you encounter a server error, try refreshing the page and attempting the deletion again. If the issue persists, contact your system administrator.

## Notes

- Deleting a script is permanent and cannot be undone.
- When a script is deleted, all associated data (analysis, versions, execution logs, etc.) is also deleted.
- The script management page will automatically refresh after successful deletion.
