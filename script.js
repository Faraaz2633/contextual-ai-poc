// Function to dynamically load a script
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Load Popper.js and Tippy.js dynamically
    await loadScript("https://unpkg.com/@popperjs/core@2");
    await loadScript("https://unpkg.com/tippy.js@6");

    const forms = document.querySelectorAll("form");

    const API_KEY =
      document
        .querySelector('script[data-name="contextual-ai"]')
        ?.getAttribute("data-id") || "";

    // const API_KEY =
    //   document
    //     .querySelector(
    //       'script[src="https://cdn.jsdelivr.net/gh/Faraaz2633/contextual-poc@main/script.js"]'
    //     )
    //     ?.getAttribute("data-id") || "";

    if (!API_KEY) {
      throw new Error("ID not provided");
    }

    const collectedData = [];

    forms.forEach((form) => {
      const labels = form.querySelectorAll("label");

      labels.forEach((label) => {
        const fieldset = label.closest("fieldset");
        const hasLegend = fieldset && fieldset.querySelector("legend");

        if (!hasLegend) {
          const infoButton = document.createElement("button");
          infoButton.innerHTML = "ℹ";
          infoButton.classList.add("info-btn");
          infoButton.style.marginLeft = "4px";
          infoButton.style.background = "transparent";
          infoButton.style.border = "none";
          infoButton.style.cursor = "pointer";

          const textContent = label.textContent.trim();

          label.appendChild(infoButton);

          collectedData.push({
            tag: "label",
            id: label.getAttribute("id"),
            classList: Array.from(label.classList),
            text: textContent,
            hasLegend: hasLegend,
            infoButton: infoButton,
          });
        }
      });

      const legends = form.querySelectorAll("legend");

      legends.forEach((legend) => {
        const infoButton = document.createElement("button");
        infoButton.innerHTML = "ℹ";
        infoButton.classList.add("info-btn");
        infoButton.style.marginLeft = "4px";
        infoButton.style.background = "transparent";
        infoButton.style.border = "none";
        infoButton.style.cursor = "pointer";

        const textContent = legend.textContent.trim();

        legend.appendChild(infoButton);

        collectedData.push({
          tag: "legend",
          id: legend.getAttribute("id"),
          classList: Array.from(legend.classList),
          text: textContent,
          infoButton: infoButton,
        });
      });
    });

    const sendDataToGeminiAI = async (data) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `
Please analyze the following page content and determine its context. You are given a list of form labels. For each label, generate a concise tooltip that improves user experience, based on the context of the page. Each tooltip should provide additional guidance for the field without being overly wordy. 

Page Content:
${document.body.innerHTML}

Form Labels:
${data.map((item) => `- ${item.text}`).join("\n")}

Provide the response only as a JavaScript object in the following format:
{
  "label_name_1": "tooltip_text_1",
  "label_name_2": "tooltip_text_2",
  ...
}

Important: Do not include anything other than the JavaScript object in the response, not even json. Only include tooltips for the fields listed above. Make sure the tooltips are relevant to the context of the page.
`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const aiResponse = await response.json();
      const responseContent =
        aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

      console.log(responseContent);

      const populateInfoButtons = (response) => {
        // Split the response into lines and filter out empty lines

        // Create a mapping of tooltips from the AI response

        // Parse each line to create the tooltips map
        const cleanAndParseResponse = (response) => {
          // Remove the code block markers (triple backticks) and leading/trailing spaces
          const cleanedResponse = response
            .replace(/```javascript|\n```/g, "")
            .trim();

          // Parse the cleaned response as JSON
          const tooltipsMap = JSON.parse(cleanedResponse);

          return tooltipsMap;
        };

        const tooltipsMap = cleanAndParseResponse(response);

        console.log(tooltipsMap);

        // Populate the tooltips for each info button
        collectedData.forEach((data) => {
          if (data.infoButton) {
            const tooltipText = tooltipsMap[data.text];

            if (tooltipText) {
              tippy(data.infoButton, {
                content: tooltipText,
                placement: "top",
                animation: "fade",
                theme: "light",
              });
            }
          }
        });
      };

      populateInfoButtons(responseContent);
    };

    // Call the function to send data to AI

    await sendDataToGeminiAI(collectedData);
  } catch (error) {
    console.error("Failed to load scripts:", error);
  }
});

// const forms = document.querySelectorAll("form");

// forms.forEach((form) => {
//   // Select all <label> elements within the form
//   const labels = form.querySelectorAll("label");

//   labels.forEach((label) => {
//     // Check if the label is part of a fieldset
//     const fieldset = label.closest("fieldset");
//     // Check if the fieldset contains a legend
//     const hasLegend = fieldset && fieldset.querySelector("legend");

//     // Handle edge cases for labels
//     if (!hasLegend) {
//       // Create an info button for labels that do not belong to a fieldset with a legend
//       const infoButton = document.createElement("button");
//       infoButton.innerHTML = "ℹ";
//       infoButton.classList.add("info-btn");
//       infoButton.style.marginLeft = "4px";
//       infoButton.style.background = "transparent"; // Transparent background
//       infoButton.style.border = "none"; // No border
//       infoButton.style.cursor = "pointer"; // Pointer cursor

//       const labelContent = label.textContent.trim();
//       label.appendChild(infoButton);

//       tippy(infoButton, {
//         content: labelContent,
//         placement: "top",
//         animation: "fade",
//         theme: "light",
//       });
//     }
//   });

//   // Handle legends separately
//   const legends = form.querySelectorAll("legend");

//   legends.forEach((legend) => {
//     // Create an info button for legends
//     const infoButton = document.createElement("button");
//     infoButton.innerHTML = "ℹ";
//     infoButton.classList.add("info-btn");
//     infoButton.style.marginLeft = "4px";
//     infoButton.style.background = "transparent"; // Transparent background
//     infoButton.style.border = "none"; // No border
//     infoButton.style.cursor = "pointer"; // Pointer cursor

//     const legendContent = legend.textContent.trim();
//     legend.appendChild(infoButton);

//     tippy(infoButton, {
//       content: legendContent,
//       placement: "top",
//       animation: "fade",
//       theme: "light",
//     });
//   });
// });
