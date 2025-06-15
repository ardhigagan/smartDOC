const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const textEditor = document.getElementById("textEditor");
const editorContainer = document.getElementById("editorContainer");
const toggleMode = document.getElementById("toggleMode");

let currentText = "";
let storedFiles = JSON.parse(localStorage.getItem("storedFiles")) || [];

// Dark/Light Mode
function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById("modeIcon");
  const text = document.querySelector(".modeText");

  body.classList.toggle("dark-mode");

  const isDark = body.classList.contains("dark-mode");

  icon.textContent = isDark ? "☀️" : "🌙";
  text.textContent = isDark ? "Light Mode" : "Dark Mode";
}

// Load stored files
window.onload = () => {
  storedFiles.forEach(renderFile);
};

// File Upload
fileInput.addEventListener("change", async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    const fileData = await readFile(file);
    const fileObj = { name: file.name, dataURL: fileData, type: file.type };
    storedFiles.push(fileObj);
    localStorage.setItem("storedFiles", JSON.stringify(storedFiles));
    renderFile(fileObj);
  }
});

// Read File to Base64
function readFile(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Render file card
function renderFile(file) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h3>${file.name}</h3>
    <button onclick="previewFile('${file.dataURL}', '${file.type}')">Preview</button>
    <button onclick="extractText('${file.dataURL}', '${file.type}')">Extract Text</button>
    <button onclick="downloadFile('${file.dataURL}', '${file.name}')">Download</button>
    <button class="delete" onclick="deleteFile('${file.name}')">Delete</button>
  `;
  fileList.appendChild(card);
}

// Preview PDF or Image
function previewFile(dataURL, type) {
  const win = window.open();
  win.document.write(`<iframe src="${dataURL}" width="100%" height="100%"></iframe>`);
}

// Extract Text (PDF or Image with progress)
function extractText(dataURL, type) {
  showProgressBar();

  if (type === "application/pdf") {
    pdfjsLib.getDocument({ url: dataURL }).promise.then(async (pdf) => {
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
        updateProgressBar(Math.round((i / pdf.numPages) * 100));
      }
      showEditor(text);
      hideProgressBar();
    });
  } else if (type.startsWith("image/")) {
    Tesseract.recognize(dataURL, 'eng', {
      logger: m => {
        if (m.status === "recognizing text") {
          updateProgressBar(Math.round(m.progress * 100));
        }
      }
    }).then(({ data: { text } }) => {
      showEditor(text);
      hideProgressBar();
    });
  }
}

// Show editor
function showEditor(text) {
  currentText = text;
  textEditor.value = text;
  editorContainer.classList.remove("hidden");
}

// Download Word File
document.getElementById("downloadDocx").onclick = () => {
  const filenameInput = document.getElementById("fileNameInput").value.trim();
  const filename = filenameInput ? `${filenameInput}.doc` : "extracted.doc";

  const blob = new Blob([textEditor.value], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

// Download PDF File
document.getElementById("downloadPdf").onclick = async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const lines = textEditor.value.split("\n");
  let y = 10;

  lines.forEach((line) => {
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
    doc.text(line, 10, y);
    y += 10;
  });

  const filenameInput = document.getElementById("fileNameInput").value.trim();
  const filename = filenameInput ? `${filenameInput}.pdf` : "edited.pdf";

  doc.save(filename);
};

// Download Original File
function downloadFile(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  a.click();
}

// Delete File from Local Storage
function deleteFile(name) {
  storedFiles = storedFiles.filter(f => f.name !== name);
  localStorage.setItem("storedFiles", JSON.stringify(storedFiles));
  fileList.innerHTML = "";
  storedFiles.forEach(renderFile);
}

// Progress Bar Utilities
function showProgressBar() {
  document.getElementById("progressContainer").classList.remove("hidden");
  updateProgressBar(0);
}

function updateProgressBar(percent) {
  document.getElementById("progressBar").style.width = percent + "%";
}

function hideProgressBar() {
  updateProgressBar(100);
  setTimeout(() => {
    document.getElementById("progressContainer").classList.add("hidden");
    updateProgressBar(0);
  }, 500);
}
