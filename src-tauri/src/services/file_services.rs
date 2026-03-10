use regex::Regex;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

pub fn some_command() {
    println!("some_command");
}

#[derive(Debug, Clone)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub file_id: String,
}

#[derive(Debug, Clone)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
}

#[derive(Debug)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

/// Extract links from markdown content.
/// Supports: [text](reference), [[reference]], and #heading references
fn extract_links(content: &str, _file_id: &str) -> Vec<String> {
    let mut links = HashSet::new();

    // Match markdown links: [text](reference)
    if let Ok(re) = Regex::new(r"\[([^\]]+)\]\(([^\)]+)\)") {
        for cap in re.captures_iter(content) {
            if let Some(m) = cap.get(2) {
                links.insert(m.as_str().to_string());
            }
        }
    }

    // Match wiki links: [[reference]]
    if let Ok(re) = Regex::new(r"\[\[([^\]]+)\]\]") {
        for cap in re.captures_iter(content) {
            if let Some(m) = cap.get(1) {
                links.insert(m.as_str().to_string());
            }
        }
    }

    // Match heading references: #heading-slug
    if let Ok(re) = Regex::new(r"#([a-zA-Z0-9\-_]+)") {
        for cap in re.captures_iter(content) {
            if let Some(m) = cap.get(1) {
                links.insert(format!("#{}", m.as_str()));
            }
        }
    }

    links.into_iter().collect()
}

/// Check if a path is a file we should index (markdown, txt, etc)
fn is_indexable_file(path: &Path) -> bool {
    match path.extension() {
        Some(ext) => {
            let ext_str = ext.to_string_lossy().to_lowercase();
            matches!(ext_str.as_str(), "md" | "txt" | "markdown")
        }
        None => false,
    }
}

/// Recursively read files and build graph data
fn build_graph_data(dir_path: &str) -> Result<GraphData, Box<dyn std::error::Error>> {
    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut links: Vec<GraphLink> = Vec::new();
    let mut file_links: HashMap<String, Vec<String>> = HashMap::new();
    let mut file_names: HashMap<String, String> = HashMap::new();

    // First pass: collect all files and their links
    fn traverse(
        path: &Path,
        nodes: &mut Vec<GraphNode>,
        file_links: &mut HashMap<String, Vec<String>>,
        file_names: &mut HashMap<String, String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Skip .sutra and other dot directories
        if let Some(name) = path.file_name() {
            if name.to_string_lossy().starts_with('.') {
                return Ok(());
            }
        }

        if path.is_dir() {
            for entry in fs::read_dir(path)? {
                let entry = entry?;
                traverse(&entry.path(), nodes, file_links, file_names)?;
            }
        } else if is_indexable_file(path) {
            let file_id = path
                .to_string_lossy()
                .to_string()
                .replace('\\', "/");
            let file_name = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            // Create node
            nodes.push(GraphNode {
                id: file_id.clone(),
                name: file_name.clone(),
                file_id: file_id.clone(),
            });

            file_names.insert(file_id.clone(), file_name);

            // Read content and extract links
            if let Ok(content) = fs::read_to_string(path) {
                let extracted_links = extract_links(&content, &file_id);
                file_links.insert(file_id, extracted_links);
            }
        }
        Ok(())
    }

    traverse(Path::new(dir_path), &mut nodes, &mut file_links, &mut file_names)?;

    // Second pass: build links between files
    for (source_id, linked_refs) in &file_links {
        for reference in linked_refs {
            // Try to match reference to a file
            let mut target_id: Option<String> = None;

            // Normalize the source path to get the directory
            let source_dir = Path::new(source_id)
                .parent()
                .map(|p| p.to_string_lossy().to_string().replace('\\', "/"))
                .unwrap_or_else(|| String::from(""));

            // 1. Try direct file path match (with or without .md)
            let ref_with_md = if reference.ends_with(".md") {
                reference.clone()
            } else {
                format!("{}.md", reference)
            };

            // Try absolute path match
            if target_id.is_none() {
                target_id = nodes
                    .iter()
                    .find(|n| n.id == *reference || n.id == ref_with_md || n.id.ends_with(&format!("/{}", reference)) || n.id.ends_with(&format!("/{}", ref_with_md)))
                    .map(|n| n.id.clone());
            }

            // 2. Try relative path from source directory
            if target_id.is_none() && !source_dir.is_empty() {
                let full_ref = format!("{}/{}", source_dir, reference);
                let full_ref_md = format!("{}/{}", source_dir, ref_with_md);
                target_id = nodes
                    .iter()
                    .find(|n| {
                        n.id == full_ref || n.id == full_ref_md || 
                        n.id.ends_with(&format!("/{}", reference)) || 
                        n.id.ends_with(&format!("/{}", ref_with_md))
                    })
                    .map(|n| n.id.clone());
            }

            // 3. Try filename match (exact match with extension stripped)
            if target_id.is_none() {
                let ref_clean = reference.replace(".md", "").to_lowercase();
                target_id = nodes
                    .iter()
                    .find(|n| n.name.to_lowercase() == ref_clean)
                    .map(|n| n.id.clone());
            }

            // 4. Try partial filename match (contains reference)
            if target_id.is_none() {
                let ref_lower = reference.to_lowercase().replace(".md", "");
                target_id = nodes
                    .iter()
                    .find(|n| {
                        let name_lower = n.name.to_lowercase();
                        name_lower.contains(&ref_lower) || ref_lower.contains(&name_lower)
                    })
                    .map(|n| n.id.clone());
            }

            if let Some(target) = target_id {
                if source_id != &target {
                    // Avoid duplicate links
                    if !links.iter().any(|l| l.source == *source_id && l.target == target) {
                        links.push(GraphLink {
                            source: source_id.clone(),
                            target,
                        });
                    }
                }
            }
        }
    }

    Ok(GraphData { nodes, links })
}

pub fn generate_graph_data(folder_path: &str) -> Result<GraphData, Box<dyn std::error::Error>> {
    build_graph_data(folder_path)
}

pub fn save_graph_data(folder_path: &str, graph_data: &GraphData) -> Result<(), Box<dyn std::error::Error>> {
    // Create .sutra directory
    let sutra_dir = Path::new(folder_path).join(".sutra");
    fs::create_dir_all(&sutra_dir)?;

    // Convert to JSON
    let nodes_json: Vec<Value> = graph_data
        .nodes
        .iter()
        .map(|n| json!({ "id": n.id, "name": n.name, "fileId": n.file_id }))
        .collect();

    let links_json: Vec<Value> = graph_data
        .links
        .iter()
        .map(|l| json!({ "source": l.source, "target": l.target }))
        .collect();

    let graph_json = json!({
        "nodes": nodes_json,
        "links": links_json,
    });

    // Write to file
    let graph_file = sutra_dir.join("graph-data.json");
    let json_str = serde_json::to_string_pretty(&graph_json)?;
    fs::write(graph_file, json_str)?;

    Ok(())
}
