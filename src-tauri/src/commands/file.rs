use crate::services::file_services;

#[tauri::command]
pub fn some_command() {
    file_services::some_command();
}
