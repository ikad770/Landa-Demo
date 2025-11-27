// data/rca-data.js
// Root Cause Analyzer – data model (SetOff + placeholders for other issues)

window.RCA_DATA = {
  /* ========= SETOFF ========= */
  setoff: {
    code: "setoff",
    title: "SetOff",
    description:
      "Guided root-cause analysis for SetOff issues, based on machine subsystems and spec checks.",

    // High-level triage questions (VISIO: With / Without / Both)
    triage: [
      {
        id: "coating_mode",
        label: "When does the SetOff appear?",
        type: "choice",
        help: "Choose the closest scenario according to the customer complaint / test print.",
        options: [
          { value: "with", label: "Only with coating" },
          { value: "without", label: "Only without coating" },
          { value: "both", label: "With & without coating" }
        ]
      }
    ],

    // Which subsystems are relevant per triage result
    triageBranch: {
      with: ["ICS", "Powder", "STS"],
      without: ["IPS", "BCU", "IRD", "BCS", "STS", "DFE"],
      both: ["IPS", "BCU", "IRD", "BCS", "STS", "DFE", "ICS", "Powder"]
    },

    /* ===== Subsystems (per VISIO) ===== */
    subsystems: {
      /* --- IRD: מתוך ה-Visio שעשית --- */
      IRD: {
        id: "IRD",
        title: "IRD – Infrared Dryer",
        mechanism: "drying",
        description:
          "Infrared dryer pressure, vacuum, blanket temperature and calibration checks.",
        checks: [
          {
            id: "ird_pressure",
            order: 1,
            label: "IRD Pressure",
            type: "range",
            unit: "mbar",
            spec: { min: 2000, max: 2400 },
            prompt: "Check IRD pressure sensor and regulator configuration."
          },
          {
            id: "ird_vacuum",
            order: 2,
            label: "IRD Vacuum",
            type: "range",
            unit: "mbar",
            spec: { min: 60, max: 80 },
            prompt: "Verify IRD vacuum level and leakage in the circuit."
          },
          {
            id: "ipu_pressure",
            order: 3,
            label: "IPU Pressure (Per Unit)",
            type: "range",
            unit: "bar",
            spec: { min: 280, max: 320 },
            prompt: "Check IPU pressure per unit according to service procedure."
          },
          {
            id: "ipu_vacuum",
            order: 4,
            label: "IPU Vacuum",
            type: "range",
            unit: "mbar",
            spec: { min: 80, max: 120 },
            prompt: "Verify IPU vacuum lines and valves are operating correctly."
          },
          {
            id: "blanket_temp",
            order: 5,
            label: "Blanket Temperature",
            type: "multiRange",
            unit: "°C",
            points: [
              { id: "ady1_11200", label: "ADY1 11200", target: 135 },
              { id: "afipu1", label: "AFIPU1", target: 72 },
              { id: "afipu7", label: "AFIPU7", target: 74 },
              { id: "ady1_6505", label: "ADY1 6505", target: 130 }
            ],
            prompt:
              "Measure temperatures for all blanket reference points and compare to targets."
          },
          {
            id: "slits_calib",
            order: 6,
            label: "IR Slits Calibration Verification",
            type: "boolean",
            prompt:
              "Ensure IRD slits are calibrated and aligned according to IRD Slits procedure."
          },
          {
            id: "mass_balance",
            order: 7,
            label: "Mass Balance Validation",
            type: "boolean",
            prompt:
              "Verify mass balance kit is installed and validated (refer to Mass Balance UG)."
          },
          {
            id: "pipes_condition",
            order: 8,
            label: "IRD System Pipes Condition Validation",
            type: "boolean",
            prompt:
              "Check all IRD pipes for leaks, damage, or incorrect installation."
          }
        ]
      },

      /* --- דוגמאות / placeholders – עד שתוסיף ב-Visio גם להם Data --- */
      STS: {
        id: "STS",
        title: "STS – Sheet Transport System",
        mechanism: "transport",
        description: "Transport related checks that may impact SetOff behaviour.",
        checks: [
          {
            id: "sts_speed",
            order: 1,
            label: "Transport speed vs. job profile",
            type: "boolean",
            prompt: "Verify transport speed matches job profile and media type."
          },
          {
            id: "sts_alignment",
            order: 2,
            label: "Sheet alignment & skew",
            type: "boolean",
            prompt:
              "Check skew sensors and mechanical alignment along the transport path."
          }
        ]
      },

      Powder: {
        id: "Powder",
        title: "Powder / Over-coating",
        mechanism: "surface",
        description: "Powder / over-coating application checks.",
        checks: [
          {
            id: "powder_amount",
            order: 1,
            label: "Powder amount",
            type: "range",
            unit: "%",
            spec: { min: 30, max: 70 },
            prompt:
              "Compare powder application to recommended range for the specific media."
          },
          {
            id: "powder_coverage",
            order: 2,
            label: "Powder coverage uniformity",
            type: "boolean",
            prompt:
              "Visually verify uniform powder coverage across the sheet surface."
          }
        ]
      },

      Transport: {
        id: "Transport",
        title: "General Transport",
        mechanism: "transport",
        description: "High-level media transport checks.",
        checks: [
          {
            id: "media_contact",
            order: 1,
            label: "Media contact points",
            type: "boolean",
            prompt:
              "Review all media contact points and verify no unexpected contact after printing."
          }
        ]
      },

      // Placeholders – ימולאו בהמשך על בסיס Visio:
      IPS: {
        id: "IPS",
        title: "IPS",
        mechanism: "upstream",
        description: "Upstream IPS checks (placeholder).",
        checks: []
      },
      BCU: {
        id: "BCU",
        title: "BCU",
        mechanism: "control",
        description: "BCU related checks (placeholder).",
        checks: []
      },
      BCS: {
        id: "BCS",
        title: "BCS",
        mechanism: "control",
        description: "BCS related checks (placeholder).",
        checks: []
      },
      DFE: {
        id: "DFE",
        title: "DFE",
        mechanism: "rip",
        description: "DFE / RIP related checks (placeholder).",
        checks: []
      },
      ICS: {
        id: "ICS",
        title: "ICS – Coating System",
        mechanism: "coating",
        description: "ICS coating related checks (placeholder).",
        checks: []
      }
    }
  },

  /* ========= SCRATCHES (Placeholder) ========= */
  scratches: {
    code: "scratches",
    title: "Scratches",
    description: "Basic wizard for print scratches investigation (placeholder).",
    triage: [
      {
        id: "side",
        label: "Where do you see scratches?",
        type: "choice",
        options: [
          { value: "front", label: "Front side" },
          { value: "back", label: "Back side" },
          { value: "both", label: "Both sides" }
        ]
      }
    ],
    triageBranch: {
      front: [],
      back: [],
      both: []
    },
    subsystems: {}
  },

  /* ========= UNIFORMITY (Placeholder) ========= */
  uniformity: {
    code: "uniformity",
    title: "Uniformity",
    description: "Placeholder for uniformity based RCA.",
    triage: [],
    triageBranch: {},
    subsystems: {}
  },

  /* ========= PQ (Placeholder) ========= */
  pq: {
    code: "pq",
    title: "PQ – Print Quality",
    description: "General print quality wizard (placeholder).",
    triage: [],
    triageBranch: {},
    subsystems: {}
  }
};
