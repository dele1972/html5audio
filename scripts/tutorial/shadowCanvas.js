"use strict";

/* jshint -W117 */

class shadowCanvas {
    constructor(height=512) {
        this.store = [];
        this.lastElement = 0;
        this.actualElement = 0;
        this.globalHeight = height;
        this.gradient = new myChromaFake();
    }

    addElement(pArray){
        let myObject = {};
        myObject.parValues = pArray;
        myObject.canvas = document.createElement("canvas");
        myObject.context = myObject.canvas.getContext("2d");
        myObject.canvas.width=1;
        myObject.canvas.height=this.globalHeight;
        for (var i = 0; i < pArray.length; i++) {
            // draw each pixel with the specific color
            const value = pArray[i];
            myObject.context.fillStyle = "#FF0000";
            myObject.context.fillStyle = hot.getColor(value).hex();
    
            // draw the 'line' at the right side (799) of the canvas pixel by pixel bottom to top (512 -> 0)
            // ctxSG.fillRect(800 - 1, 512 - i, 1, 1);
            myObject.context.fillRect(0, this.globalHeight - i, 1, 1);
        }
        this.store.push(myObject);
        this.lastElement++;
    }
}
