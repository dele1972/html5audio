"use strict";

/* jshint -W117 */

// Tutorial - Part 4

// @ToDo fix error: InvalidStateError: An attempt was made to use an object that is not, or is no longer, usable

// http://localhost/tutorial/part-3.html

// by Dennis Lederich, 24.01.2019

// based on DZone `Exploring the HTML5 Web Audio: Visualizing Sound´ by Jos Dirksen (23.10.2012)
// https://dzone.com/articles/exploring-html5-web-audio

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

const elPStatus = document.getElementById("status");
if (isIosDevice()){
    elPStatus.innerHTML = "<strong style='color:red'>Sorry, but the Web Audio API is not supported by your browser. Please, consider upgrading to the latest version or downloading Google Chrome or Mozilla Firefox</strong>";
    throw new Error("Sorry, but the Web Audio API is not supported by your browser!");
}

// (1) create the audio context
let AudioContext = window.AudioContext || window.webkitAudioContext; // Cross browser
let audioContext = new AudioContext();
// https://stackoverflow.com/a/21413520/6628517
// https://stackoverflow.com/questions/29373563/audiocontext-on-safari#29373891

let audioBuffer;
let sourceNode, 
    splitter2, 
    analyserNode2_1, analyserNode2_2, analyserNode3, analyserNode4, 
    javascriptNode2, javascriptNode3, javascriptNode4;
let soundSource = {};

// canvas context to draw the volume meter
let c = document.getElementById('myCanvas1');
let ctx = c.getContext('2d');
let width = 50;
let height = 130;
let lastCalledTimeVU, fpsVU;

// canvas context to draw the frequency spectrum
let cFS = document.getElementById('myCanvas2');
let ctxFS = cFS.getContext('2d');
let widthFS = 1000;
let heightFS = 325;
let lastCalledTimeFS, fpsFS;

// canvas context to draw the spectogram
let cSG = document.getElementById('myCanvas3');
let ctxSG = cSG.getContext('2d');
let widthSG = 800;
let heightSG = 512;
let lastCalledTimeSG, fpsSG;
// create a temp canvas we use for copying and scrolling
let tempCanvas = document.createElement("canvas"),
    tempCtx = tempCanvas.getContext("2d");
tempCanvas.width=800;
tempCanvas.height=512;
tempCanvas.style.backgroundColor = 'red';
let hot = new myChromaFake();

let drawVUChanges = true;

let gradient = ctx.createLinearGradient(0,0,0,300);
gradient.addColorStop(1,'#000000');
gradient.addColorStop(0.75,'#ff0000');
gradient.addColorStop(0.25,'#ffff00');
gradient.addColorStop(0,'#ffffff');

// chrome want to create an audionode by user interaction like click - but start playing a sound by ui seems to be minimum requirement
let playState = false;
let stopState = false;


let allVuData = [];
let allFSData = [];
let allSGData = [];

let fps = new myFPS();

const elSpinnerDiv = document.getElementById("spinner");
const elSpinnerText = document.getElementById("spinnerText");
const elBtnPlay = document.getElementById("btnPlay");
const elIconPlay = document.getElementById("iconPlay");

const elBtnReload = document.getElementById("btnReload");

const elCbVU = document.getElementById("checkVU");
const elCbFS = document.getElementById("checkFS");
const elCbSG = document.getElementById("checkSG");


// add a custom event, would be fired after sound is decoded and ready to play
// (https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events)
let eAudioReady = new Event('audioReady');
window.addEventListener('audioReady', onStart, false);

setupAudioNodes();

// load the sound
// AlagaesiaAndEragon.ogg, Tanner Helland, Creative Commons Attribution-ShareAlike 3.0 License
// https://www.tannerhelland.com/66/alagaesia-eragon-piano/
// loadSound("../files/AlagaesiaAndEragon.ogg");
loadSound("../files/wagner-short.ogg");

/**
 * onStart
 * will be called by custom event-listener 'audioReady' which will be emmitted by decodeSound()
 */
function onStart(){
    
    // disable spinner
    elSpinnerDiv.style.display = "none";

    // show Samplerate
    document.getElementById('samplerate').innerHTML = audioContext.sampleRate + " Hz";

    // enable play button
    removeCssClass(elBtnPlay, 'disabled');

    elPStatus.innerHTML = "Status: Sound is loaded and decoded - ready to play";
}

function setupAudioNodes() {
    
    /*   CREATE AUDIO NODES   */
    // sourceNode, splitter2, analyserNode2_, analyserNode3, javascriptNode2, javascriptNode3
    
        // create a buffer source node
        sourceNode = audioContext.createBufferSource();
        
        // A) setup a analyzer
        analyserNode2_1 = audioContext.createAnalyser();
        analyserNode2_1.smoothingTimeConstant = 0.3;
        analyserNode2_1.fftSize = 1024;
        
        // A) setup a 2nd analyzer (for each channel vu)
        analyserNode2_2 = audioContext.createAnalyser();
        analyserNode2_2.smoothingTimeConstant = 0.0;
        analyserNode2_2.fftSize = 1024;
        
        // B) setup a 3rd analyzer (for frequency spectrum)
        // We set the fftSize to 512. This means we get 256 bars that represent our frequency. 
        analyserNode3 = audioContext.createAnalyser();
        analyserNode3.smoothingTimeConstant = 0.3;
        analyserNode3.fftSize = 512;

        // `The analyser we create here has an fftSize of 1024, this means we get 512 frequency buckets
        // with strengths. So we can draw a spectrogram that has a height of 512 pixels. Also note 
        // that the smoothingTimeConstant is set to 0. 
        // This means we don't use any of the previous results in the analysis. We want to show the 
        // real information, not provide a smooth volume meter or frequency spectrum analysis.´
        analyserNode4 = audioContext.createAnalyser();
        analyserNode4.smoothingTimeConstant = 0;
        analyserNode4.fftSize = 1024;

        // A) split audio channel
        splitter2 = audioContext.createChannelSplitter();
        
        // II) setup a javascript node for VU
        // * https://developer.mozilla.org/de/docs/Web/API/ScriptProcessorNode
        javascriptNode2 = audioContext.createScriptProcessor(2048, 1, 1);

        // III) setup a 'javascriptnode' for frequency spectrum
        javascriptNode3 = audioContext.createScriptProcessor(2048, 1, 1);

        // IV) setup a 'javascriptnode' for spectogram
        javascriptNode4 = audioContext.createScriptProcessor(2048, 1, 1);
}

function connectNodes() {
        
    /*   CONNECT ALL NODES   */
    // I: sourceNode (soundfile) -> output
    // II:     |------------------> analyserNode2_1 -> javascriptNode2
    // II:     |------------------> analyserNode2_2
    // III     |------------------> analyserNode3   -> javascriptNode3
    // IV      |------------------> analyserNode4   -> javascriptNode4
        
        // A) connect the source to the analyser and the splitter
        sourceNode.connect(splitter2);
 
        // A) connect one of the outputs from the splitter to the analyser
        splitter2.connect(analyserNode2_1,0,0);
        splitter2.connect(analyserNode2_2,1,0);

        // B) connect the source to the analyser3
        sourceNode.connect(analyserNode3);

        // C) connect the source to the analyser4
        sourceNode.connect(analyserNode4);

        // A) we use the javascript node to draw at a specific interval.
        analyserNode2_1.connect(javascriptNode2);

        // B) we use the javascript node to draw at a specific interval.
        analyserNode3.connect(javascriptNode3);

        // C) we use the javascript node to draw at a specific interval.
        analyserNode4.connect(javascriptNode4);

        // A) connect to destination, else it isn't called
        javascriptNode2.connect(audioContext.destination);

        // B) connect to destination, else it isn't called
        javascriptNode3.connect(audioContext.destination);

        // C) connect to destination, else it isn't called
        javascriptNode4.connect(audioContext.destination);

        // and connect to destination, if you want audio
        sourceNode.connect(audioContext.destination);

}

/**
 * loadSound
 * loads specified sound via XHR, then send buffer to decodeSound()
 * @param {*} url 
 */
function loadSound(url) {
    // show spinner with loading info
    elSpinnerDiv.style.display = "block";
    elSpinnerText.innerHTML = "Loading Soundfile ...";

    // load binary data via XMLHttpRequest/XHR (https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest)
    let request = new XMLHttpRequest();
    // The response is a JavaScript ArrayBuffer containing binary data (https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType)
    request.responseType = 'arraybuffer';

    // When sound data is loaded, decode the data
    request.onload = () => { elSpinnerDiv.style.display = "none"; decodeSound(request.response); };

    // start the request
    request.open('GET', url, true);
    request.send();
}

function decodeSound(requestBuffer){
    elSpinnerDiv.style.display = "block";
    elSpinnerText.innerHTML = "Decoding Soundfile ...";
    // decode the data (https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Porting_webkitAudioContext_code_to_standards_based_AudioContext#Removal_of_the_synchronous_AudioContext.createBuffer_method
        audioContext.decodeAudioData(requestBuffer)
        .then(function(buffer) {
                // decode is finished, save buffer
                sourceNode.buffer = buffer;
                // document.getElementById('samplerate').innerHTML = audioContext.sampleRate + " Hz";
                // shout out that decoding is finished - someone will probably handle the data...
                window.dispatchEvent(eAudioReady);
                
                // elSpinnerDiv.style.display = "none";
            })
            .catch(onErrorCust);
}

// when the javascript node is called we use information from the analyzer node to draw the volume;
// Since the data is sampled at 44.1k, this function will be called approximately 21 times a second
javascriptNode2.onaudioprocess = function() {

    // if(drawVUChanges) {
    if(playState && elCbVU.checked) {

        // get the average for the first channel (bincount is fftsize / 2)
        var array =  new Uint8Array(analyserNode2_1.frequencyBinCount);
        analyserNode2_1.getByteFrequencyData(array);
        var average = getAverageVolume(array);
        // console.log("average (one channel)= ", average);
        
        // get the average for the second channel
        var array2 =  new Uint8Array(analyserNode2_2.frequencyBinCount);
        analyserNode2_2.getByteFrequencyData(array2);
        var average2 = getAverageVolume(array2);
        
        // clear the current state
        ctx.clearRect(0, 0, width, height);
    
        // set the fill style
        ctx.fillStyle=gradient;
    
        // create the meters
        // canvascontext.fillRect(x,y,width,height);
        const totalRectHeight = 130;
        const x = 0;
        const percentAverage1 = totalRectHeight * average / 100;
        const percentAverage2 = totalRectHeight * average2 / 100;
        const y1 = totalRectHeight-percentAverage1;
        const y2 = totalRectHeight-percentAverage2;
        const rectWidth = 25;
        const rectHeight1 = percentAverage1;
        const rectHeight2 = percentAverage2;
        ctx.fillRect(x, y1, rectWidth, rectHeight1);
        ctx.fillRect(x + rectWidth, y2, rectWidth, rectHeight2);

        // outline vu's
        ctx.rect(x, 0, rectWidth, totalRectHeight);
        ctx.rect(x + rectWidth, 0, rectWidth, totalRectHeight);
        ctx.stroke();

    }
};

javascriptNode3.onaudioprocess = function() {
    
    if(playState && elCbFS.checked) {
        /* frequency spectrum */

            // get the average for the first channel
            let arrayFS =  new Uint8Array(analyserNode3.frequencyBinCount);
            analyserNode3.getByteFrequencyData(arrayFS);
        
            // clear the current state
            ctxFS.clearRect(0, 0, widthFS, heightFS);
        
            // set the fill style
            ctxFS.fillStyle=gradient;
            drawSpectrum(arrayFS);
    }
};

function drawSpectrum(array) {
    for ( var i = 0; i < (array.length); i++ ){
        var value = array[i];
        ctxFS.fillRect(i*5,325-value,3,325);
    }
}
// let shadowC = new shadowCanvas(512);
let snapshotData = [];
let dataHarvester = [];
function drawCanvases() {
    // if(playState && allSGData[0] !== undefined){
    if(playState && elCbSG.checked){
        // console.log(performance.now(),"drasw",allSGData,allSGData.length);

        // for (let i=0; i<=allSGData.length;i++){
            // console.log(performance.now(),"for",allSGData.length);
            // if(allSGData[0].isArray()){

                // drawSpectrogram(allSGData[0]);
                console.log("drawCanvases", snapshotData);
                drawSpectrogram(snapshotData);
                // allSGData.shift();
            // }
        // }
    }
    requestAnimationFrame(drawCanvases);
}
drawCanvases();
javascriptNode4.onaudioprocess = function (audioProcessingEvent) {
    console.log("javascriptNode4.onaudioprocess ------------- 1");
    if(playState && elCbSG.checked) {
        console.log("javascriptNode4.onaudioprocess ------------- 2");
        console.log("onaudioprocess: ", audioProcessingEvent.inputBuffer, analyserNode4.frequencyBinCount, audioProcessingEvent.outputBuffer);
        // @todo: connect erst bei play click
        document.getElementById('fpsSG').innerHTML = 'FPS (Spectogram): ' + fps.getFPS();

  
        // get the average for the first channel
        // frequencyBinCount (512) is half the analyzernode fft (1024), 
        // then call Uint8Array() with the frequencyBinCount as its length argument
        // — this is how many data points we will be collecting, for that fft size.)
        let array4 = new Uint8Array(analyserNode4.frequencyBinCount);
        // To actually retrieve the data and copy it into our array, we then call the data collection method
        analyserNode4.getByteFrequencyData(array4);

        // draw the spectrogram
        // drawSpectrogram(array4);
        // allSGData.push(array4);
        snapshotData = array4;  // es werden mehr array's gebildet als angezeigt werden können - snapshot wird zumeist überschrieben und nur jedes x. mal wirklich gezeichnet... 
        dataHarvester.push(array4);
        // shadowC.addElement(array4); // @todo: this should work - bad performance
    }
};


let colCount = 0;
function drawSpectrogram(array) {
    console.log("drawSpectrogram", array.length);
    // if (array.length > 0){

        switch (getVariant()) {
            case 2:
                /* Variant 2 */
                // keep an eye on the left border! if the song duration is longer than the width of the spectogram, we will become a problem that isn't handled yet
                console.log("drawSpectogram() --- Variant 2");
                console.log("drawSpectogram", colCount,array);
                console.log("drawSpectogram2", colCount, dataHarvester.length,dataHarvester);
                // iterate over the (512) elements from the array (512 = analyserNode4.fftSize / 2)
                for (let i = 0; i < array.length; i++) {
                    // draw each pixel with the specific color
                    let value2 = array[i];
                    ctxSG.fillStyle = "#FF0000";
                    ctxSG.fillStyle = hot.getColor(value2).hex();
                    
                    // draw the 'line' at the right side (799) of the canvas pixel by pixel bottom to top (512 -> 0)
                    ctxSG.fillRect(800 - 1, heightSG - i, 1, 1);
                }
                const sx2 = widthSG-(colCount+1);
                const sy2 = 0;
                const sWidth2 = colCount+1;
                const sHeight2 = heightSG;
                const dx2 = widthSG-1-(colCount+1);
                const dy2 = 0;
                const dWidth2 = colCount+1;
                const dHeight2 = heightSG;
                ctxSG.drawImage(cSG, sx2, sy2, sWidth2, sHeight2, dx2, dy2, dWidth2, dHeight2);
                console.log("copy2CANV", sx2, sy2, sWidth2, sHeight2, dx2, dy2, dWidth2, dHeight2);
                colCount++;
                break;
                
            default:
                /* Variant 1 */
                // (1) copy all spectogram cols of canvas to a tmp canvas; (2) draw new spectogram col on right side (799); 
                // (3) shift canvas positioning via translate one pixel to left; (4) copy drawn cols of tmp canvas back to canvas; 
                // (5) reset the transformation matrix
                console.log("drawSpectogram() --- Variant 1");
                // copy the current canvas onto the temp canvas
                // tempCtx.drawImage(cSG, 0, 0, 800, 512);
                tempCtx.drawImage(cSG, widthSG-(colCount+1), 0, colCount+1, heightSG, widthSG-(colCount+1), 0, colCount+1, heightSG );
                // stringifyLog("FreqArray", array);
                
                // iterate over the (512) elements from the array (512 = analyserNode4.fftSize / 2)
                for (let i = 0; i < array.length; i++) {
                    // draw each pixel with the specific color
                    let value = array[i];
                    ctxSG.fillStyle = "#FF0000";
                    ctxSG.fillStyle = hot.getColor(value).hex();
                    
                    // draw the 'line' at the right side (799) of the canvas pixel by pixel bottom to top (512 -> 0)
                    // ctxSG.fillRect(800 - 1, 512 - i, 1, 1);
                    ctxSG.fillRect(800 - 1, heightSG - i, 1, 1);
                }

                // set translate on the canvas
                ctxSG.translate(-1, 0);
                // draw the copied image (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
                // ctxSG.drawImage(tempCanvas, 0, 0, 800, 512, 0, 0, 800, 512);
                const image = tempCanvas;
                const sx = widthSG-(colCount+1); // 0
                const sy = 0; // 0
                const sWidth = colCount+1; // widthSG-(colCount+1);
                const sHeight = heightSG;
                const dx = widthSG-(colCount+1);
                const dy = 0;
                const dWidth = colCount+1;
                const dHeight = heightSG;
                ctxSG.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
                console.log("copy2CANV", sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
                // reset the transformation matrix
                // 1 to Horizontal scaling, 1 to Vertical scaling
                ctxSG.setTransform(1, 0, 0, 1, 0, 0);
                colCount++;
                break;
        }

    // }
}


sourceNode.onended = function() {
    console.log("END of soundfile");
    doEnd(); 
};

function doEnd() {
    console.log("doEnd....");
    stopSound();
    drawVUChanges = false;
    playState = false;
    ctx.clearRect(0, 0, width, height);
    removeCssClass(elBtnPlay, 'btn-success');
    addCssClass(elBtnPlay, 'disabled');
    addCssClass(elBtnPlay, 'btn-secondary');
    javascriptNode2.disconnect();
    javascriptNode3.disconnect();
    javascriptNode4.disconnect();
    analyserNode2_1.disconnect();
    analyserNode2_2.disconnect();
    analyserNode3.disconnect();
    analyserNode4.disconnect();
    // console.log("end object: ", shadowC.store, shadowC.lastElement);
}


function playSound() {
    sourceNode.start();
}

function stopSound() {
    sourceNode.stop();
}

function doPlay(){
    if (!playState) {
        playState = true;
        removeCssClass(elIconPlay, 'fa-play-circle');
        addCssClass(elIconPlay, 'fa-stop-circle');
        connectNodes();
        playSound();
    } else {
        if (!stopState) {
            stopState = true;
            playState = false;
            removeCssClass(elBtnPlay, 'btn-success');
            addCssClass(elBtnPlay, 'disabled');
            addCssClass(elBtnPlay, 'btn-secondary');
            stopSound();
        }
    }
}

function doReload() {
    window.location.reload(false);
}

addEventListener("DOMContentLoaded", function(){
    // start playing Music by an User click - because chrome and some other browsers force this behavior...
    if (elBtnPlay != null)
        elBtnPlay.addEventListener("click", doPlay);

    if (elBtnReload != null)
        elBtnReload.addEventListener("click", doReload);
});

function getVariant(){
    const el = document.getElementsByName('variant');
    for (let i=0; i<=el.length; i++){
        if (el[i].checked) {
            return el[i].value;
        }
    }
    return 1; // use variant 1 as default
}

function onErrorCust(e){
    stringifyLog(text="", e);
    elPStatus.innerHTML = "ERROR: <br/>" + JSON.stringify(e, null, '\t');

}

window.onload = function() {
    console.log("foo");
};
window.addEventListener('load', function() {
    console.log("bar");
});
