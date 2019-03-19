"use strict";

/* jshint -W117 */

class Paint {
    constructor(parameter = {}) {
        console.log('PAINT.JS: create Paint object ...');
        this.eAudioStackTrigger = new Event('audioStackTrigger');
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext('2d');
        this.width = parameter.width;
        this.height = parameter.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (parameter.parent !== undefined) {
            this.parent = parameter.parent;
            this.parent.appendChild(this.canvas);
        }

        this.audioStack = [];
        this.audioStackTrigger = false;
        this.audioStackChunksize = 5;
        this.audioStackCnt = 0;
        
        this.drawChanges = true;
        this.show = true;
        
        if (parameter.gradient !== undefined){
            this.gradient = {};
            this.initGradient();
        }
        
        if (parameter.shadowCanvas) {
            // console.log("PAINT.JS: init shadow canvas");
            // this.shadowCanvas1 = new Paint({
            //     'width': this.width,
            //     'height': this.height
            // });
            // this.shadowCanvas2 = new Paint({
            //     'width': this.width,
            //     'height': this.height
            // });
        }
        
        if (parameter.hot !== undefined){
            console.log('PAINT.JS: use hot', parameter.hot);
            this.hot = parameter.hot;
        }
        
        this.colcount = 0; // needed for drawing spectogram
        this.sgBarwidth = 1; // needed for drawing spectogram
        
        this.x = 0;
        this.y = 0;
        
        // this.lastCalledTimeVU = 0;
        // this.fpsVU = 0;
        // let drawVUChanges = true;
        // const elCbVU = document.getElementById("checkVU");
    }
    
    // initShadowCanvas() {
    //     this.shadowCanvas = document.createElement("canvas");
    //     this.shadowContext = this.shadowCanvas.getContext("2d");
    //     this.shadowCanvas.width = this.width;
    //     this.shadowCanvas.height = this.height;
    // }

    initGradient() {
        this.gradient = this.context.createLinearGradient(0,0,0,300);
        this.gradient.addColorStop(1,'#000000');
        this.gradient.addColorStop(0.75,'#ff0000');
        this.gradient.addColorStop(0.25,'#ffff00');
        this.gradient.addColorStop(0,'#ffffff');
    }

    clearCanvas(x=0, y=0, width=0, height=0){
        this.context.clearRect(x, y, width, height);
    }

    enableDrawChanges(){
        this.drawChanges = true;
    }

    disableDrawChanges(){
        this.drawChanges = false;
    }

    enableShow(){
        this.show = true;
    }

    disableShow(){
        this.show = false;
    }

    drawVu(parameter = {}) {
        this.context.fillStyle = this.gradient;
        this.context.fillRect(
            parameter.left.x, 
            parameter.left.y, 
            parameter.channelwidth, 
            this.height * parameter.left.average / 100
            );
        this.context.fillRect(
            parameter.right.x + parameter.channelwidth, 
            parameter.right.y, 
            parameter.channelwidth, 
            this.height * parameter.right.average / 100
            );
        // outline vu's
        this.context.rect(
            this.x, 
            this.y, 
            parameter.channelwidth, 
            this.height
            );
        this.context.rect(
            this.x + parameter.channelwidth, 
            this.y, 
            parameter.channelwidth, 
            this.height
            );

        this.context.stroke();
    }
    
    drawSpectrum(array) {
        this.context.fillStyle = this.gradient;
        for ( var i = 0; i < (array.length); i++ ){
            var value = array[i];
            this.context.fillRect(i*5,325-value,3,325);
        }
    }

    incColCount() {
        this.colcount++;
        // console.log('PAINT.JS: ColCount', this.colcount);
    }

    copy2shadow() {
        // this.shadowCanvas1 --> this.shadowCanvas2
        this.shadowCanvas2.context.drawImage(
            this.shadowCanvas1.canvas, 
            0 + this.shadowCanvas1.colcount, 
            0, 
            this.shadowCanvas1.colcount + this.sgBarwidth, 
            this.height, 
            0 + this.shadowCanvas1.colcount, 
            0, 
            this.shadowCanvas1.colcount + this.sgBarwidth, 
            this.height
            );
        }

    copy2shadow2() {
        // ORIGINAL
        // this.shadowCanvas1 --> this.shadowCanvas2
        this.shadowCanvas2.context.drawImage(
            this.shadowCanvas1.canvas, 
            this.width - (this.shadowCanvas1.colcount + this.sgBarwidth), 
            0, 
            this.shadowCanvas1.colcount + this.sgBarwidth, 
            this.height, 
            this.width - (this.shadowCanvas1.colcount + this.sgBarwidth), 
            0, 
            this.shadowCanvas1.colcount + this.sgBarwidth, 
            this.height
            );
        }
        
    copy2canvas() {
        // this.shadowCanvas2 --> this.shadowCanvas1
        // draw the copied image (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
        const image = this.shadowCanvas2.canvas;
        const sx = 0 + this.shadowCanvas1.colcount; // 0
        const sy = 0; // 0
        const sWidth = this.shadowCanvas1.colcount + this.sgBarwidth; // widthSG-(colCount+1);
        const sHeight = this.height;
        const dx = 0 + this.shadowCanvas1.colcount;
        const dy = 0;
        const dWidth = this.shadowCanvas1.colcount + this.sgBarwidth;
        const dHeight = this.height;
        this.shadowCanvas1.context.drawImage(
            image, 
            sx, 
            sy, 
            sWidth, 
            sHeight, 
            dx, 
            dy, 
            dWidth, 
            dHeight
            );
    }
        
    copy2canvas2() {
        // ORIGINAL
        // this.shadowCanvas2 --> this.shadowCanvas1
        // draw the copied image (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
        const image = this.shadowCanvas2.canvas;
        const sx = this.width - (this.shadowCanvas1.colcount + this.sgBarwidth); // 0
        const sy = 0; // 0
        const sWidth = this.shadowCanvas1.colcount + this.sgBarwidth; // widthSG-(colCount+1);
        const sHeight = this.height;
        const dx = this.width - (this.shadowCanvas1.colcount + this.sgBarwidth);
        const dy = 0;
        const dWidth = this.shadowCanvas1.colcount + this.sgBarwidth;
        const dHeight = this.height;
        this.shadowCanvas1.context.drawImage(
            image, 
            sx, 
            sy, 
            sWidth, 
            sHeight, 
            dx, 
            dy, 
            dWidth, 
            dHeight
            );
    }

    pushAudioStack(array) {
        if (this.audioStackCnt <= this.width) {
            this.audioStack.push(array);
            this.audioStackCnt++;
            console.log('PAINT.JS: pushAudioStack()', this.audioStackCnt, this.audioStack.length);
            if (this.audioStack.length >  0 && this.audioStack.length % this.audioStackChunksize === 0) {
                window.dispatchEvent(this.eAudioStackTrigger);
            }
        } else {
            // console.log('supress pushAudioStack', this.audioStackCnt, array);
        }
    }

    orderSpectogramPaint() {
        const length = this.audioStack.length;
        console.log('PAINT.JS: orderSpectogramPaint', length);
        let i = (length < this.audioStackChunksize) ? length : this.audioStackChunksize;
        while(i > 0){
            i--;
            this.drawSpectrogramCol(this.audioStack.shift());
        }
        this.audioStackTrigger = true;
    }

    setTrigger2False() {
        this.audioStackTrigger = false;
    }

    getAudioStackLength() {
        return this.audioStack.length;
    }

    getAudioStackChunksize() {
        return this.audioStackChunksize;
    }

    // drawFullSpectrogram(array) {
    drawSpectrogramCol(array) {
        // console.log('PAINT.JS: drawSpectrogramCol', this.colcount,array);
        // console.log('PAINT.JS: drawSpectrogramCol', this.colcount);
        // copy the current canvas onto the temp canvas
        // this.copy2shadow();
        // const x = (this.shadowCanvas1.colcount < this.width) ? this.shadowCanvas1.colcount : this.width - 1;
        const x = (this.colcount < this.width) ? this.colcount : this.width - 1;

        // iterate over the (512) elements from the array (512 = analyserNode4.fftSize / 2)
        for (let i = 0; i < array.length; i++) {
            // draw each pixel with the specific color
            let value = array[i];
            // this.shadowCanvas1.context.fillStyle = "#FF0000";
            this.context.fillStyle = this.hot.getColor(value).hex();
            

            // draw the 'line' at the right side (799) of the canvas pixel by pixel bottom to top (512 -> 0)
            this.context.fillRect(
                x, 
                this.height - i, 
                this.sgBarwidth, 
                1
                );
        }
        this.context.beginPath();
        this.context.fillStyle = 'blue';
        this.context.fillRect(50,100,50,50);

        // set translate on the canvas
        // this.shadowCanvas1.context.translate(-1, 0);

        // copy shadow canvas back
        // this.copy2canvas();

        // reset the transformation matrix
        // 1 to Horizontal scaling, 1 to Vertical scaling
        // this.shadowCanvas1.context.setTransform(1, 0, 0, 1, 0, 0);
        // if (this.colcount < this.width) {
            this.incColCount();
        // }
    }
    drawSpectrogramCol2(array) {
        // copy the current canvas onto the temp canvas
        // this.copy2shadow();
        // const x = (this.shadowCanvas1.colcount < this.width) ? this.shadowCanvas1.colcount : this.width - 1;
        const x = (this.shadowCanvas1.colcount < this.width) ? this.shadowCanvas1.colcount : this.width - 1;

        // iterate over the (512) elements from the array (512 = analyserNode4.fftSize / 2)
        for (let i = 0; i < array.length; i++) {
            // draw each pixel with the specific color
            let value = array[i];
            // this.shadowCanvas1.context.fillStyle = "#FF0000";
            this.shadowCanvas1.context.fillStyle = this.hot.getColor(value).hex();
            

            // draw the 'line' at the right side (799) of the canvas pixel by pixel bottom to top (512 -> 0)
            this.shadowCanvas1.context.fillRect(
                x, 
                this.height - i, 
                this.sgBarwidth, 
                1
                );
        }
        this.shadowCanvas1.context.beginPath();
        this.shadowCanvas1.context.fillStyle = 'blue';
        this.shadowCanvas1.context.fillRect(50,100,50,50);

        // set translate on the canvas
        // this.shadowCanvas1.context.translate(-1, 0);

        // copy shadow canvas back
        // this.copy2canvas();

        // reset the transformation matrix
        // 1 to Horizontal scaling, 1 to Vertical scaling
        // this.shadowCanvas1.context.setTransform(1, 0, 0, 1, 0, 0);
        this.shadowCanvas1.incColCount();
    }

    drawFullSpectrogram2(array) {
        // ORIGINAL
        // copy the current canvas onto the temp canvas
        this.copy2shadow2();

        // iterate over the (512) elements from the array (512 = analyserNode4.fftSize / 2)
        for (let i = 0; i < array.length; i++) {
            // draw each pixel with the specific color
            let value = array[i];
            this.shadowCanvas1.context.fillStyle = "#FF0000";
            this.shadowCanvas1.context.fillStyle = this.hot.getColor(value).hex();
            
            // draw the 'line' at the right side (799) of the canvas pixel by pixel bottom to top (512 -> 0)
            this.shadowCanvas1.context.fillRect(
                800 - this.sgBarwidth, 
                this.height - i, 
                this.sgBarwidth, 
                1
                );
        }

        // set translate on the canvas
        this.shadowCanvas1.context.translate(-1, 0);

        // copy shadow canvas back
        this.copy2canvas2();

        // reset the transformation matrix
        // 1 to Horizontal scaling, 1 to Vertical scaling
        this.shadowCanvas1.context.setTransform(1, 0, 0, 1, 0, 0);
        this.shadowCanvas1.incColCount();
    }
    
    copySpectogram() {
        this.context.drawImage(this.shadowCanvas1.canvas, 0, 0);
        // const from = this.colcount;
        // const to = this.shadowCanvas1.colcount;
        // if (to > 0) {

        //     console.log('copy spectogram', from, to);
        //     // this.shadowCanvas1 --> this.canvas
        //     // draw the copied image (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
        //     const image = this.shadowCanvas1.canvas;
        //     const sx = from; // 0
        //     const sy = 0; // 0
        //     const sWidth = to - from; // widthSG-(colCount+1);
        //     const sHeight = this.height;
        //     const dx = from;
        //     const dy = 0;
        //     const dWidth = to - from;
        //     const dHeight = this.height;
        //     console.log('...copy settings (sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight): ', sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        //     this.context.drawImage(
        //         image, 
        //         sx, 
        //         sy, 
        //         sWidth, 
        //         sHeight, 
        //         dx, 
        //         dy, 
        //         dWidth, 
        //         dHeight
        //         );
            
        //     this.colcount = to;
            
        // }
        this.context.beginPath();
        this.context.fillStyle = 'red';
        this.context.fillRect(50,50,50,50);


    }
}
