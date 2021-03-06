
function MakeItZoom(){
    var options = arguments[0] || {};
    this.init(options);
}

MakeItZoom.prototype.init = function(options){
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
    processedOptions.bounds = options["bounds"] || null;
    processedOptions.zeroAtCenter = options["zeroAtCenter"] !== true; // Default puts 0,0 in the top-left corner. True puts (0,0) in the center of the zoomable area
    processedOptions.enableUserInteractions = options["enableUserInteractions"] !== false;  // Mouse/touch/keyboard interactions are enabled by default. Set false explicitly to turn these off.
    this.options = processedOptions;

    this.container = document.getElementById(processedOptions.containerId);

    // remove each element from the passed-in container, recording its current offset
    // positions for when it gets added back after the scene is created
    var existingElements = this.cacheElements.call(this,this.container);

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 1, 1000000 );
    this.scene = new THREE.Scene();

    // put back all the elements the user set up that were removed at the beginning
    this.replaceElements.call(this,existingElements);

    // CSS scene handles standard DOM elements and styling, such as <input> fields, drop-downs, etc.
    this.renderer = new THREE.CSS2DRenderer(this.container);
    this.renderer.setAlignment(this.options.zeroAtCenter ? "CENTER" : "TOP_LEFT" );
    this.renderer.setSize( this.width, this.height );
    this.renderer.setIsHardwareAccelerated(processedOptions.hardwareAccelerated);
    this.renderer.domElement.style.position = "absolute";

    this.render = this.render.bind(this);

    this.attachControls();
    this.controls.setScale(1);

    this.setFullScreen(processedOptions.fullScreen);

    this.controls.update(); // triggers initial render, but also makes sure that the display conforms to bounds
};

MakeItZoom.prototype.setEnableUserInteractions = function(state) {
    this.controls.enableInteractions(state);
};

MakeItZoom.prototype.setFullScreen = function(on){
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

MakeItZoom.prototype.getContainer = function(){
    return this.container;
};

MakeItZoom.prototype.cacheElements = function(container){
    var that = this,
        elements = [];

    this.childElementIterator(container,function(child){
        var offset = that.getOffset(child),
            positioning = getComputedStyle(child).getPropertyValue("position"),
            wasRelativelyPositioned = positioning === "relative" || positioning === "static";
        if (wasRelativelyPositioned) {
            child.mzOffset = offset;
        }
        elements.push(child);
    });
    for (var i=0; i<elements.length; i++){
        var child = elements[i];

        container.removeChild(child);
        if (child.mzOffset) {

            // If we were relatively positioned coming in, all the then-current offsets were recorded
            // Now it's time to keep each object in the same position, but position them absolutely.
            child.style.position = "absolute";
            child.style.top = child.mzOffset.top + "px";
            child.style.left = child.mzOffset.left + "px";
        }
    }
    return elements;
};

MakeItZoom.prototype.replaceElements = function(elements){
    for (var i=0; i<elements.length; i++){
        var child = elements[i];
        this._addZoomable.call(this,child,child.mzOffset);
    }
};

MakeItZoom.prototype._addZoomable = function(element){

    var cssObject = new THREE.CSS2DObject( element );

    this.scene.add(cssObject);
};

MakeItZoom.prototype.childElementIterator = function(parent,childCallback){
    var that=this,
        children = parent.children;
    for (var i = 0; i < children.length; i++) {
        var zoomEl = children[i];
        childCallback.call(that,zoomEl);
    }
};

MakeItZoom.prototype.attachControls = function(){
    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
    this.controls.zoomSpeed = this.options.zoomSpeed;
    this.controls.setMinZoomScale(this.options.minZoomScale);
    this.controls.setMaxZoomScale(this.options.maxZoomScale);
    this.controls.setBounds(this.options.bounds);
    this.controls.enableInteractions(this.options.enableUserInteractions);

    this.controls.zoomTowardMouse = this.options.zoomTowardMouse;
    this.controls.panButton = this.options.panButton;

    if (this.options.disableNativeContextMenu === true) {
        this.controls.domElement.addEventListener( 'contextmenu', function ( event ) {
            // prevent the context menu, treat the right click as a regular mousedown event
            event.preventDefault();
        }, false );
    }

    this.controls.addEventListener( 'change', this.render );
    this.render();
};

MakeItZoom.prototype.render = function(){
    this.renderer.render(this.scene,this.camera);

    // Dispatch an event with the new center and scale:
    var renderEvent = {"type": 'mz_render'};
    renderEvent["mz_scale"] = this.controls.currentZoomScale;
    renderEvent["mz_center_x"] = this.controls.object.position.x;
    renderEvent["mz_center_y"] = this.controls.object.position.y;
    this.dispatchEvent(renderEvent);
};

MakeItZoom.prototype.addZoomable = function(element){
    this._addZoomable(element);
    this.render();
};

MakeItZoom.prototype.removeZoomable = function(element){
    var removeMe = null;

    for (var i = 0; i< this.scene.children.length; i++){
        if (this.scene.children[i].element === element) {
            removeMe = this.scene.children[i];
        }
    }

    if (removeMe !== null) {
        this.scene.remove(removeMe);
    } else {
        console.warn("The specified element could not be removed from the MakeItZoom workspace, because it couldn't be found.");
    }

    this.render();
};

MakeItZoom.prototype.getOffset = function(el){
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
};

MakeItZoom.prototype.getCurrentScale = function(){
    return this.controls.currentZoomScale;
};
MakeItZoom.prototype.getCenter = function(){
    return {
        "x": this.camera.position.x,
        "y": this.camera.position.y
    };
};

MakeItZoom.prototype.zoomTo = function(x,y,scale){
    var currX = this.controls.object.position.x,
        currY = this.controls.object.position.y,
        currScale = this.controls.currentZoomScale;

    if (typeof x !== "number") {x=currX;}
    if (typeof y !== "number") {y=currY;}
    if (typeof scale !== "number") {scale = currScale;}

    this.controls.panLeft(currX-x);
    this.controls.panUp(-y-currY);
    this.controls.setScale(scale);
    this.controls.update(true);
};

// These getters are NOT protected from Closure renaming, purposely.
// There are two versions of MakeItZoom:
// 1) Fully Minified, no threejs dependency, no shared objects. These variables will be renamed, as will all their properties. So there's no use getting them.
// 2) Simply Minified, depends on threejs, shares objects such as camera, scene, and renderer. Could be useful to have access from outside, so that a webgl scene could be overlaid / aligned with the CSS scene
MakeItZoom.prototype.getScene = function(){return this.scene;};
MakeItZoom.prototype.getCamera = function(){return this.camera;};
MakeItZoom.prototype.getRenderer = function(){return this.renderer;};

THREE.EventDispatcher.prototype.apply( MakeItZoom.prototype );

// Prevent Closure from removing MakeItZoom's public API:
window["MakeItZoom"] = MakeItZoom;
MakeItZoom.prototype["addZoomable"] = MakeItZoom.prototype.addZoomable;
MakeItZoom.prototype["removeZoomable"] = MakeItZoom.prototype.removeZoomable;
MakeItZoom.prototype["zoomTo"] = MakeItZoom.prototype.zoomTo;
MakeItZoom.prototype["getCurrentScale"] = MakeItZoom.prototype.getCurrentScale;
MakeItZoom.prototype["getCenter"] = MakeItZoom.prototype.getCenter;
MakeItZoom.prototype["getOffset"] = MakeItZoom.prototype.getOffset;
MakeItZoom.prototype["getContainer"] = MakeItZoom.prototype.getContainer;
MakeItZoom.prototype["setEnableUserInteractions"] = MakeItZoom.prototype.setEnableUserInteractions;

// TODO: getCurrentCenter, getCurrentBounds

