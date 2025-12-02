// Minimal sample RCA data – you can extend with full VISIO logic later
window.RCA_DATA = {
  SetOff: {
    steps: [
      "Identify symptom",
      "Check IRD system",
      "Validate job / media setup",
      "Confirm stability"
    ],
    question: "What is the dominant symptom you observe?",
    options: [
      {
        label: "Ink offset / Set-off marks",
        weight: 4,
        next: {
          question: "Where is the issue visible?",
          options: [
            {
              label: "On the back of sheets (post-IRD)",
              weight: 5,
              next: {
                result: {
                  title: "IRD mass-balance / temperature tune",
                  description: "Most issues of this type are resolved by validating IRD mass-balance, ink temperature and media throughput.",
                  checklist: [
                    "Check IRD temperature sensors are within spec",
                    "Verify mass-balance window and PID parameters",
                    "Confirm ink temperature is aligned with job/media type",
                    "Run 30 minutes at target speed and re-evaluate set-off"
                  ]
                }
              }
            },
            {
              label: "Within the stack, not only last sheets",
              next: {
                result: {
                  title: "Check media, powder and stacking",
                  description: "Verify media compatibility, powder usage (if relevant) and stacking pressure.",
                  checklist: [
                    "Confirm media is approved for current setup",
                    "Check powder/anti-set-off settings",
                    "Validate stacker pressure and offset pattern",
                    "Review previous jobs with similar media"
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
            title: "Mechanical path check",
            description: "Inspect transport path for mechanical interference, damaged rollers or guides.",
            checklist: [
              "Inspect IRD and transport rollers",
              "Check for burrs or sharp edges along path",
              "Verify sheet path alignment and skew",
              "Compare results with different media weight"
            ]
          }
        }
      }
    ]
  }
};
