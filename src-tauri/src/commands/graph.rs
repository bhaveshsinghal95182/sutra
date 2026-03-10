use crate::services::graph_services;
use serde_json::json;

#[tauri::command]
pub fn generate_and_save_graph(folder_path: String) -> Result<String, String> {
    match graph_services::generate_graph_data(&folder_path) {
        Ok(graph_data) => {
            match graph_services::save_graph_data(&folder_path, &graph_data) {
                Ok(_) => {
                    Ok(json!({
                        "success": true,
                        "nodeCount": graph_data.nodes.len(),
                        "linkCount": graph_data.links.len(),
                    })
                    .to_string())
                }
                Err(e) => Err(format!("Failed to save graph data: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to generate graph data: {}", e)),
    }
}

