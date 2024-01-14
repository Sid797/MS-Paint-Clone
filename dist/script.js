"use strict";
const socket = io();
// HTML Elements
const canvas = document.querySelector("canvas"), toolBtns = document.querySelectorAll(".tool"), fillColor = document.querySelector("#fill-color"), sizeSlider = document.querySelector("#size-slider"), colorBtns = document.querySelectorAll(".colors .option"), colorPicker = document.querySelector("#color-picker"), clearCanvas = document.querySelector(".clear-canvas"), saveImg = document.querySelector(".save-image"), ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext("2d");
// Global variables with default value
let prevMouseX, prevMouseY, snapshot, isDrawing = false, selectedTool = "brush", brushWidth = 1, selectedColor = "#000";
//emit function to emit the drawing data to the server
const emitDrawingData = (data) => {
    // Include the previous mouse position in the emitted data
    data = Object.assign(Object.assign({}, data), { prevX: prevMouseX, prevY: prevMouseY });
    socket.emit('drawing', data);
    // Update prevMouseX and prevMouseY for the next drawing segment
    prevMouseX = data.x;
    prevMouseY = data.y;
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
    // If fill color isn't checked, draw a rect with a border, else draw rect with background
    if (!fillColor.checked) {
        return ctx.strokeRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
    }
    ctx.fillRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
};
const drawCircle = (e) => {
    ctx.beginPath(); // Creating a new path to draw a circle
    // Getting radius for the circle according to the mouse pointer
    let radius = Math.sqrt(Math.pow(prevMouseX - e.offsetX, 2) + Math.pow(prevMouseY - e.offsetY, 2));
    ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI);
    if (fillColor.checked) {
        ctx.fill();
    }
    else {
        ctx.stroke();
    }
};
const drawTriangle = (e) => {
    ctx.beginPath(); // Creating a new path to draw a triangle
    ctx.moveTo(prevMouseX, prevMouseY); // Moving triangle to the mouse pointer
    ctx.lineTo(e.offsetX, e.offsetY); // Creating the first line according to the mouse pointer
    ctx.lineTo(prevMouseX * 2 - e.offsetX, e.offsetY); // Creating the bottom line of the triangle
    ctx.closePath(); // Closing the path of a triangle so the third line draws automatically
    if (fillColor.checked) {
        ctx.fill();
    }
    else {
        ctx.stroke();
    }
};
const startDraw = (e) => {
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
const drawing = (e) => {
    if (!isDrawing)
        return; // If isDrawing is false return from here
    ctx.putImageData(snapshot, 0, 0); // Adding copied canvas data on this canvas
    if (selectedTool === "brush" || selectedTool === "eraser") {
        // If the selected tool is eraser then set strokeStyle to white
        // paint color on the existing canvas else set the stroke color to selected color
        ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
        ctx.lineTo(e.offsetX, e.offsetY); // Creating a line according to the mouse pointer
        ctx.stroke(); // Drawing/filling line with color
        emitDrawingData({
            type: selectedTool,
            x: e.offsetX,
            y: e.offsetY,
            color: selectedColor,
            width: brushWidth,
        });
    }
    else if (selectedTool === "rectangle") {
        drawRect(e);
    }
    else if (selectedTool === "circle") {
        drawCircle(e);
    }
    else {
        drawTriangle(e);
    }
};
toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        var _a;
        // Adding click event to all tool options
        // Removing the active class from the previous option and adding it to the current clicked option
        (_a = document.querySelector(".options .active")) === null || _a === void 0 ? void 0 : _a.classList.remove("active");
        btn.classList.add("active");
        selectedTool = btn.id; // Using "as Tool" to satisfy the type checker
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
        var _a;
        // Adding click event to all color button
        // Removing the active class from the previous option and adding it to the current clicked option
        (_a = document.querySelector(".options .selected")) === null || _a === void 0 ? void 0 : _a.classList.remove("selected");
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
            // Save the current canvas state
            ctx.save();
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
            // Restore the canvas state
            ctx.restore();
        }
        console.log('Received drawing data:', data);
    }
});
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", () => (isDrawing = false));
