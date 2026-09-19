use std::io::{self, Read};

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let mut input = String::new();
    io::stdin()
        .take(32 * 1024 * 1024 + 1)
        .read_to_string(&mut input)?;
    if input.len() > 32 * 1024 * 1024 {
        return Err("SceneIR runtime request exceeds 32 MiB".into());
    }
    let request = serde_json::from_str(&input)?;
    let output = bas_runtime::execute(request).map_err(io::Error::other)?;
    println!("{}", serde_json::to_string(&output)?);
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("bas-runtime: {error}");
        std::process::exit(1);
    }
}
