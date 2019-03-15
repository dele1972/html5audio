"use strict";

class myChromaFake {
    constructor() {
        this.tempCanvas = document.createElement("canvas"),
        this.tempCtx = this.tempCanvas.getContext("2d");
        this.tempCanvas.width=1;
        this.tempCanvas.height=512;
        // this.tempCanvas.style.backgroundColor = 'transparent';
        this.gradient = this.tempCtx.createLinearGradient(0,0,0,this.tempCanvas.height);
        this.gradient.addColorStop(1,'#000000');
        // this.gradient.addColorStop(0,'transparent');
        this.gradient.addColorStop(0.75,'#ff0000');
        this.gradient.addColorStop(0.25,'#ffff00');
        this.gradient.addColorStop(0,'#ffffff');
        this.pixeldata = [];
        this.hexValue = "000000";
        this.tempCtx.fillStyle=this.gradient;
        this.tempCtx.fillRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    }

    getColor(value){
        this.pixelData = this.tempCtx.getImageData(0, value, 1, 1).data;
        this.hex();
        return this;
    }
    
    hex() {
        this.hexValue = "#" + ("000000" + this.rgbToHex(this.pixelData[0], this.pixelData[1], this.pixelData[2])).slice(-6);
        return this.hexValue;
    }

    rgbToHex(r, g, b) {
        if (r > 255 || g > 255 || b > 255)
            throw "Invalid color component";
        return ((r << 16) | (g << 8) | b).toString(16);
    }
}
