use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub role: String,
    pub description: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Scenario {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub date: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct StoryNode {
    pub id: String,
    pub content: String,
    pub character_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct NarrativeGoal {
    pub id: String,
    pub description: String,
    pub status: GoalStatus,
    pub priority: GoalPriority,
    pub progress: u32,
    pub type_: GoalType,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum GoalStatus {
    Active,
    Completed,
    Failed,
    Pending,
    Abandoned,
}

impl Default for GoalStatus {
    fn default() -> Self {
        GoalStatus::Pending
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum GoalPriority {
    High,
    Medium,
    Low,
}

impl Default for GoalPriority {
    fn default() -> Self {
        GoalPriority::Medium
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum GoalType {
    Plot,
    Character,
    World,
    Theme,
}

impl Default for GoalType {
    fn default() -> Self {
        GoalType::Plot
    }
}

// --- Nations & Factions ---

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Nation {
    pub id: String,
    pub name: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub government_type: Option<String>,
    pub continent: Option<String>,
    pub capital_name: Option<String>,
    pub ruler: Option<String>,
    pub factions: Vec<NationFaction>,
    pub regions: Vec<Region>,
    // Other fields can be added as necessary...
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct NationFaction {
    pub id: String,
    pub name: String,
    pub type_: String, // e.g., 'Military', 'Religious', 'Political'
    pub leader: Option<String>,
    pub description: String,
    pub influence: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Region {
    pub id: String,
    pub name: String,
    pub description: String,
    pub capital: bool,
    pub climate: Option<String>,
    pub cities: Vec<City>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct City {
    pub id: String,
    pub name: String,
    pub description: String,
}

// --- World Rules ---

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WorldRule {
    pub id: String,
    pub text: String,
    pub description: String,
    pub category: Option<WorldRuleCategory>,
    pub flexibility: Option<RuleFlexibility>,
    pub exceptions: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum WorldRuleCategory {
    Physics,
    Magic,
    Social,
    Economy,
    Divine,
    Meta,
    Other,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum RuleFlexibility {
    Absolute,
    High,
    Moderate,
    Low,
    Guideline,
}

// --- Lore & Traits ---

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct LoreEntry {
    pub id: String,
    pub name: String,
    pub content: String,
    pub category: String,
    pub aliases: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct PsychologicalTrait {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub intensity: u8,
    pub triggers: Vec<String>,
}

