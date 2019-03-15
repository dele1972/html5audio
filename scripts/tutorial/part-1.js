"use strict";

// Tutorial - Part 1

// @ToDo fix error: InvalidStateError: An attempt was made to use an object that is not, or is no longer, usable
// @ToDo: I'm not able to store request.response to soundSource var by loadSound() to use it for decodeSound() :(

// by Dennis Lederich, 24.01.2019

// based on DZone `Exploring the HTML5 Web Audio: Visualizing Sound´ by Jos Dirksen (23.10.2012)
// https://dzone.com/articles/exploring-html5-web-audio

// Part I - play a soundfile with webaudio api
//    1. Load sound data
//    2. Read it in a buffer node and play the sound

// Load sound data by
// MediaElementAudioSourceNode      - provided by a media element
// MediaStreamAudioSourceNode       - used for microphone input
// AudioBufferSourceNode            - to load a sound file


// typical workflow (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API#Web_audio_concepts_and_usage)
// ----------------
// 1. Create audio context
//      let context = new AudioContext();

// 2. Inside the context, create sources — such as <audio>, oscillator, stream
        // The createBufferSource() method of the BaseAudioContext Interface is used to create a new AudioBufferSourceNode, 
        // which can be used to play audio data contained within an AudioBuffer object.
//      sourceNode = context.createBufferSource(); 

// (3. Create effects nodes, such as reverb, biquad filter, panner, compressor)

// 4. Choose final destination of audio, for example your system speakers
//      sourceNode.connect(context.destination);

// 5. Connect the sources up to the effects, and the effects to the destination.


// (1) create the audio context
let context = new AudioContext();

let audioBuffer;
let sourceNode;
let soundSource = {};

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
loadSound("../files/AlagaesiaAndEragon.ogg");

/**
 * after sound is loadad AND decoded
 * emitted by custom Event 'customEvent'
 */
function onStart(){
    // enable play button
    removeClass(elBtnPlay, 'disabled');
    // playSound();
}

function setupAudioNodes() {
    // (2) create a buffer source (audio-)node (https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBufferSource)
    sourceNode = context.createBufferSource();

    // and (4) connect the audionode to destination (https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/connect)
    // the destination (BaseAudioContext.AudioDestinationNode) is per default set to system speakers
    // (https://developer.mozilla.org/en-US/docs/Web/API/AudioDestinationNode)
    // (https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/destination)
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
    request.onload = function () { 
        // soundSource = new ArrayBuffer(request.response.byteLength);
        // new Uint8Array(soundSource).set(new Uint8Array(request.response.byteLength));
        // soundSource = Object.create(request.response); 
        // soundSource = request.response; 
        elSpinnerDiv.style.display = "none"; 
        decodeSound(request.response);
    };

    // start the request
    request.open('GET', url, true);
    request.send();
}

function decodeSound(requestBuffer){
    elSpinnerDiv.style.display = "block";
    elSpinnerText.innerHTML = "Decoding Soundfile ..."
    console.log("sound loaded, start decoding ...");
    // decode the data (https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)
    // @FixMe: soundSource is not an object :(
    context.decodeAudioData(requestBuffer)
        .then(function(buffer) {
            // decode is finished, safe buffer
            sourceNode.buffer = buffer;
            // shout out that decoding is finished - someone will probably handle the data...
            window.dispatchEvent(eAudioReady);
            
            elSpinnerDiv.style.display = "none";
        })
        .catch(onError);
}

function playSound() {
    console.log("start play sound ...");
    sourceNode.start();
}

function stopSound() {
    console.log("stop sound ...");
    sourceNode.stop();
}

// log if an error occurs
function onError(e) {
    elSpinnerDiv.style.display = "none";
    console.log("error: ",e);
    elPStatus.innerHTML = stringify;

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
