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

async function execute() {
  try {
    // Load Popper.js and Tippy.js dynamically
    await loadScript("https://unpkg.com/@popperjs/core@2");
    await loadScript("https://unpkg.com/tippy.js@6");

    const API_KEY =
      document
        .querySelector('script[data-name="contextual-ai"]')
        ?.getAttribute("data-id") || "";

    if (!API_KEY) {
      throw new Error("ID not provided");
    }

    // Function to collect form data
    const collectFormData = () => {
      const collectedData = [];
      const forms = document.querySelectorAll("form");

      forms.forEach((form) => {
        const labels = form.querySelectorAll("label:not([data-info-added])");
        
        labels.forEach((label) => {
          const fieldset = label.closest("fieldset");
          const hasLegend = fieldset && fieldset.querySelector("legend");

          const textContent = label.textContent.trim();
          
          if (!hasLegend && textContent?.length > 0) {
            
            collectedData.push({
              tag: "label",
              id: label.getAttribute("id"),
              classList: Array.from(label.classList),
              text: textContent,
              element: label,
              hasLegend: hasLegend
            });
          }
        });

        // const legends = form.querySelectorAll("legend:not([data-info-added])");

        // legends.forEach((legend) => {

        //   const textContent = legend.textContent.trim();

        //   collectedData.push({
        //     tag: "legend",
        //     id: legend.getAttribute("id"),
        //     classList: Array.from(legend.classList),
        //     text: textContent,
        //     element: legend,
        //   });
        // });
      });

      return collectedData;
    };

    // Function to fetch data from Gemini AI with session caching
    const fetchDataWithCache = async (data) => {
      if (!data.length) return null;
      
      const cacheKey = `geminiAI-${data.map((item) => item.text).join("-")}`;
      const cachedResponse = sessionStorage.getItem(cacheKey);

      if (cachedResponse) {
        console.log("Using cached response");
        return JSON.parse(cachedResponse);
      }

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

      sessionStorage.setItem(cacheKey, JSON.stringify(responseContent));
      return responseContent;
    };

    // Function to populate the info buttons with tooltips
    const populateInfoButtons = async (data, response) => {
      if (!response) return;

      const cleanAndParseResponse = (response) => {
        const cleanedResponse = response
          .replace(/```javascript|\n```/g, "")
          .trim();
        return JSON.parse(cleanedResponse);
      };

      const tooltipsMap = cleanAndParseResponse(response);

      console.log(tooltipsMap)

      data.forEach((item) => {
        if (tooltipsMap[item.text] && !item.element.hasAttribute("data-info-added")) {
          const infoButton = document.createElement("button");
          infoButton.innerHTML = "ℹ";
          infoButton.classList.add("info-btn");
          infoButton.style.marginLeft = "4px";
          infoButton.style.background = "transparent";
          infoButton.style.border = "none";
          infoButton.style.cursor = "pointer";
          
          item.element.appendChild(infoButton);
          item.element.setAttribute('data-info-added', 'true');

          tippy(infoButton, {
            content: tooltipsMap[item.text],
            placement: "top",
            animation: "fade",
            theme: "light",
          });
        }
      });
    };

    // Function to handle DOM updates
    const handleDOMUpdate = async () => {
      const newData = collectFormData();
      if (newData.length > 0) {
        const responseContent = await fetchDataWithCache(newData);
        await populateInfoButtons(newData, responseContent);
      }
    };

    // MutationObserver to detect changes and re-run logic if necessary
    const observer = new MutationObserver(async (mutations) => {
      const hasFormChanges = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => 
          node.nodeName === 'FORM' || 
          (node.nodeType === 1 && (node.querySelector('form') || node.querySelector('label') || node.querySelector('legend')))
        );
      });

      if (hasFormChanges) {
        await handleDOMUpdate();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial setup
    await handleDOMUpdate();

  } catch (error) {
    console.error("Failed to load scripts:", error);
  }
}

execute();
