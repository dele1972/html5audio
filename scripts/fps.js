"use strict";

/* jshint -W117 */

// by Dennis Lederich, 24.01.2019

class myFPS {

    constructor() {
        this.lastCalledTime = performance.now();
        this.fps = 0;
    }
    
    getFPS() {
        const delta = (performance.now() - this.lastCalledTime)/1000;
        this.lastCalledTime = performance.now();
        return 1/delta;
    }

}
