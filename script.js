// DOM Elements
const moodForm = document.getElementById("mood-form")
const entriesList = document.getElementById("entries-list")
const noEntriesMessage = document.getElementById("no-entries")
const insightContent = document.getElementById("insight-content")
const refreshInsightBtn = document.getElementById("refresh-insight")
const toast = document.getElementById("toast")

// Sample insights to use when there's not enough data
const sampleInsights = [
  "Regular exercise can boost your mood and energy levels throughout the day.",
  "Practicing mindfulness for just 5 minutes daily can help reduce stress and improve focus.",
  "Staying hydrated can improve your mood and cognitive function.",
  "Getting 7-8 hours of sleep consistently can significantly improve your emotional wellbeing.",
  "Taking short breaks during work can help maintain productivity and positive mood.",
]

// Initialize the app
function init() {
  loadEntries()
  generateInsight()

  // Event listeners
  moodForm.addEventListener("submit", handleFormSubmit)
  refreshInsightBtn.addEventListener("click", generateInsight)

  // Add event listener for right-click on entries
  entriesList.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    const target = e.target.closest(".entry-item");
    if (!target) return;

    const entryId = target.dataset.id;

    // Remove any existing context menu
    const existingMenu = document.querySelector(".context-menu");
    if (existingMenu) existingMenu.remove();

    // Create custom context menu
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `
      <button class="context-menu-item" data-action="delete">Delete Entry</button>
      <button class="context-menu-item" data-action="reset">Reset Log</button>
    `;

    // Append the menu to the entries container
    entriesList.appendChild(menu);

    // Get the bounding rectangles
    const rect = target.getBoundingClientRect();
    const containerRect = entriesList.getBoundingClientRect();

    // Adjust for scroll offsets
    const scrollTop = entriesList.scrollTop;
    const scrollLeft = entriesList.scrollLeft;

    // Position the menu relative to the clicked entry
    menu.style.top = `${rect.top - containerRect.top + target.offsetHeight + scrollTop}px`;
    menu.style.left = `${rect.left - containerRect.left + scrollLeft}px`;

    // Handle menu actions
    menu.addEventListener("click", (event) => {
      const action = event.target.dataset.action;

      if (action === "delete") {
        deleteEntry(entryId);
      } else if (action === "reset") {
        resetLog();
      }

      menu.remove(); // Remove menu after action
    });

    // Remove menu if clicked outside
    document.addEventListener(
      "click",
      () => {
        if (menu.parentNode) {
          menu.remove();
        }
      },
      { once: true }
    );
  });
}

// Handle form submission
function handleFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(moodForm)
  const mood = formData.get("mood")
  const habitInput = document.getElementById("habit")
  const habit = habitInput ? habitInput.value.trim() : null

  if (!mood || !habit) {
    showToast("Missing information", "Please select a mood and enter a habit.", "error")
    return
  }

  const entry = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    mood,
    habit,
  }

  saveEntry(entry)
  moodForm.reset()
  showToast("Entry logged!", "Your mood and habit have been recorded.")

  // Regenerate insight after new entry
  generateInsight()
}

// Save entry to localStorage
function saveEntry(entry) {
  const entries = getEntries()
  entries.unshift(entry)

  // Keep only the last 30 entries
  const limitedEntries = entries.slice(0, 30)

  localStorage.setItem("moodloop_entries", JSON.stringify(limitedEntries))
  loadEntries()
}

// Get entries from localStorage
function getEntries() {
  const entriesJson = localStorage.getItem("moodloop_entries")
  return entriesJson ? JSON.parse(entriesJson) : []
}

// Load and display entries
function loadEntries() {
  const entries = getEntries()

  if (!entries || entries.length === 0) {
    noEntriesMessage.style.display = "block"
    entriesList.innerHTML = ""
    return
  }

  noEntriesMessage.style.display = "none"

  // Display only the 10 most recent entries
  const recentEntries = entries.slice(0, 10)

  entriesList.innerHTML = recentEntries
    .map(
      (entry) => `
    <div class="entry-item" data-id="${entry.id}">
      <div class="entry-mood ${entry.mood}">
        ${getMoodIcon(entry.mood)}
      </div>
      <div class="entry-content">
        <div class="entry-date">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${formatDate(entry.date)}
        </div>
        <div class="entry-habit">${entry.habit}</div>
      </div>
    </div>
  `,
    )
    .join("")
}

// Generate AI insight
async function generateInsight() {
  const entries = getEntries();

  insightContent.innerHTML = `
    <div class="insight-loading">
      <div class="loading-line"></div>
      <div class="loading-line"></div>
      <div class="loading-line"></div>
    </div>
  `;

  refreshInsightBtn.classList.add("loading");

  if (entries.length < 3) {
    const insight = sampleInsights[Math.floor(Math.random() * sampleInsights.length)];
    displayInsight(insight);
    return;
  }

  const moodLog = entries
    .slice(0, 10)
    .map((entry) => `${entry.mood} - ${entry.habit}`)
    .join(", ");

  const prompt = `You are a lifestyle coach that help people improve life style. Based on the following mood and habit log: ${moodLog}, suggest 2, 3 line short positve,encouraging specific tips to improve mood, tailored to the habits and moods in the log. add some colorful genz emojis
  Format the output like:
  use "#" before a new advise.
  Ensure the tips are relevant to the person's current habits or patterns, avoid generic advice, and be specific to what could help based on the provided data. Avoid using markdown or asterisks. Keep the tone friendly and positive.`;


  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=ADD_YOUR_GEMINI_APIKEY', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    console.log("Gemini API Response:", data);
    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || "Couldn't generate insight.";
    displayInsight(insight);

  } catch (error) {
    console.error("Gemini API Error:", error);
    displayInsight("Oops! We couldn't get insights right now. Try again later.");
  }
}

// Helper function to display the generated insight
function displayInsight(insight) {
  const bulletPoints = insight.split('#').map(item => item.trim()).filter(item => item.length > 0);
  const formattedinsight = bulletPoints.map(item => `<li>${item}</li>`).join("");
  console.log("Formatted Insight:", formattedinsight);
  insightContent.innerHTML = `
    <div class="insight-message" style="display: flex; flex-direction: column;">
      <svg class="insight-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.66347 17H14.3364" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 13.5V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 7C12.5523 7 13 6.55228 13 6C13 5.44772 12.5523 5 12 5C11.4477 5 11 5.44772 11 6C11 6.55228 11.4477 7 12 7Z" fill="currentColor"/>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>${formattedinsight}</p>
    </div>
  `;

  refreshInsightBtn.classList.remove("loading");
}

// Show toast notification
function showToast(title, message, type = "success") {
  const toastTitle = toast.querySelector(".toast-title")
  const toastMessage = toast.querySelector(".toast-message")

  toastTitle.textContent = title
  toastMessage.textContent = message

  if (type === "error") {
    toastTitle.style.color = "var(--color-sad)"
  } else {
    toastTitle.style.color = "var(--color-happy)"
  }

  toast.classList.add("show")

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}

// Format date to readable string
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Get mood icon SVG
function getMoodIcon(mood) {
  if (mood === "happy") {
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 9H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 9H15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  } else if (mood === "neutral") {
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 15H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 9H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 9H15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  } else {
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 16C16 16 14.5 14 12 14C9.5 14 8 16 8 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 9H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 9H15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  }
}

// Delete a specific entry
function deleteEntry(entryId) {
  const entries = getEntries();
  const updatedEntries = entries.filter((entry) => entry.id !== entryId);
  localStorage.setItem("moodloop_entries", JSON.stringify(updatedEntries));
  loadEntries();
  showToast("Entry Deleted", "The selected entry has been removed.");
}

// Reset the entire log
function resetLog() {
  localStorage.removeItem("moodloop_entries");
  loadEntries();
  showToast("Log Reset", "All entries have been cleared.");
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", init)
