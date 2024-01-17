const socket=io();


// Define the types for your variables
type Tool = "brush" | "eraser" | "rectangle" | "circle" | "triangle";

// HTML Elements
const canvas = document.querySelector("canvas") as HTMLCanvasElement,
  toolBtns = document.querySelectorAll(".tool") as NodeListOf<HTMLLIElement>,
  fillColor = document.querySelector("#fill-color") as HTMLInputElement,
  sizeSlider = document.querySelector("#size-slider") as HTMLInputElement,
  colorBtns = document.querySelectorAll(".colors .option") as NodeListOf<HTMLLIElement>,
  colorPicker = document.querySelector("#color-picker") as HTMLInputElement,
  clearCanvas = document.querySelector(".clear-canvas") as HTMLButtonElement,
  saveImg = document.querySelector(".save-image") as HTMLButtonElement,
  ctx: CanvasRenderingContext2D | null = canvas?.getContext("2d");

// Global variables with default value
let prevMouseX: number,
  prevMouseY: number,
  snapshot: ImageData,
  isDrawing = false,
  selectedTool: Tool = "brush",
  brushWidth = 1,
  selectedColor = "#000";


//emit function to emit the drawing data to the server
const emitDrawingData = (data: unknown) => {
  // Include the previous mouse position in the emitted data
  data = { ...data, prevX: prevMouseX, prevY: prevMouseY };
  socket.emit('drawing', data);

  // Update prevMouseX and prevMouseY for the next drawing segment
  prevMouseX = data.x;
  prevMouseY = data.y;
};

const emitShapesData = (data) => {
  socket.emit('drawing', data);
  console.log("drawing data:",data)
};


  
const setCanvasBackground = () => {
  // Setting whole canvas background to white, so the download img background will be white
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedColor; // Setting fillstyle back to the selectedColor, it'll be the brush color
};

window.addEventListener("load", () => {
  // Setting canvas width/height..offsetWidth/height returns viewable width/height of an element
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  setCanvasBackground();
});

const drawRect = (e) => {
  const rectData = {
    fillColor: fillColor.checked,
    color: selectedColor,
    type: selectedTool,
    width: brushWidth,
    x: e.offsetX,
    y: e.offsetY,
    prevX: prevMouseX,
    prevY: prevMouseY,
  };


  if (!fillColor.checked) {
    ctx.strokeRect(rectData.x, rectData.y, rectData.prevX-rectData.x, rectData.prevY - rectData.y);
  } else {
    ctx.fillRect(rectData.x, rectData.y, rectData.prevX-rectData.x, rectData.prevY - rectData.y);
  }
};


const drawCircle = (e: MouseEvent) => {
  ctx.beginPath(); // Creating a new path to draw a circle
  // Getting radius for the circle according to the mouse pointer
  let radius = Math.sqrt(Math.pow(prevMouseX - e.offsetX, 2) + Math.pow(prevMouseY - e.offsetY, 2));
  ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI);
  if (fillColor.checked) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
};

const drawTriangle = (e: MouseEvent) => {
  ctx.beginPath(); // Creating a new path to draw a triangle
  ctx.moveTo(prevMouseX, prevMouseY); // Moving triangle to the mouse pointer
  ctx.lineTo(e.offsetX, e.offsetY); // Creating the first line according to the mouse pointer
  ctx.lineTo(prevMouseX * 2 - e.offsetX, e.offsetY); // Creating the bottom line of the triangle
  ctx.closePath(); // Closing the path of a triangle so the third line draws automatically
  if (fillColor.checked) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
};

const startDraw = (e: MouseEvent) => {
  isDrawing = true;
  prevMouseX = e.offsetX; // Passing current mouseX position as prevMouseX value
  prevMouseY = e.offsetY; // Passing current mouseY position as prevMouseY value
  ctx.beginPath(); // Creating a new path to draw
  ctx.lineWidth = brushWidth; // Passing brushSize as line width
  ctx.strokeStyle = selectedColor; // Passing selected color as stroke style
  ctx.fillStyle = selectedColor; // Passing selected color as fill style
  // Copying canvas data & passing as snapshot value..this avoids dragging the image
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
};

const drawing = (e: MouseEvent) => {
  if (!isDrawing) return;

  ctx.putImageData(snapshot, 0, 0);

  if (selectedTool === "brush" || selectedTool === "eraser") {
    ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();

    emitDrawingData({
      type: selectedTool,
      x: e.offsetX,
      y: e.offsetY,
      color: selectedColor,
      width: brushWidth,
    });
  } else if (selectedTool === "rectangle") {
    drawRect(e);
  } else if (selectedTool === "circle") {
    drawCircle(e);
  } else {
    drawTriangle(e);
  }
};

toolBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Adding click event to all tool options
    // Removing the active class from the previous option and adding it to the current clicked option
    document.querySelector(".options .active")?.classList.remove("active");
    btn.classList.add("active");
    selectedTool = btn.id as Tool; // Using "as Tool" to satisfy the type checker

    // If the selected tool is the eraser, set the brush color to white
    if (selectedTool === "eraser") {
      selectedColor = "#fff";
    }

    console.log(selectedTool);
  });
});

sizeSlider.addEventListener("change", () => (brushWidth = parseInt(sizeSlider.value))); // Passing slider value as brush size

colorBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Adding click event to all color button
    // Removing the active class from the previous option and adding it to the current clicked option
    document.querySelector(".options .selected")?.classList.remove("selected");
    btn.classList.add("selected");
    selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color");
  });
});

colorPicker.addEventListener("change", () => {
  // Passing picked color value from the color picker to the last color button background
  colorPicker.parentElement.style.background = colorPicker.value;
  colorPicker.parentElement.click();
});

clearCanvas.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clearing the whole canvas
  socket.emit("Clear-canvas");
  setCanvasBackground();
});

saveImg.addEventListener("click", () => {
  const link = document.createElement("a"); // Creating <a> element
  link.download = `${Date.now()}.jpg`; // Passing the current date as the link download value
  link.href = canvas.toDataURL(); // Passing canvasData as the link href value
  link.click(); // Clicking the link to download the image
});


//Code for the client to receive data that is being sent from server
socket.on('drawing', (data) => {
  if (data.type === 'brush' || data.type === 'eraser') {
    // Ensure that the context is available
    if (ctx) {
      // Apply the received drawing data
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.fillStyle = data.color;
      ctx.lineWidth = data.width;

      // Draw a curve between the previous and current points
      ctx.moveTo(data.prevX, data.prevY);
      ctx.quadraticCurveTo(data.prevX, data.prevY, (data.prevX + data.x) / 2, (data.prevY + data.y) / 2);
      ctx.lineTo(data.x, data.y);

      // Draw the line
      ctx.stroke();
    }
    console.log('Received drawing data:', data);
  } else if (data.type === 'rectangle') {
    if (ctx) {
      // Apply the received drawing data
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.fillStyle = data.color;
      ctx.lineWidth = data.width;

      if (!data.fillColor) {
        ctx.strokeRect(data.x, data.y, data.prevX - data.x, data.prevY - data.y);
      } else {
        ctx.fillRect(data.x, data.y, data.prevX - data.x, data.prevY - data.y);
      }
    }
    console.log('Received drawing data:', data);
  }else if(data.type==='circle'){
    if (ctx) {
      // Apply the received drawing data
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.fillStyle = data.color;
      ctx.lineWidth = data.width;
      let radius:number=data.radius;
      ctx.arc(data.prevX, data.prevY, radius, 0, 2 * Math.PI);
      if (data.fillColor) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  } else if (data.type==="triangle") {
    if (ctx) {
      // Apply the received drawing data
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.fillStyle = data.color;
      ctx.lineWidth = data.width;
      ctx.moveTo(data.prevX,data.prevY); // Moving triangle to the mouse pointer
      ctx.lineTo(data.x,data.y); // Creating the first line according to the mouse pointer
      ctx.lineTo(data.prevX * 2 - data.x, data.y); // Creating the bottom line of the triangle
      ctx.closePath(); // Closing the path of a triangle so the third line draws automatically
      if (data.fillColor) {
      ctx.fill();
      } else {
      ctx.stroke();
      }
    }
  }
});




socket.on('Clear-canvas',()=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);
  setCanvasBackground();
});


canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", (e) => {
  isDrawing = false;

  // Emit drawing data for rectangles only when the mouse button is released
  if (selectedTool === "rectangle") {
    emitShapesData({
      fillColor: fillColor.checked,
      color: selectedColor,
      type: selectedTool,
      width: brushWidth,
      x: e.offsetX,
      y:e.offsetY,
      prevX: prevMouseX,
      prevY: prevMouseY,
    });
  }
  else if(selectedTool=="circle"){
    emitShapesData({
      fillColor: fillColor.checked,
      color: selectedColor,
      type: selectedTool,
      width: brushWidth,
      x: e.offsetX,
      y:e.offsetY,
      prevX: prevMouseX,
      prevY: prevMouseY,
      radius:Math.sqrt(Math.pow(prevMouseX - e.offsetX, 2) + Math.pow(prevMouseY - e.offsetY, 2))
    })
  }
  else if(selectedTool=="triangle"){
    emitShapesData({
      fillColor: fillColor.checked,
      color: selectedColor,
      type: selectedTool,
      width: brushWidth,
      x: e.offsetX,
      y:e.offsetY,
      prevX: prevMouseX,
      prevY: prevMouseY,
    })
  }
});
