
function makeItZoom(){
    var options = arguments[0] || {};
    this.init(options);
}

makeItZoom.prototype.init = function(options){
    // The syntax used here is extremely important! Using the string literals in reference to the options object as it's
    // passed in ensures that those options will be specifiable by the user. Internally, they will be renamed by Closure.
    // So the user passes in options[containerId] = "myContainer", and the result might be that internally o.a = "myContainer".
    var processedOptions = {};
    processedOptions.containerId = options["containerId"] || "makeItZoom";
    processedOptions.maxZoomScale = options["maxZoomScale"] || 1.0;
    processedOptions.minZoomScale = options["minZoomScale"] || 0.1;
    processedOptions.zoomSpeed = options["zoomSpeed"] || 2.0;
    processedOptions.zoomTowardMouse = options["zoomTowardMouse"] !== false; // Zoom centers around mouse cursor by default, (0,0) if false
    processedOptions.panButton = typeof options["panButton"] != "undefined" ? options.panButton : 2; // right button pan by default. Set to null to disable panning
    processedOptions.disableNativeContextMenu = typeof options["disableNativeContextMenu"] === "boolean" ? options.disableNativeContextMenu : true; // really only useful when panButton = 0
    processedOptions.hardwareAccelerated = options["hardwareAccelerated"] !== false; // Hardware acceleration will be used if available by default
    processedOptions.fullScreen = options["fullScreen"] === true; // Fullscreen is OFF by default
    this.options = processedOptions;

    this.container = document.getElementById(processedOptions.containerId);

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 1, 1000000 );
    this.scene = new THREE.Scene();

    // CSS scene handles standard DOM elements and styling, such as <input> fields, drop-downs, etc.
    this.renderer = new THREE.CSS2DRenderer();
    this.renderer.setSize( this.width, this.height );
    this.renderer.setIsHardwareAccelerated(processedOptions.hardwareAccelerated);
    this.container.parentNode.insertBefore( this.renderer.domElement, this.container );
    this.container.parentNode.insertBefore(this.container, this.renderer.domElement);
    this.renderer.domElement.className = "makeitzoom_container";

    this.render = this.render.bind(this);

    this.attachControls();
    this.controls.setScale(1);

    this.importDOM.call(this,this.container);

    this.render();

    this.setFullScreen(processedOptions.fullScreen);
};

makeItZoom.prototype.setFullScreen = function(on){
    var that = this;

    function onWindowResize(){
        that.container.style.width = window.innerWidth;
        that.container.style.height = window.innerHeight;
        that.width = that.container.offsetWidth;
        that.height = that.container.offsetHeight;

        that.camera.aspect = window.innerWidth / window.innerHeight;
        that.camera.updateProjectionMatrix();

        that.renderer.setSize( window.innerWidth, window.innerHeight );

        that.render();
    }

    if (on === true) {
        onWindowResize();
        window.addEventListener( 'resize', onWindowResize, false );
    } else {
        window.removeEventListener( 'resize', onWindowResize, false );
    }
};

makeItZoom.prototype.getContainer = function(){
    return this.container;
};

makeItZoom.prototype.importDOM =function(container){
    // Must loop over children twice to find their offsets, then move them into the right container
    // If children are positioned using DOM flow to begin with, they will pile on top of
    // each other as they are removed from the dom rather than maintaining correct relative positions
    // Solution: store offsets, then convert to CSS3D Objects
    var that = this;
    this.childElementIterator(container,function(child){
        child.mzOffset = that.getOffset(child);
    });
    this.childElementIterator(container,function(child){
        that._addZoomable.call(that,child,child.mzOffset);
    });
};

makeItZoom.prototype.childElementIterator = function(parent,childCallback){
    var that=this,
        children = parent.children;
    for (var i = 0; i < children.length; i++) {
        var zoomEl = children[i];
        childCallback.call(that,zoomEl);
    }
};

makeItZoom.prototype.attachControls = function(){
    var that = this;
    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
    this.controls.zoomSpeed = this.options.zoomSpeed;
    this.controls.minZoomScale = this.options.minZoomScale;
    this.controls.maxZoomScale = this.options.maxZoomScale;
    this.controls.zoomTowardMouse = this.options.zoomTowardMouse;
    this.controls.panButton = this.options.panButton;

    if (this.options.disableNativeContextMenu === true) {
        this.controls.domElement.addEventListener( 'contextmenu', function ( event ) {
            // prevent the context menu, treat the right click as a regular mousedown event
            event.preventDefault();
        }, false );
        this.container.addEventListener( 'contextmenu', function ( event ) {
            // prevent the context menu, treat the right click as a regular mousedown event
            event.preventDefault();
        }, false );
    }

    this.controls.addEventListener( 'change', this.render );
    this.render();
};

makeItZoom.prototype.render = function(){
    this.renderer.render(this.scene,this.camera);

    // Dispatch an event with the new center and scale:
    var renderEvent = new CustomEvent('mz_render');
    renderEvent["mz_scale"] = this.controls.currentZoomScale;
    renderEvent["mz_center_x"] = this.controls.object.position.x;
    renderEvent["mz_center_y"] = this.controls.object.position.y;
    this.dispatchEvent(renderEvent);
};

makeItZoom.prototype._addZoomable = function(element, offset){

    var cssObject = new THREE.CSS2DObject( element );
    cssObject.position.x = offset.left;
    cssObject.position.y =  offset.top;
    cssObject.position.z = 0;

    this.scene.add(cssObject);
};

makeItZoom.prototype.addZoomable = function(element, offset){
    this._addZoomable(element,offset);
    this.render();
}

makeItZoom.prototype.removeZoomable = function(element){
    var removeMe = null;

    for (var i = 0; i< this.scene.children.length; i++){
        if (this.scene.children[i].element === element) {
            removeMe = this.scene.children[i];
        }
    }

    if (removeMe !== null) {
        this.scene.remove(removeMe);
    } else {
        console.warn("The specified element could not be removed from the makeItZoom workspace, because it couldn't be found.");
    }

    this.render();
};

makeItZoom.prototype.getOffset = function(el){
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
};

makeItZoom.prototype.getCurrentScale = function(){
    return this.controls.currentZoomScale;
};

makeItZoom.prototype.zoomTo = function(x,y,scale){
    var currX = this.controls.object.position.x,
        currY = this.controls.object.position.y,
        currScale = this.controls.currentZoomScale;

    if (typeof x !== "number") {x=currX;}
    if (typeof y !== "number") {y=currY;}
    if (typeof scale !== "number") {scale = currScale;}

    this.controls.panLeft(currX-x);
    this.controls.panUp(y-currY);
    this.controls.setScale(scale);
    this.controls.update(true);
};

THREE.EventDispatcher.prototype.apply( makeItZoom.prototype );

// Prevent Closure from removing makeItZoom's public API:
window["makeItZoom"] = makeItZoom;
makeItZoom.prototype["addZoomable"] = makeItZoom.prototype.addZoomable;
makeItZoom.prototype["removeZoomable"] = makeItZoom.prototype.removeZoomable;
makeItZoom.prototype["zoomTo"] = makeItZoom.prototype.zoomTo;
makeItZoom.prototype["getCurrentScale"] = makeItZoom.prototype.getCurrentScale;
makeItZoom.prototype["getOffset"] = makeItZoom.prototype.getOffset;
makeItZoom.prototype["getContainer"] = makeItZoom.prototype.getContainer;


