use crate::services::folder_service;
use serde_json::json;

#[tauri::command]
pub fn create_folder(path: String) -> Result<String, String> {
    folder_service::create_folder(&path)
        .map(|_| json!({ "success": true, "path": path }).to_string())
        .map_err(|e| format!("Failed to create folder: {}", e))
}

#[tauri::command]
pub fn read_folder(path: String) -> Result<String, String> {
    folder_service::read_folder(&path)
        .and_then(|entries| {
            serde_json::to_string(&json!({
                "success": true,
                "path": path,
                "entries": entries,
            }))
            .map_err(|e| e.into())
        })
        .map_err(|e: Box<dyn std::error::Error>| format!("Failed to read folder: {}", e))
}

#[tauri::command]
pub fn rename_folder(old_path: String, new_path: String) -> Result<String, String> {
    folder_service::rename_folder(&old_path, &new_path)
        .map(|_| {
            json!({
                "success": true,
                "oldPath": old_path,
                "newPath": new_path,
            })
            .to_string()
        })
        .map_err(|e| format!("Failed to rename folder: {}", e))
}

#[tauri::command]
pub fn delete_folder(path: String) -> Result<String, String> {
    folder_service::delete_folder(&path)
        .map(|_| json!({ "success": true, "path": path }).to_string())
        .map_err(|e| format!("Failed to delete folder: {}", e))
}
