// Simple RCA data structure – can be extended
window.RCA_DATA = {
  SetOff: {
    steps: [
      "Identify symptom",
      "Check IRD",
      "Verify setup",
      "Stability run"
    ],
    question: "What best describes the symptom?",
    options: [
      {
        label: "Ink set-off marks",
        weight: 5,
        next: {
          question: "Where do you see it mainly?",
          options: [
            {
              label: "On the back of sheets (post-IRD)",
              weight: 5,
              next: {
                result: {
                  title: "Tune IRD mass-balance & temperature",
                  description:
                    "Most issues of this type are resolved by validating IRD mass-balance, ink temperature and media throughput.",
                  checklist: [
                    "Check IRD temperature sensors are within spec",
                    "Verify mass-balance window and PID parameters",
                    "Confirm ink temperature vs. media & job type",
                    "Run 30 minutes at target speed and re-evaluate set-off"
                  ]
                }
              }
            },
            {
              label: "Within the stack, not just last sheets",
              weight: 3,
              next: {
                result: {
                  title: "Check media, powder and stacking",
                  description:
                    "Verify media compatibility, anti set-off (powder) usage and stacking pressure / offset pattern.",
                  checklist: [
                    "Confirm media is approved for current setup",
                    "Check powder / anti set-off configuration",
                    "Validate stacker pressure and offset pattern",
                    "Compare with previous similar jobs"
                  ]
                }
              }
            }
          ]
        }
      },
      {
        label: "Scratches / mechanical marks",
        weight: 3,
        next: {
          result: {
            title: "Transport path inspection",
            description:
              "Inspect mechanical path components (rollers, guides) for damage or interference.",
            checklist: [
              "Inspect IRD and transport rollers for wear",
              "Look for burrs / sharp edges along path",
              "Verify sheet alignment and skew",
              "Compare results with different media weight"
            ]
          }
        }
      }
    ]
  }
};
