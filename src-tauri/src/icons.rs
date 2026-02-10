use anyhow::{Context, Result};
use base64::Engine;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Resolves the app icon for a given process name and returns it as a
/// base64-encoded PNG data URL (e.g. `data:image/png;base64,...`).
pub fn get_icon_data_url(process_name: &str) -> Result<String> {
    let app_path =
        find_app_bundle(process_name).context("Could not find app bundle")?;

    let icon_path =
        find_icon_file(&app_path).context("Could not find icon file in app bundle")?;

    let png_data =
        convert_icns_to_png(&icon_path).context("Could not convert icon to PNG")?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_data);
    Ok(format!("data:image/png;base64,{}", b64))
}

// ---------------------------------------------------------------------------
// App bundle resolution
// ---------------------------------------------------------------------------

/// Locates the `.app` bundle for a given process name by first trying
/// Spotlight (`mdfind`) and then falling back to well-known directories.
fn find_app_bundle(process_name: &str) -> Option<PathBuf> {
    // 1. Try Spotlight search (fast, covers all installed apps)
    if let Some(path) = find_via_spotlight(process_name) {
        return Some(path);
    }

    // 2. Fallback: check common locations
    let mut candidates: Vec<PathBuf> = vec![
        format!("/Applications/{}.app", process_name).into(),
        format!("/System/Applications/{}.app", process_name).into(),
        format!("/Applications/Utilities/{}.app", process_name).into(),
    ];

    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(format!("Applications/{}.app", process_name)));
    }

    candidates.into_iter().find(|p| p.exists())
}

/// Uses Spotlight to find an app bundle by name.
fn find_via_spotlight(process_name: &str) -> Option<PathBuf> {
    let query = format!(
        "kMDItemContentType == 'com.apple.application-bundle' && kMDItemFSName == '{}.app'",
        process_name
    );

    let output = Command::new("mdfind")
        .arg(&query)
        .output()
        .ok()?;

    let stdout = String::from_utf8(output.stdout).ok()?;
    let first_line = stdout.lines().next()?.trim();

    if first_line.is_empty() {
        return None;
    }

    let path = PathBuf::from(first_line);
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// Icon file resolution
// ---------------------------------------------------------------------------

/// Reads the app's `Info.plist` to find `CFBundleIconFile`, then locates
/// the `.icns` file inside `Contents/Resources/`.
fn find_icon_file(app_path: &Path) -> Option<PathBuf> {
    let info_plist = app_path.join("Contents/Info.plist");

    // Try reading CFBundleIconFile from Info.plist via PlistBuddy
    if info_plist.exists() {
        if let Some(icon_path) = read_icon_from_plist(&info_plist, app_path) {
            return Some(icon_path);
        }
    }

    // Fallback: try common icon filenames
    let resources = app_path.join("Contents/Resources");
    let common_names = ["AppIcon.icns", "app.icns", "icon.icns"];

    common_names
        .iter()
        .map(|name| resources.join(name))
        .find(|p| p.exists())
}

/// Reads `CFBundleIconFile` from `Info.plist` and returns the full icon path.
fn read_icon_from_plist(plist_path: &Path, app_path: &Path) -> Option<PathBuf> {
    let output = Command::new("/usr/libexec/PlistBuddy")
        .args(["-c", "Print :CFBundleIconFile", plist_path.to_str()?])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let mut icon_name = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if icon_name.is_empty() {
        return None;
    }

    // Append .icns if the plist value doesn't already have an extension
    if !icon_name.ends_with(".icns") {
        icon_name.push_str(".icns");
    }

    let icon_path = app_path.join("Contents/Resources").join(&icon_name);
    if icon_path.exists() {
        Some(icon_path)
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// ICNS → PNG conversion
// ---------------------------------------------------------------------------

/// Converts an `.icns` file to a 64×64 PNG using the macOS `sips` tool.
fn convert_icns_to_png(icns_path: &Path) -> Result<Vec<u8>> {
    // Use a unique temp file to avoid races
    let temp_png = std::env::temp_dir().join(format!(
        "webcam-tracker-icon-{}.png",
        std::process::id()
    ));

    let status = Command::new("sips")
        .args([
            "-s",
            "format",
            "png",
            "-z",
            "64",
            "64",
            icns_path.to_str().unwrap(),
            "--out",
            temp_png.to_str().unwrap(),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .context("Failed to run sips")?;

    if !status.success() {
        anyhow::bail!("sips conversion failed");
    }

    let data = std::fs::read(&temp_png).context("Failed to read converted PNG")?;
    let _ = std::fs::remove_file(&temp_png);

    Ok(data)
}

