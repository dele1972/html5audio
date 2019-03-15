"use strict";

// Tutorial - Part 3

// @ToDo fix error: InvalidStateError: An attempt was made to use an object that is not, or is no longer, usable

// http://localhost/tutorial/part-3.html

// by Dennis Lederich, 24.01.2019

// based on DZone `Exploring the HTML5 Web Audio: Visualizing Sound´ by Jos Dirksen (23.10.2012)
// https://dzone.com/articles/exploring-html5-web-audio

// (1) create the audio context
let context = new AudioContext();

let audioBuffer;
let sourceNode, splitter2, analyserNode2_1, analyserNode2_2, analyserNode3, javascriptNode2, javascriptNode3;
let soundSource = {};

// canvas context to draw the volume meter
let c = document.getElementById('myCanvas1');
let ctx = c.getContext('2d');
let width = 50;
let height = 130;

// canvas context to draw the frequency spectrum
let cFS = document.getElementById('myCanvas2');
let ctxFS = cFS.getContext('2d');
let widthFS = 1000;
let heightFS = 325;

let drawVUChanges = true;

let gradient = ctx.createLinearGradient(0,0,0,300);
gradient.addColorStop(1,'#000000');
gradient.addColorStop(0.75,'#ff0000');
gradient.addColorStop(0.25,'#ffff00');
gradient.addColorStop(0,'#ffffff');

// chrome want to create an audionode by user interaction like click - but start playing a sound by ui seems to be minimum requirement
let playState = false;
let stopState = false;

const elSpinnerDiv = document.getElementById("spinner");
const elSpinnerText = document.getElementById("spinnerText");
const elBtnPlay = document.getElementById("btnPlay");
const elIconPlay = document.getElementById("iconPlay");

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
 * after sound is loadad AND decoded
 * emitted by custom Event 'customEvent'
 */
function onStart(){
    removeClass(elBtnPlay, 'disabled');
}

function setupAudioNodes() {
    
    /*   CREATE AUDIO NODES   */
    // sourceNode, splitter2, analyserNode2_, analyserNode3, javascriptNode2, javascriptNode3
    
        // create a buffer source node
        sourceNode = context.createBufferSource();
        
        // A) setup a analyzer
        analyserNode2_1 = context.createAnalyser();
        analyserNode2_1.smoothingTimeConstant = 0.3;
        analyserNode2_1.fftSize = 1024;
        
        // A) setup a 2nd analyzer (for each channel vu)
        analyserNode2_2 = context.createAnalyser();
        analyserNode2_2.smoothingTimeConstant = 0.0;
        analyserNode2_2.fftSize = 1024;
        
        // B) setup a 3rd analyzer (for frequency spectrum)
        // We set the fftSize to 512. This means we get 256 bars that represent our frequency. 
        analyserNode3 = context.createAnalyser();
        analyserNode3.smoothingTimeConstant = 0.3;
        analyserNode3.fftSize = 512;

        // A) split audio channel
        splitter2 = context.createChannelSplitter();
        
        // II) setup a javascript node for VU
        // * https://developer.mozilla.org/de/docs/Web/API/ScriptProcessorNode
        javascriptNode2 = context.createScriptProcessor(2048, 1, 1);

        // III) setup a 'javascriptnode' for frequency spectrum
        javascriptNode3 = context.createScriptProcessor(2048, 1, 1);
    
    /*   CONNECT ALL NODES   */
    // I: sourceNode (soundfile) -> output
    // II:     |------------------> analyserNode2_1 -> javascriptNode2
    // II:     |------------------> analyserNode2_2
    // III     |------------------> analyserNode3   -> javascriptNode3
        
        // A) connect the source to the analyser and the splitter
        sourceNode.connect(splitter2);
 
        // A) connect one of the outputs from the splitter to the analyser
        splitter2.connect(analyserNode2_1,0,0);
        splitter2.connect(analyserNode2_2,1,0);

        // B) connect the source to the analyser3
        sourceNode.connect(analyserNode3);

        // A) we use the javascript node to draw at a specific interval.
        analyserNode2_1.connect(javascriptNode2);

        // B) we use the javascript node to draw at a specific interval.
        analyserNode3.connect(javascriptNode3);

        // A) connect to destination, else it isn't called
        javascriptNode2.connect(context.destination);

        // B) connect to destination, else it isn't called
        javascriptNode3.connect(context.destination);

        // and connect to destination, if you want audio
        sourceNode.connect(context.destination);
}

// load the specified sound
function loadSound(url) {
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
    elSpinnerText.innerHTML = "Decoding Soundfile ..."
    // decode the data (https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)
    context.decodeAudioData(requestBuffer)
        .then(function(buffer) {
            // decode is finished, safe buffer
            sourceNode.buffer = buffer;
            document.getElementById('samplerate').innerHTML = context.sampleRate + " Hz";
            // shout out that decoding is finished - someone will probably handle the data...
            window.dispatchEvent(eAudioReady);
            
            elSpinnerDiv.style.display = "none";
        })
        .catch(onError);
}

// when the javascript node is called we use information from the analyzer node to draw the volume;
// Since the data is sampled at 44.1k, this function will be called approximately 21 times a second
javascriptNode2.onaudioprocess = function() {

    // if(drawVUChanges) {
    if(playState) {

        // get the average for the first channel (bincount is fftsize / 2)
        var array =  new Uint8Array(analyserNode2_1.frequencyBinCount);
        analyserNode2_1.getByteFrequencyData(array);
        var average = getAverageVolume(array);
        console.log("average (one channel)= ", average);
        
        // get the average for the second channel
        var array2 =  new Uint8Array(analyserNode2_2.frequencyBinCount);
        analyserNode2_2.getByteFrequencyData(array2);
        var average2 = getAverageVolume(array2);
        
        // clear the current state
        ctx.clearRect(0, 0, width, height);
    
        // set the fill style
        ctx.fillStyle=gradient;
    
        // create the meters
        // context.fillRect(x,y,width,height);
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
}

javascriptNode3.onaudioprocess = function() {
    
    if(playState) {
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
}

function drawSpectrum(array) {
    for ( var i = 0; i < (array.length); i++ ){
        var value = array[i];
        ctxFS.fillRect(i*5,325-value,3,325);
    }
};

sourceNode.onended = function() {
    drawVUChanges = false;
    playState = false;
    ctx.clearRect(0, 0, width, height);
    removeClass(elBtnPlay, 'btn-success');
    addClass(elBtnPlay, 'disabled');
    addClass(elBtnPlay, 'btn-secondary');
    console.log("END of soundfile"); 
};

function getAverageVolume(array) {
    var values = 0;
    var average;

    var length = array.length;

    // get all the frequency amplitudes
    for (var i = 0; i < length; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}


function playSound() {
    sourceNode.start();
}

function stopSound() {
    sourceNode.stop();
}

// log if an error occurs
function onError(e) {
    console.log("error: ",e);
}

/**
 * https://jaketrent.com/post/addremove-classes-raw-javascript/
 * @param {*} el 
 * @param {*} className 
 */
function hasClass(el, className) {
    if (el.classList)
      return el.classList.contains(className)
    else
      return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
  }
  
  /**
   * https://jaketrent.com/post/addremove-classes-raw-javascript/
   * @param {*} el 
   * @param {*} className 
   */
  function addClass(el, className) {
    if (el.classList)
      el.classList.add(className)
    else if (!hasClass(el, className)) el.className += " " + className
  }
  
  /**
   * https://jaketrent.com/post/addremove-classes-raw-javascript/
   * @param {*} el 
   * @param {*} className 
   */
  function removeClass(el, className) {
    if (el.classList)
      el.classList.remove(className)
    else if (hasClass(el, className)) {
      var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
      el.className=el.className.replace(reg, ' ')
    }
  }

function doPlay(){
    if (!playState) {
        playState = true;
        removeClass(elIconPlay, 'fa-play-circle');
        addClass(elIconPlay, 'fa-stop-circle');
        playSound();
    } else {
        if (!stopState) {
            stopState = true;
            playState = false;
            removeClass(elBtnPlay, 'btn-success');
            addClass(elBtnPlay, 'disabled');
            addClass(elBtnPlay, 'btn-secondary');
            stopSound();
        }
    }
}

addEventListener("DOMContentLoaded", function(){
    // start playing Music by an User click - because chrome and some other browsers force this behavior...
    if (elBtnPlay != null)
        elBtnPlay.addEventListener("click", doPlay);
})

window.onload = function() {
    console.log("foo");
}
window.addEventListener('load', function() {
    console.log("bar");
})
