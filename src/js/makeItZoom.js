function makeItZoom(){
    var options = arguments[0] || {};
    this.init(options);
}

makeItZoom.prototype.init = function(options){
    options.containerId = options.containerId || "makeItZoom";
    options.maxZoomScale = options.maxZoomScale || 1.0;
    options.minZoomScale = options.minZoomScale || 0.1;
    options.zoomSpeed = options.zoomSpeed || 2.0;
    options.zoomTowardMouse = options.zoomTowardMouse !== false; // Zoom centers around mouse cursor by default, (0,0) if false
    options.panButton = typeof options.panButton != "undefined" ? options.panButton : 2; // right button pan by default. Set to null to disable panning
    options.disableNativeContextMenu = typeof options.disableNativeContextMenu === "boolean" ? options.disableNativeContextMenu : true; // really only useful when panButton = 0
    this.options = options;

    this.container = document.getElementById(options.containerId);

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 1, 1000000 );
    this.camera.position.z = 1200;
    this.scene = new THREE.Scene();

    // CSS scene handles standard DOM elements and styling, such as <input> fields, drop-downs, etc.
    this.renderer = new THREE.CSS3DRenderer();
    this.renderer.setSize( this.width, this.height );
    document.body.appendChild( this.renderer.domElement );
    this.renderer.domElement.className = "makeitzoom_container";

    this.render = this.render.bind(this);

    this.attachControls();

    this.importDOM.call(this,this.container);

    this.render();
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
        that.addZoomable.call(that,child,child.mzOffset);
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
    }

    this.controls.addEventListener( 'change', this.render );
    this.render();
};

makeItZoom.prototype.render = function(){
    this.renderer.render(this.scene,this.camera);

    // Dispatch an event with the new center and scale:
    var renderEvent = new CustomEvent('mz_render');
    renderEvent["mz_center_x"] = this.controls.object.position.x;
    renderEvent["mz_center_y"] = this.controls.object.position.y;
    renderEvent["mz_scale"] = this.controls.currentZoomScale;
    this.container.dispatchEvent(renderEvent);
};

makeItZoom.prototype.addZoomable = function(element, offset){

    var cssObject = new THREE.CSS3DObject( element );
    cssObject.position.x = offset.left;
    cssObject.position.y =  offset.top;
    cssObject.position.z = 0;

    this.scene.add(cssObject);
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
    // TODO: specify the pan and zooms. Just adjust the xy position of both the "center" and the "object" inside the controls
    // Then, specify scale, too.
    this.render();
};