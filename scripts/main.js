"use strict";

/**
 * deviceOrientation
 * Revealing Module Pattern (s. S. 746 'JavaScript - Das umfassende Handbuch', Rheinwerk, Philip Ackermann)
 * Ziel: Variablen und Wertverändernde Funktionen aus dem globalen window Bereich entfernen, damit der
 *       Zugriff geschützt ist; Werte können nur noch über die Methoden von außerhalb verändert werden.
 *       Die ODER Notation erfordert die Verwendung von 'var' anstelle von 'let' und unterbindet
 *       weitere Instanzen - quasi ein Singleton Entwurfsmuster (s. S. 744)
 *
 *  Werte für DeviceOrientation führen mit entsprechendem Setter und Getter
 *
 * @type {{setValues, getValues}}
 */
var deviceOrientation = deviceOrientation || (function () {
  let alpha = 0, beta = 0, gamma = 0;

  function setValues(a, b, g) {
    alpha = a;
    beta = b;
    gamma = g;
  }

  function getValues() {
    return [['alpha', alpha], ['beta', beta], ['gamma', gamma]];
  }

  return {
    setValues: setValues,
    getValues: getValues
  }
})();

window.onload = function () {
  // var paths = document.getElementsByTagName('path');
  // var visualizer = document.getElementById('visualizer');
  // var mask = visualizer.getElementById('mask');
  var h = document.getElementsByTagName('h1')[0];
  var path;
  var report = 0;

  let counter = 0;

  var soundAllowed = function (stream) {
    console.log('Audio allowed :)');


        //Audio stops listening in FF without 'window.persistAudioStream = stream;'
        //https://bugzilla.mozilla.org/show_bug.cgi?id=965483
        //https://support.mozilla.org/en-US/questions/984179
        window.persistAudioStream = stream;

        var audioCtx = new AudioContext();    // 'context' in tutorial

        // creates a MediaStreamAudioSourceNode object representing the audio node whose media is obtained
        // from the microphone (the navigator.mediaDevices.getUserMedia stream)
        var audioStream = audioCtx.createMediaStreamSource( stream );

        var analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 1024;
        analyserNode.fftSize = 2048;
        analyserNode.maxDecibels = -25;
        analyserNode.minDecibels = -60; // default -100; more is more sensitive
        analyserNode.smoothingTimeConstant = 0.2; // default 0.8; less is more sensitive
        audioStream.connect(analyserNode);

        var frequencyArray = new Uint8Array(analyserNode.frequencyBinCount);
        // visualizer.setAttribute('viewBox', '0 0 255 255');

        //Through the frequencyArray has a length longer than 255, there seems to be no
        //significant data after this point. Not worth visualizing.
        // for (var i = 0 ; i < 255; i++) {
        //     path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        //     path.setAttribute('stroke-dasharray', '4,1');
        //     mask.appendChild(path);
        // }
        var doDraw = function () {
          counter++;
          if (counter < 20){
          requestAnimationFrame(doDraw);
            analyserNode.getByteFrequencyData(frequencyArray);
            console.log('frequency array: ', frequencyArray);
        //     var adjustedLength;
        //     for (var i = 0 ; i < 255; i++) {
        //         adjustedLength = Math.floor(frequencyArray[i]) - (Math.floor(frequencyArray[i]) % 5);
        //         paths[i].setAttribute('d', 'M '+ (i) +',255 l 0,-' + adjustedLength);
            // }
          }

        }
        doDraw();

  }

  var soundNotAllowed = function (error) {
      // h.innerHTML = "You must allow your microphone.";
      console.log(error);
  }

  navigator.mediaDevices.getUserMedia({audio:true})
  .then(function(stream){
      soundAllowed(stream)
  })
  .catch(function(err){soundNotAllowed(err)});

};
