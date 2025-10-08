// Elemente DOM
const selectBtn = document.getElementById("selectFilesBtn");
const fileInput = document.getElementById("txtFiles");
const fileNamesSpan = document.getElementById("fileNames");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");

// File select
selectBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files).map(f => f.name);
  fileNamesSpan.textContent = files.length ? files.join(", ") : "Niciun fișier selectat";
});

// Parsează fișier TXT într-un obiect config
function parseTxt(txtContent) {
  const data = {};
  let currentKey = null;
  let currentLines = [];

  txtContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith("[") && line.endsWith("]")) {
      if (currentKey) data[currentKey] = currentLines.join("\n");
      currentKey = line.slice(1, -1);
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  });

  if (currentKey) data[currentKey] = currentLines.join("\n");
  return data;
}

// Generare prezentare PPTX
function generatePptx(settings, config) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'custom', width: settings.slide.width, height: settings.slide.height });
  pptx.layout = 'custom';

  const fontColor = settings.text.color;
  const bgColor = settings.slide.color;
  const margin = settings.slide.margin;

  const order = config["order"] ? config["order"].split(",") : [];
  if (!order.length) order.push("default");

  const slides = [];

  // Creăm slide-urile conform order
  order.forEach(key => {
    const text = config[key] || "";
    const isRefren = key.startsWith("r");

    const slide = pptx.addSlide();
    slide.background = { fill: bgColor };

    // Text principal (versuri)
    slide.addText(text, {
      x: margin,
      y: margin,
      w: settings.slide.width - margin * 2,
      h: settings.slide.height - margin * 2,
      fontSize: settings.text.size,
      fontFace: settings.text.font,
      color: fontColor,
      valign: 'middle',
      align: 'center',
      lineSpacing: settings.text.spacing,
      italic: isRefren && settings.refren_italic
    });

    slides.push(slide);
  });

  // Gama: primul slide
  if (config.g && slides.length > 0) {
    slides[0].addText(config.g, {
      x: margin,
      y: 0,                  // sus
      w: 2,                   // box mic
      h: margin,              // înălțime mică
      fontSize: settings.text.gama_font,
      fontFace: settings.text.font,
      color: fontColor,
      align: 'left',
      valign: 'bottom'        // lipit de partea de jos a textbox-ului mic
    });
  }

  // Amin: ultimul slide
  if (slides.length > 0) {
    const lastSlide = slides[slides.length - 1];
    lastSlide.addText("Amin", {
      x: settings.slide.width - margin - 2, // colț dreapta
      y: settings.slide.height - margin,    // jos
      w: 2,                                 // box mic
      h: margin,                             // înălțime mică
      fontSize: settings.text.amin_font,
      fontFace: settings.text.font,
      color: fontColor,
      align: 'right',
      valign: 'top'                          // lipit de partea de sus a textbox-ului
    });
  }

  return pptx;
}

// Generate + ZIP
generateBtn.addEventListener("click", async () => {
  downloadBtn.style.display = "none";

  const txtFiles = fileInput.files;
  if (!txtFiles.length) return alert("Încarcă fișierele TXT!");

  const settings = {
    slide: {
      width: parseFloat(document.getElementById("slideWidth").value),
      height: parseFloat(document.getElementById("slideHeight").value),
      margin: parseFloat(document.getElementById("slideMargin").value),
      color: document.getElementById("slideColor").value
    },
    text: {
      font: document.getElementById("textFont").value,
      size: parseInt(document.getElementById("textSize").value),
      color: document.getElementById("textColor").value,
      amin_font: parseInt(document.getElementById("aminFont").value),
      gama_font: parseInt(document.getElementById("gamaFont").value),
      spacing: parseInt(document.getElementById("lineSpacing").value)
    },
    refren_italic: document.getElementById("refrenItalic").checked
  };

  const zip = new JSZip();

  for (let file of txtFiles) {
    const txtContent = await file.text();
    const config = parseTxt(txtContent);
    const pptx = generatePptx(settings, config);

    const pptxBlob = await pptx.write("blob");
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    zip.file(baseName + ".pptx", pptxBlob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);

  downloadBtn.href = url;
  downloadBtn.download = "prezentari.zip";
  downloadBtn.style.display = "inline-block";
});
