pub mod components;
pub mod systems;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::components::*;

// We use wasm_bindgen so this can be called from TypeScript/Web
// For Bevy, you would remove wasm_bindgen and use these as Bevy Components or Resources.

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GameState {
    characters: Vec<Character>,
    active_scenario_id: String,
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new(active_scenario_id: String) -> GameState {
        GameState {
            characters: Vec::new(),
            active_scenario_id,
        }
    }
    
    // A method to serialize state to JS/Web
    pub fn to_json(&self) -> String {
        serde_json::to_string(&self).unwrap_or_else(|_| "{}".to_string())
    }
}
