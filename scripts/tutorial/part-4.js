"use strict";

/* jshint -W117 */

// Tutorial - Part 4

// @ToDo fix error: InvalidStateError: An attempt was made to use an object that is not, or is no longer, usable

// http://localhost/tutorial/part-3.html

// by Dennis Lederich, 24.01.2019

// based on DZone `Exploring the HTML5 Web Audio: Visualizing Sound´ by Jos Dirksen (23.10.2012)
// https://dzone.com/articles/exploring-html5-web-audio



// (1) create the audio context
let AudioContext = window.AudioContext || window.webkitAudioContext; // Cross browser
// https://stackoverflow.com/a/21413520/6628517
// https://stackoverflow.com/questions/29373563/audiocontext-on-safari#29373891

let BaseAudio = {
    audioContext: new AudioContext(),
    sourceNode: {}
};

let VolumeMeter = {
    active: true,
    short: 'VU',
    inputElement: document.getElementById("checkVU"),
    paint: {},
    splitter2: {},
    analyserNode2_1: {},
    analyserNode2_2: {},
    javascriptNode2: {}
};

let FrequencySpectrum = {
    active: true,
    short: 'FS',
    inputElement: document.getElementById("checkFS"),
    paint: {},
    analyserNode3: {},
    javascriptNode3: {},
    smoothingTimeConstant: 0.3,
    fftSize: 512,
    ProcessorBufferSize: 2048
};

let Spectogram = {
    active: true,
    short: 'SG',
    inputElement: document.getElementById("checkSG"),
    fftSize: 1024,
    ProcessorBufferSize: 2048,
    paint: {},
    analyserNode4: {},
    javascriptNode4: {}
};

// chrome want to create an audionode by user interaction like click - but start playing a sound by ui seems to be minimum requirement
let playState = false;
let stopState = false;

let fps = new myFPS();

// add a custom event, would be fired after sound is decoded and ready to play
// (https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events)
let eAudioReady = new Event('audioReady');

const elPStatus = document.getElementById("status");
const elSpinnerDiv = document.getElementById("spinner");
const elSpinnerText = document.getElementById("spinnerText");
const elBtnPlay = document.getElementById("btnPlay");
const elIconPlay = document.getElementById("iconPlay");
const elBtnReload = document.getElementById("btnReload");

let localAudioStackTrigger = false;
function onAudioStackTrigger() {
    console.log('   *** onAudioStackTrigger ***');
    localAudioStackTrigger = true;
}

function initPaintVU() {
    VolumeMeter.paint = new Paint({
        'parent': document.getElementById('area4vu'),
        'width': 50,
        'height': 130,
        'gradient': true
    });
    
}

function initPaintFS() {
    FrequencySpectrum.paint = new Paint({
        'parent': document.getElementById('area4freq-spectrum'),
        'width': 1000,
        'height': 325,
        'gradient': true
    });

}

function initPaintSG() {
    Spectogram.paint = new Paint({
        'parent': document.getElementById('area4spectogram'),
        'width': Math.ceil(BaseAudio.sourceNode.buffer.length/Spectogram.ProcessorBufferSize),
        'height': Math.ceil(Spectogram.fftSize/BaseAudio.sourceNode.buffer.numberOfChannels),
        'gradient': false,
        'shadowCanvas': true,
        'hot': new myChromaFake()
    });
}

function setupAudioNodes() {
    
    /*   CREATE AUDIO NODES   */
    // sourceNode, splitter2, analyserNode2_, analyserNode3, javascriptNode2, javascriptNode3
    
    // create a buffer source node
    BaseAudio.sourceNode = BaseAudio.audioContext.createBufferSource();

    setNodesVU();
    setNodesFS();
    setNodesSG();
}

function setNodesVU () {
        // A) setup a analyzer
        VolumeMeter.analyserNode2_1 = BaseAudio.audioContext.createAnalyser();
        VolumeMeter.analyserNode2_1.smoothingTimeConstant = 0.3;
        VolumeMeter.analyserNode2_1.fftSize = 1024;
        
        // A) setup a 2nd analyzer (for each channel vu)
        VolumeMeter.analyserNode2_2 = BaseAudio.audioContext.createAnalyser();
        VolumeMeter.analyserNode2_2.smoothingTimeConstant = 0.0;
        VolumeMeter.analyserNode2_2.fftSize = 1024;
        // A) split audio channel
        VolumeMeter.splitter2 = BaseAudio.audioContext.createChannelSplitter();
        
        // II) setup a javascript node for VU
        // * https://developer.mozilla.org/de/docs/Web/API/ScriptProcessorNode
        VolumeMeter.javascriptNode2 = BaseAudio.audioContext.createScriptProcessor(2048, 1, 1);

        // when the javascript node is called we use information from the analyzer node to draw the volume;
        // Since the data is sampled at 44.1k, this function will be called approximately 21 times a second
        VolumeMeter.javascriptNode2.onaudioprocess = function() {

            // if(drawVUChanges) {
            if(playState && VolumeMeter.inputElement.checked) {

                // get the average for the first channel (bincount is fftsize / 2)
                var array =  new Uint8Array(VolumeMeter.analyserNode2_1.frequencyBinCount);
                VolumeMeter.analyserNode2_1.getByteFrequencyData(array);
                var average = getAverageVolume(array);
                // console.log("average (one channel)= ", average);
                
                // get the average for the second channel
                var array2 =  new Uint8Array(VolumeMeter.analyserNode2_2.frequencyBinCount);
                VolumeMeter.analyserNode2_2.getByteFrequencyData(array2);
                var average2 = getAverageVolume(array2);
                
                // create the meters
                // canvascontext.fillRect(x,y,width,height);
                const totalRectHeight = 130;
                VolumeMeter.paint.clearCanvas(0, 0, 50, 130);
                const vuParam = {
                    'channelwidth': 25, 
                    'left': {
                        'x': 0, 
                        'y': totalRectHeight- (totalRectHeight * average / 100),
                        'average': average
                    },
                    'right': {
                        'x': 0, 
                        'y': totalRectHeight- (totalRectHeight * average2 / 100),
                        'average': average2
                    }
                };
                VolumeMeter.paint.drawVu(vuParam);
            }
        };

}

function setNodesFS () {
        // B) setup a 3rd analyzer (for frequency spectrum)
        // We set the fftSize to 512. This means we get 256 bars that represent our frequency. 
        FrequencySpectrum.analyserNode3 = BaseAudio.audioContext.createAnalyser();
        FrequencySpectrum.analyserNode3.smoothingTimeConstant = FrequencySpectrum.smoothingTimeConstant;
        FrequencySpectrum.analyserNode3.fftSize = FrequencySpectrum.fftSize;

        // III) setup a 'javascriptnode' for frequency spectrum
        FrequencySpectrum.javascriptNode3 = BaseAudio.audioContext.createScriptProcessor(FrequencySpectrum.ProcessorBufferSize, 1, 1);
        
        FrequencySpectrum.javascriptNode3.onaudioprocess = function() {
            
            if(playState && FrequencySpectrum.inputElement.checked) {
                /* frequency spectrum */

                    // get the average for the first channel
                    let arrayFS =  new Uint8Array(FrequencySpectrum.analyserNode3.frequencyBinCount);
                    FrequencySpectrum.analyserNode3.getByteFrequencyData(arrayFS);
                
                    // clear the current state
                    // ctxFS.clearRect(0, 0, widthFS, heightFS);
                    FrequencySpectrum.paint.clearCanvas(0, 0, FrequencySpectrum.paint.width, FrequencySpectrum.paint.height);
                
                    // set the fill style
                    // ctxFS.fillStyle=gradient;
                    // drawSpectrum(arrayFS);
                    FrequencySpectrum.paint.drawSpectrum(arrayFS);
            }
        };

}

function setNodesSG() {
    // `The analyser we create here has an fftSize of 1024, this means we get 512 frequency buckets
    // with strengths. So we can draw a spectrogram that has a height of 512 pixels. Also note 
    // that the smoothingTimeConstant is set to 0. 
    // This means we don't use any of the previous results in the analysis. We want to show the 
    // real information, not provide a smooth volume meter or frequency spectrum analysis.´
    Spectogram.analyserNode4 = BaseAudio.audioContext.createAnalyser();
    Spectogram.analyserNode4.smoothingTimeConstant = 0;
    Spectogram.analyserNode4.fftSize = Spectogram.fftSize;
    
    // IV) setup a 'javascriptnode' for spectogram
    Spectogram.javascriptNode4 = BaseAudio.audioContext.createScriptProcessor(Spectogram.ProcessorBufferSize, 1, 1);

    Spectogram.javascriptNode4.onaudioprocess = function (audioProcessingEvent) {
        /*
        INFO (https://medium.com/web-audio/you-dont-need-that-scriptprocessor-61a836e28b42)
        Using a buffer size of 1024 means that every 1024 sample frames, the AudioProcess event will fire, and your callback will be called. The AudioContext uses a sample rate of 44100Hz (44.1 kHz) by default. This is pretty standard in audio processing, and chances are that you won’t have any reason to change it. So, some simple math: each sample frame is 1 / 44100 = 0.00002267 seconds long. Each buffer then is 1024 * 0.00002267 = 0.0232 seconds long, which is the length of time in between each invocation of your callback. Woah. Every .0232s your event loop gets hit with another function call. That’s 43 callbacks per second, just for one ScriptProcessor! You can run through that math again with a buffer size of 4096 if you want to, you’ll find that you’re not saving yourself much trouble. Buffer size vs. latency is a tradeoff that you hopefully have already considered anyway.
        ...
        Certainly if you’re working on any sort of interactive audiovisual experiment, you’ll want to be mindful of cutting processor costs as much as possible.
        */
       if (Spectogram.paint.colcount <= Spectogram.paint.width || (Spectogram.paint.colcount === 0 && initializingPlaySound )) {
            document.getElementById('fpsSG').innerHTML = 'FPS (Spectogram): ' + fps.getFPS();
    
            // get the average for the first channel
            // frequencyBinCount (512) is half the analyzernode fft (1024), 
            // then call Uint8Array() with the frequencyBinCount as its length argument
            // — this is how many data points we will be collecting, for that fft size.)
            let array4 = new Uint8Array(Spectogram.analyserNode4.frequencyBinCount);

            // To actually retrieve the data and copy it into our array, we then call the data collection method
            Spectogram.analyserNode4.getByteFrequencyData(array4);

            // draw the spectrogram
            Spectogram.paint.pushAudioStack(array4);

            initializingPlaySound = false;
            
        } else {
            console.log('Spectogram.javascriptNode4    *** END ***');
            disconnectSG();
            return;
        }

    };
}

function connectNodes() {
    console.log('connecting nodes');
        
    /*   CONNECT ALL NODES   */
    // I: sourceNode (soundfile) -> output
    // II:     |------------------> analyserNode2_1 -> javascriptNode2
    // II:     |------------------> analyserNode2_2
    // III     |------------------> analyserNode3   -> javascriptNode3
    // IV      |------------------> analyserNode4   -> javascriptNode4

    connectNodeVU();
    connectNodeFS();
    connectNodeSG();
    connectOutput();
}

function connectNodeVU() {
    // A) connect the source to the analyser and the splitter
    BaseAudio.sourceNode.connect(VolumeMeter.splitter2);

    // A) connect one of the outputs from the splitter to the analyser
    VolumeMeter.splitter2.connect(VolumeMeter.analyserNode2_1,0,0);
    VolumeMeter.splitter2.connect(VolumeMeter.analyserNode2_2,1,0);
    // A) we use the javascript node to draw at a specific interval.
    VolumeMeter.analyserNode2_1.connect(VolumeMeter.javascriptNode2);
    // A) connect to destination, else it isn't called
    VolumeMeter.javascriptNode2.connect(BaseAudio.audioContext.destination);
}

function connectNodeFS() {
    // B) connect the source to the analyser3
    BaseAudio.sourceNode.connect(FrequencySpectrum.analyserNode3);
    // B) we use the javascript node to draw at a specific interval.
    FrequencySpectrum.analyserNode3.connect(FrequencySpectrum.javascriptNode3);
    // B) connect to destination, else it isn't called
    FrequencySpectrum.javascriptNode3.connect(BaseAudio.audioContext.destination);
}

function connectNodeSG() {
    console.log('connecting SG Nodes');
    // C) connect the source to the analyser4
    BaseAudio.sourceNode.connect(Spectogram.analyserNode4);
    // C) we use the javascript node to draw at a specific interval.
    Spectogram.analyserNode4.connect(Spectogram.javascriptNode4);
    // C) connect to destination, else it isn't called
    Spectogram.javascriptNode4.connect(BaseAudio.audioContext.destination);
}

function connectOutput() {
    // and connect to destination, if you want audio, (comment for 'mute')
    BaseAudio.sourceNode.connect(BaseAudio.audioContext.destination);
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
        BaseAudio.audioContext.decodeAudioData(requestBuffer)
        .then(function(buffer) {
                // decode is finished, save buffer
                BaseAudio.sourceNode.buffer = buffer;
                // document.getElementById('samplerate').innerHTML = audioContext.sampleRate + " Hz";
                // shout out that decoding is finished - someone will probably handle the data...
                window.dispatchEvent(eAudioReady);
                
                // elSpinnerDiv.style.display = "none";
            })
            .catch(onErrorCust);
}

function drawSpectrumDEPR(array) {
    for ( var i = 0; i < (array.length); i++ ){
        var value = array[i];
        ctxFS.fillRect(i*5,325-value,3,325);
    }
}

let snapshotData = [];
let dataHarvester = [];
let animationFrameCounter = 0;
function drawCanvases() {
            
    animationFrameCounter++;
    console.log('drawCanvases', Spectogram.paint.colcount, animationFrameCounter, Spectogram.paint.getAudioStackLength(),
        Spectogram.paint.getAudioStackChunksize(),
        Spectogram.paint.getAudioStackLength() % Spectogram.paint.getAudioStackChunksize());
    
        Spectogram.paint.orderSpectogramPaint();
            
    if (localAudioStackTrigger) {
        localAudioStackTrigger = false;
        // paintSG.copySpectogram();
    }
    
    // if (doAnimationFrame) {
    if (Spectogram.paint.colcount <= Spectogram.paint.width || (Spectogram.paint.colcount === 0 && initializingPlaySound )) {
        requestAnimationFrame(drawCanvases);
    } else {
        console.log('no reqAnimFra');
    }
}

let colCount = 0;
function drawSpectrogramDEPR(array) {
    console.log("DEPRECATED drawSpectrogram", array.length);
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
                // tempCtx.drawImage(cSG, widthSG-(colCount+1), 0, colCount+1, heightSG, widthSG-(colCount+1), 0, colCount+1, heightSG );
                
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

function doPlay(){
    if (!playState) {
        console.log('doPlay()');
        playState = true;
        removeCssClass(elIconPlay, 'fa-play-circle');
        addCssClass(elIconPlay, 'fa-stop-circle');
        connectNodes();
        playSound();
    } else {
        if (!stopState) {
            console.log('doPlay() - ELSE');
            stopState = true;
            playState = false;
            removeCssClass(elBtnPlay, 'btn-success');
            addCssClass(elBtnPlay, 'disabled');
            addCssClass(elBtnPlay, 'btn-secondary');
            stopSound();
        }
    }
}
let initializingPlaySound;
function playSound() {
    elPStatus.innerHTML = 'Status: Start playing sound';
    console.log('start playing');
    BaseAudio.sourceNode.start();
    // doAnimationFrame = true;
    initializingPlaySound = true;
    drawCanvases();
}

function doEnd() {
    console.log("doEnd....");
    stopSound();
    
    // doAnimationFrame = false;
    
    playState = false;
    removeCssClass(elBtnPlay, 'btn-success');
    addCssClass(elBtnPlay, 'disabled');
    addCssClass(elBtnPlay, 'btn-secondary');

    disconnectVU();
    disconnectFS();
    disconnectSG();
    // console.log("end object: ", shadowC.store, shadowC.lastElement);
}
function disconnectVU() {
    // drawVUChanges = false;
    VolumeMeter.paint.disableDrawChanges();
    VolumeMeter.javascriptNode2.disconnect();
    VolumeMeter.analyserNode2_1.disconnect();
    VolumeMeter.analyserNode2_2.disconnect();
}
function disconnectFS() {
    FrequencySpectrum.javascriptNode3.disconnect();
    FrequencySpectrum.analyserNode3.disconnect();
}
function disconnectSG() {
    Spectogram.javascriptNode4.disconnect();
    Spectogram.analyserNode4.disconnect();
}

function stopSound() {
    console.log('stop playing');
    BaseAudio.sourceNode.stop();
    elPStatus.innerHTML = 'Status: End of playing sound';
}

function doReload() {
    window.location.reload(false);
}

function getVariant(){
    const el = document.getElementsByName('variant');
    for (let i=0; i<=el.length; i++){
        if (el[i].checked) {
            return el[i].value;
        }
    }
    return 1; // use variant 1 as default
}

/**
 * onStart
 * will be called by custom event-listener 'audioReady' which will be emmitted by decodeSound()
 */
function onStart(){
    
    // disable spinner
    elSpinnerDiv.style.display = "none";

        
    // show Samplerate
    document.getElementById('samplerate').innerHTML = BaseAudio.audioContext.sampleRate + " Hz" +
    ' / ' + BaseAudio.sourceNode.buffer.length + " Samples" +
    ' / ' + BaseAudio.sourceNode.buffer.duration + " Sec." +
    ' / ' + BaseAudio.sourceNode.buffer.numberOfChannels + " Channels";
    if (Spectogram.active) {
        document.getElementById('samplerate').innerHTML += ' / ' + Spectogram.paint.width + " x " + Spectogram.paint.height;
        initPaintSG();
    }
    if (VolumeMeter.active) {
        initPaintVU();
    }
    if (FrequencySpectrum.active) {
        initPaintFS();
    }

    // enable play button
    removeCssClass(elBtnPlay, 'disabled');

    elPStatus.innerHTML = "Status: Sound is loaded and decoded - ready to play";
}

function onErrorCust(e){
    stringifyLog(text="", e);
    elPStatus.innerHTML = "ERROR: <br/>" + JSON.stringify(e, null, '\t');

}

window.addEventListener('audioReady', onStart, false);

window.addEventListener('audioStackTrigger', onAudioStackTrigger, false);

window.addEventListener("DOMContentLoaded", function(){
    // before 'onload' and 'load'

    // add element event listener (start playing Music by an User click - because chrome and some other browsers force this behavior...)
    if (elBtnPlay != null)
        elBtnPlay.addEventListener("click", doPlay);

    if (elBtnReload != null)
        elBtnReload.addEventListener("click", doReload);

    if (isIosDevice()){
        document.getElementById("status").innerHTML = "<strong style='color:red'>Sorry, but the Web Audio API is not supported by your browser. Please, consider upgrading to the latest version or downloading Google Chrome or Mozilla Firefox</strong>";
        throw new Error("Sorry, but the Web Audio API is not supported by your browser!");
    }

    setupAudioNodes();

    // load the sound
    // AlagaesiaAndEragon.ogg, Tanner Helland, Creative Commons Attribution-ShareAlike 3.0 License
    // https://www.tannerhelland.com/66/alagaesia-eragon-piano/
    // loadSound("../files/AlagaesiaAndEragon.ogg");
    loadSound("../files/wagner-short.ogg");
});

window.onload = function() {
    // after 'DOMContentLoaded' before 'load'
};

window.addEventListener('load', function() {
    // after 'DOMContentLoaded' and 'onload'
});

BaseAudio.sourceNode.onended = function() {
    console.log("*** END of soundfile ***");
    doEnd(); 
};