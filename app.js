document.getElementById("generateBtn").addEventListener("click", async () => {
  const downloadBtn = document.getElementById("downloadBtn");

  // Ascunde butonul la fiecare click
  downloadBtn.style.display = "none";

  const txtFiles = document.getElementById("txtFiles").files;
  if (!txtFiles.length) {
    alert("Încarcă fișierele TXT!");
    return;
  }

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

  // Afișează din nou butonul download după generare
  downloadBtn.style.display = "block";
  downloadBtn.onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "prezentari.zip";
    a.click();
  };
});

// Funcție pentru parsarea TXT-ului
function parseTxt(text) {
  const data = {};
  let currentKey = null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      currentKey = trimmed.slice(1, -1);
      data[currentKey] = "";
    } else if (currentKey) {
      data[currentKey] += (data[currentKey] ? "\n" : "") + line;
    }
  }
  return data;
}

// Funcție pentru generare PPTX
function generatePptx(settings, config) {
  const pptx = new PptxGenJS();

  pptx.defineLayout({ name: "CUSTOM", width: settings.slide.width, height: settings.slide.height });
  pptx.layout = "CUSTOM";

  let orderKeys = [];
  if (config.order) orderKeys = config.order.split(",").map(k => k.trim()).filter(Boolean);
  orderKeys = orderKeys.filter(k => k !== "order" && k !== "g");

  for (let key of orderKeys) {
    if (!config[key]) continue;
    const isRefren = key.startsWith("r");
    const slide = pptx.addSlide();
    slide.background = { color: settings.slide.color };
    slide.addText(config[key], {
      x: settings.slide.margin,
      y: settings.slide.margin,
      w: settings.slide.width - 2 * settings.slide.margin,
      h: settings.slide.height - 2 * settings.slide.margin,
      fontSize: settings.text.size,
      fontFace: settings.text.font,
      color: settings.text.color,
      align: "center",
      valign: "middle",
      lineSpacing: settings.text.spacing,
      italic: isRefren && settings.refren_italic
    });
  }

  const amin_width = 2;

  // Adaugare gama (sus pe primul slide)
  if (config.g) {
    if (pptx.slides.length === 0) pptx.addSlide().background = { color: settings.slide.color };
    pptx.slides[0].addText(config.g, {
      x: settings.slide.margin,
      y: 0,
      w: amin_width,
      h: settings.slide.margin,
      fontSize: settings.text.gama_font,
      fontFace: settings.text.font,
      color: settings.text.color,
      align: "left",
      valign: "bottom"
    });
  }

  // Adaugare Amin pe ultimul slide
  if (pptx.slides.length === 0) pptx.addSlide().background = { color: settings.slide.color };
  const lastSlide = pptx.slides[pptx.slides.length - 1];
  lastSlide.addText("Amin", {
    x: settings.slide.width - settings.slide.margin - amin_width,
    y: settings.slide.height - settings.slide.margin,
    w: amin_width,
    h: settings.slide.margin,
    fontSize: settings.text.amin_font,
    fontFace: settings.text.font,
    color: settings.text.color,
    align: "right",
    valign: "top"
  });

  return pptx;
}
